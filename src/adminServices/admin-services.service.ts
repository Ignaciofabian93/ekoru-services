import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  UnauthorizedError,
  BadRequestError,
} from '../common/exceptions/index.js';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils/index.js';
import type {
  ServiceUpsertRowInput,
  ServiceMediaUpsertRowInput,
  ServiceFaqUpsertRowInput,
  ServicePackageUpsertRowInput,
  ServicePackageItemUpsertRowInput,
  ServiceCredentialsUpsertRowInput,
} from './dto/index.js';

type BulkOutcome = { outcome: 'created' | 'updated'; id: number };

type BulkResult = {
  created: number;
  updated: number;
  failed: number;
  createdIds: number[];
  errors: { index: number; id?: number | null; message: string }[];
};

const withSubRows = {
  serviceMedia: { orderBy: { displayOrder: 'asc' } as const },
  serviceFAQ: { orderBy: { displayOrder: 'asc' } as const },
};

/**
 * Admin Services Service — raw reads and bulk writes over the Service table and
 * its ServiceMedia / ServiceFAQ sub-rows for the platform admin panel.
 *
 * Reads bypass the web `isActive` / seller-scoping filters so the admin sees the
 * whole catalog, each service carrying its media + FAQ. Writes are bulk upserts
 * shared by the XLSX import and the row-by-row edit forms; rows are processed
 * independently so one bad line never aborts the batch.
 */
@Injectable()
export class AdminServicesService {
  private readonly logger = new Logger(AdminServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Raw reads ────────────────────────────────────────────────────────────────

  async getRawServices({
    adminId,
    id,
    page,
    pageSize,
    search,
    subcategoryId,
    sellerId,
    isActive,
  }: {
    adminId?: string;
    id?: number;
    page: number;
    pageSize: number;
    search?: string;
    subcategoryId?: number;
    sellerId?: string;
    isActive?: boolean;
  }) {
    this.requireAdmin(adminId);
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.ServiceWhereInput = {
      ...(id != null && { id }),
      ...(subcategoryId != null && { subcategoryId }),
      ...(sellerId && { sellerId }),
      ...(isActive != null && { isActive }),
      ...(search?.trim() && {
        name: { contains: search.trim(), mode: 'insensitive' },
      }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        include: withSubRows,
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  // ─── Services ─────────────────────────────────────────────────────────────────

  async bulkUpsertServices({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServiceUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        name: row.name,
        description: row.description,
        sellerId: row.sellerId,
        pricingType: row.pricingType,
        basePrice: row.basePrice,
        priceRange: row.priceRange,
        duration: row.duration,
        isActive: row.isActive,
        images: row.images,
        tags: row.tags,
        subcategoryId: row.subcategoryId,
        maxConcurrentBookings: row.maxConcurrentBookings,
        advanceBookingDays: row.advanceBookingDays,
        serviceRadius: row.serviceRadius,
        isRemoteService: row.isRemoteService,
        isCurrentlyAvailable: row.isCurrentlyAvailable,
      });

      if (row.id != null) {
        await this.prisma.service.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }

      this.requireFields(row, ['name', 'sellerId', 'subcategoryId']);
      const created = await this.prisma.service.create({
        data: {
          ...data,
          name: row.name!,
          sellerId: row.sellerId!,
          subcategoryId: row.subcategoryId!,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async deleteService({ adminId, id }: { adminId?: string; id: number }) {
    this.requireAdmin(adminId);
    try {
      await this.prisma.service.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  // ─── Service media ──────────────────────────────────────────────────────────

  async bulkUpsertServiceMedia({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServiceMediaUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        serviceId: row.serviceId,
        mediaType: row.mediaType,
        url: row.url,
        title: row.title,
        description: row.description,
        displayOrder: row.displayOrder,
        isPortfolio: row.isPortfolio,
        isCertificate: row.isCertificate,
      });

      if (row.id != null) {
        await this.prisma.serviceMedia.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }

      this.requireFields(row, ['serviceId', 'mediaType', 'url']);
      const created = await this.prisma.serviceMedia.create({
        data: {
          ...data,
          serviceId: row.serviceId!,
          mediaType: row.mediaType!,
          url: row.url!,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async deleteServiceMedia({ adminId, id }: { adminId?: string; id: number }) {
    this.requireAdmin(adminId);
    try {
      await this.prisma.serviceMedia.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  // ─── Service FAQ ──────────────────────────────────────────────────────────────

  async bulkUpsertServiceFaqs({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServiceFaqUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        serviceId: row.serviceId,
        subcategoryId: row.subcategoryId,
        question: row.question,
        answer: row.answer,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      });

      if (row.id != null) {
        await this.prisma.serviceFAQ.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }

      this.requireFields(row, ['question', 'answer']);
      const created = await this.prisma.serviceFAQ.create({
        data: {
          ...data,
          question: row.question!,
          answer: row.answer!,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async deleteServiceFaq({ adminId, id }: { adminId?: string; id: number }) {
    this.requireAdmin(adminId);
    try {
      await this.prisma.serviceFAQ.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  // ─── Service packages ─────────────────────────────────────────────────────────

  async getRawServicePackages({
    adminId,
    id,
    page,
    pageSize,
    search,
    sellerId,
    isActive,
  }: {
    adminId?: string;
    id?: number;
    page: number;
    pageSize: number;
    search?: string;
    sellerId?: string;
    isActive?: boolean;
  }) {
    this.requireAdmin(adminId);
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.ServicePackageWhereInput = {
      ...(id != null && { id }),
      ...(sellerId && { sellerId }),
      ...(isActive != null && { isActive }),
      ...(search?.trim() && {
        name: { contains: search.trim(), mode: 'insensitive' },
      }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.servicePackage.count({ where }),
      this.prisma.servicePackage.findMany({
        where,
        include: { servicePackageItem: { orderBy: { id: 'asc' } } },
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  async bulkUpsertServicePackages({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServicePackageUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        sellerId: row.sellerId,
        name: row.name,
        description: row.description,
        totalPrice: row.totalPrice,
        discountPercentage: row.discountPercentage,
        validityDays: row.validityDays,
        isActive: row.isActive,
      });

      if (row.id != null) {
        await this.prisma.servicePackage.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      this.requireFields(row, [
        'sellerId',
        'name',
        'description',
        'totalPrice',
      ]);
      const created = await this.prisma.servicePackage.create({
        data: {
          ...data,
          sellerId: row.sellerId!,
          name: row.name!,
          description: row.description!,
          totalPrice: row.totalPrice!,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async deleteServicePackage({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    this.requireAdmin(adminId);
    try {
      await this.prisma.servicePackage.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async bulkUpsertServicePackageItems({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServicePackageItemUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        packageId: row.packageId,
        serviceId: row.serviceId,
        quantity: row.quantity,
      });

      if (row.id != null) {
        await this.prisma.servicePackageItem.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      // No id: (packageId, serviceId) is unique — match on it to update in place.
      if (row.packageId != null && row.serviceId != null) {
        const existing = await this.prisma.servicePackageItem.findUnique({
          where: {
            packageId_serviceId: {
              packageId: row.packageId,
              serviceId: row.serviceId,
            },
          },
          select: { id: true },
        });
        if (existing) {
          await this.prisma.servicePackageItem.update({
            where: { id: existing.id },
            data,
          });
          return { outcome: 'updated', id: existing.id };
        }
      }

      this.requireFields(row, ['packageId', 'serviceId']);
      const created = await this.prisma.servicePackageItem.create({
        data: {
          packageId: row.packageId!,
          serviceId: row.serviceId!,
          quantity: row.quantity ?? undefined,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async deleteServicePackageItem({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    this.requireAdmin(adminId);
    try {
      await this.prisma.servicePackageItem.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  // ─── Service provider credentials ─────────────────────────────────────────────

  async getRawServiceCredentials({
    adminId,
    id,
    page,
    pageSize,
    search,
    isLicenseVerified,
  }: {
    adminId?: string;
    id?: number;
    page: number;
    pageSize: number;
    search?: string;
    isLicenseVerified?: boolean;
  }) {
    this.requireAdmin(adminId);
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const term = search?.trim();
    const where: Prisma.ServiceProviderCredentialsWhereInput = {
      ...(id != null && { id }),
      ...(isLicenseVerified != null && { isLicenseVerified }),
      ...(term && {
        OR: [
          { sellerId: { contains: term, mode: 'insensitive' } },
          { licenseNumber: { contains: term, mode: 'insensitive' } },
        ],
      }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.serviceProviderCredentials.count({ where }),
      this.prisma.serviceProviderCredentials.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  async bulkUpsertServiceCredentials({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServiceCredentialsUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        sellerId: row.sellerId,
        licenseNumber: row.licenseNumber,
        licenseType: row.licenseType,
        licenseExpiryDate: row.licenseExpiryDate,
        isLicenseVerified: row.isLicenseVerified,
        insuranceProvider: row.insuranceProvider,
        insurancePolicyNumber: row.insurancePolicyNumber,
        insuranceExpiryDate: row.insuranceExpiryDate,
        insuranceCoverage: row.insuranceCoverage,
        backgroundCheckDate: row.backgroundCheckDate,
        backgroundCheckStatus: row.backgroundCheckStatus,
      });

      if (row.id != null) {
        await this.prisma.serviceProviderCredentials.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      // No id: sellerId is unique — match on it to update in place.
      if (row.sellerId) {
        const existing =
          await this.prisma.serviceProviderCredentials.findUnique({
            where: { sellerId: row.sellerId },
            select: { id: true },
          });
        if (existing) {
          await this.prisma.serviceProviderCredentials.update({
            where: { id: existing.id },
            data,
          });
          return { outcome: 'updated', id: existing.id };
        }
      }

      this.requireFields(row, ['sellerId']);
      const created = await this.prisma.serviceProviderCredentials.create({
        data: { ...data, sellerId: row.sellerId! },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async deleteServiceCredentials({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    this.requireAdmin(adminId);
    try {
      await this.prisma.serviceProviderCredentials.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private requireAdmin(adminId?: string): void {
    if (!adminId) {
      throw new UnauthorizedError('Admin authentication required');
    }
  }

  private requireFields<T extends object>(row: T, fields: (keyof T)[]): void {
    const missing = fields.filter(
      (f) => row[f] == null || row[f] === '',
    ) as string[];
    if (missing.length > 0) {
      throw new BadRequestError(
        `Missing required field(s) for create: ${missing.join(', ')}`,
      );
    }
  }

  private pickDefined<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as T;
  }

  private async processRows<T extends { id?: number | null }>(
    rows: T[],
    handler: (row: T) => Promise<BulkOutcome>,
  ): Promise<BulkResult> {
    const result: BulkResult = {
      created: 0,
      updated: 0,
      failed: 0,
      createdIds: [],
      errors: [],
    };

    for (const [index, row] of rows.entries()) {
      try {
        const { outcome, id } = await handler(row);
        result[outcome] += 1;
        if (outcome === 'created') result.createdIds.push(id);
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          index,
          id: row.id ?? null,
          message: this.errorMessage(error),
        });
      }
    }

    if (result.failed > 0) {
      this.logger.warn(
        `Bulk upsert finished with ${result.failed} failed row(s)`,
      );
    }

    return result;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const target = Array.isArray(error.meta?.target)
        ? ` (${(error.meta.target as string[]).join(', ')})`
        : '';
      switch (error.code) {
        case 'P2002':
          return `Duplicate value violates a unique constraint${target}`;
        case 'P2003':
          return 'Invalid relation: the referenced id does not exist, or dependent rows still reference this one';
        case 'P2025':
          return 'Row not found';
        default:
          return `Database error ${error.code}`;
      }
    }
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  }

  private friendlyError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return new BadRequestError(this.errorMessage(error));
    }
    return error instanceof Error ? error : new Error('Unknown error');
  }
}
