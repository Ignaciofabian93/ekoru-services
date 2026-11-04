import { Injectable, Logger } from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { businessAdminSellerId } from '../common/admin-access.js';
import { BadRequestError } from '../common/exceptions/index.js';
import { ServicePricing } from '../graphql/enums/index.js';
import { ServicesService } from '../services/services.service.js';
import type { BusinessServiceRowInput } from './dto/index.js';

/** One request carries at most this many rows; the panel sends them in chunks. */
export const MAX_ROWS_PER_CALL = 200;

/** Where EKORU's photos live; next/image on the web renders nothing else. */
const IMAGE_HOSTS = ['images.ekoru.cl', 'staging-images.ekoru.cl'];

/** Photos per service, as on the web and the panel's Catálogo y fotos. */
export const MAX_IMAGES = 3;

const REQUIRED_ON_CREATE = ['name', 'subcategoryId', 'pricingType'] as const;

type Messages = {
  tooManyRows: string;
  missing: string;
  notYours: string;
  subcategory: string;
  price: string;
  imageHost: string;
  tooManyImages: string;
};

const MESSAGES: Partial<Record<Language, Messages>> = {
  [Language.ES]: {
    tooManyRows: 'Sube como máximo {{max}} servicios por vez',
    missing: 'Faltan datos obligatorios: {{fields}}',
    notYours: 'El servicio {{id}} no existe entre los tuyos',
    subcategory: 'La subcategoría {{id}} no existe',
    price:
      'Indica un precio mayor que 0, salvo en los servicios por cotización',
    imageHost:
      'Las fotos deben estar subidas a EKORU ({{hosts}}). Deja la columna vacía y agrégalas después en Catálogo y fotos',
    tooManyImages: 'Cada servicio lleva como máximo {{max}} fotos',
  },
  [Language.EN]: {
    tooManyRows: 'Upload at most {{max}} services at a time',
    missing: 'Required data missing: {{fields}}',
    notYours: 'Service {{id}} is not one of yours',
    subcategory: 'Subcategory {{id}} does not exist',
    price: 'Set a price above 0, except for quoted services',
    imageHost:
      'Photos must be uploaded to EKORU ({{hosts}}). Leave the column empty and add them later in Catalog and photos',
    tooManyImages: 'Each service takes at most {{max}} photos',
  },
  [Language.FR]: {
    tooManyRows: 'Importez au maximum {{max}} services à la fois',
    missing: 'Données obligatoires manquantes : {{fields}}',
    notYours: "Le service {{id}} n'est pas l'un des vôtres",
    subcategory: "La sous-catégorie {{id}} n'existe pas",
    price: 'Indiquez un prix supérieur à 0, sauf pour les services sur devis',
    imageHost:
      'Les photos doivent être hébergées sur EKORU ({{hosts}}). Laissez la colonne vide et ajoutez-les ensuite dans Catalogue et photos',
    tooManyImages: 'Chaque service accepte au maximum {{max}} photos',
  },
};

function message(
  language: Language | undefined,
  key: keyof Messages,
  params: Record<string, string> = {},
): string {
  const text = (MESSAGES[language ?? Language.ES] ?? MESSAGES[Language.ES]!)[
    key
  ];
  return Object.entries(params).reduce(
    (out, [k, v]) => out.replaceAll(`{{${k}}}`, v),
    text,
  );
}

export type BulkResult = {
  created: number;
  updated: number;
  failed: number;
  createdIds: number[];
  errors: { index: number; id?: number | null; message: string }[];
};

function rowError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2003'
      ? 'Invalid relation: the referenced id does not exist'
      : `Database error ${error.code}`;
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * A business publishing its services from a spreadsheet in the panel (ADM-16),
 * with the web's rules, row by row: only an approved SERVICES or MIXED
 * business publishes; a service needs a name, a subcategory and a pricing
 * type, and a price unless it is quoted; a row with an id updates that
 * service only if it is the caller's. Photos are optional, as on the web.
 * One bad line never stops the others.
 */
@Injectable()
export class BusinessServicesService {
  private readonly logger = new Logger(BusinessServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly services: ServicesService,
  ) {}

  async publishMyServices({
    adminId,
    rows,
    language,
  }: {
    adminId?: string;
    rows: BusinessServiceRowInput[];
    language?: Language;
  }): Promise<BulkResult> {
    const sellerId = await businessAdminSellerId(
      this.prisma,
      adminId,
      'MANAGE_BUSINESS_PRODUCTS',
    );
    if (rows.length > MAX_ROWS_PER_CALL) {
      throw new BadRequestError(
        message(language, 'tooManyRows', { max: String(MAX_ROWS_PER_CALL) }),
      );
    }
    await this.services.assertCanPublish(sellerId);

    const named = [
      ...new Set(rows.map((r) => r.subcategoryId).filter((id) => id != null)),
    ] as number[];
    const known = new Set(
      (
        await this.prisma.serviceSubCategory.findMany({
          where: { id: { in: named } },
          select: { id: true },
        })
      ).map((s) => s.id),
    );

    const result: BulkResult = {
      created: 0,
      updated: 0,
      failed: 0,
      createdIds: [],
      errors: [],
    };
    for (const [index, row] of rows.entries()) {
      try {
        const id = await this.writeRow(row, { sellerId, known, language });
        if (row.id != null) {
          result.updated += 1;
        } else {
          result.created += 1;
          result.createdIds.push(id);
        }
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          index,
          id: row.id ?? null,
          message: rowError(error),
        });
      }
    }
    if (result.failed > 0) {
      this.logger.warn(
        `Services import for ${sellerId}: ${result.failed} failed row(s)`,
      );
    }
    return result;
  }

  private async writeRow(
    row: BusinessServiceRowInput,
    {
      sellerId,
      known,
      language,
    }: { sellerId: string; known: Set<number>; language?: Language },
  ): Promise<number> {
    if (row.subcategoryId != null && !known.has(row.subcategoryId)) {
      throw new BadRequestError(
        message(language, 'subcategory', { id: String(row.subcategoryId) }),
      );
    }
    if (row.images) this.assertEkoruImages(row.images, sellerId, language);

    // Named one by one: the seller and the metrics never come from a row.
    const fields = Object.fromEntries(
      Object.entries({
        name: row.name,
        description: row.description,
        subcategoryId: row.subcategoryId,
        pricingType: row.pricingType,
        basePrice: row.basePrice,
        priceRange: row.priceRange,
        duration: row.duration,
        images: row.images,
        tags: row.tags,
        isActive: row.isActive,
        isRemoteService: row.isRemoteService,
        serviceRadius: row.serviceRadius,
      }).filter(([, v]) => v !== undefined),
    ) as Partial<BusinessServiceRowInput>;

    if (row.id != null) {
      const existing = await this.prisma.service.findUnique({
        where: { id: row.id },
        select: { sellerId: true, pricingType: true, basePrice: true },
      });
      if (!existing || existing.sellerId !== sellerId) {
        throw new BadRequestError(
          message(language, 'notYours', { id: String(row.id) }),
        );
      }
      this.assertPrice({ ...existing, ...fields }, language);
      await this.prisma.service.update({
        where: { id: row.id },
        data: { ...fields, updatedAt: new Date() },
      });
      return row.id;
    }

    const missing = REQUIRED_ON_CREATE.filter(
      (f) => row[f] == null || row[f] === '',
    );
    if (missing.length) {
      throw new BadRequestError(
        message(language, 'missing', { fields: missing.join(', ') }),
      );
    }
    this.assertPrice(row, language);
    const created = await this.prisma.service.create({
      data: {
        ...fields,
        name: row.name!,
        subcategoryId: row.subcategoryId!,
        pricingType: row.pricingType!,
        images: row.images ?? [],
        tags: row.tags ?? [],
        sellerId,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return created.id;
  }

  /** A price above 0, unless the service is quoted (the web's rule). */
  private assertPrice(
    s: { pricingType?: string | null; basePrice?: number | null },
    language?: Language,
  ) {
    if (s.pricingType === ServicePricing.QUOTATION) return;
    if (!s.basePrice || s.basePrice <= 0) {
      throw new BadRequestError(message(language, 'price'));
    }
  }

  /** Photos must already be EKORU's, as for store products. */
  private assertEkoruImages(
    images: string[],
    sellerId: string,
    language?: Language,
  ) {
    if (images.length > MAX_IMAGES) {
      throw new BadRequestError(
        message(language, 'tooManyImages', { max: String(MAX_IMAGES) }),
      );
    }
    const ours = (image: string) => {
      if (image.startsWith(`product/${sellerId}/`)) return true;
      try {
        const url = new URL(image);
        return url.protocol === 'https:' && IMAGE_HOSTS.includes(url.hostname);
      } catch {
        return false;
      }
    };
    if (!images.every(ours)) {
      throw new BadRequestError(
        message(language, 'imageHost', { hosts: IMAGE_HOSTS[0] }),
      );
    }
  }
}
