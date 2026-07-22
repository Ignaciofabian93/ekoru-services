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
import {
  ServiceCategoryUpsertRowInput,
  ServiceCategoryTranslationUpsertRowInput,
  ServiceSubCategoryUpsertRowInput,
  ServiceSubCategoryTranslationUpsertRowInput,
} from './dto/index.js';

type BulkOutcome = { outcome: 'created' | 'updated'; id: number };

type BulkResult = {
  created: number;
  updated: number;
  failed: number;
  createdIds: number[];
  errors: { index: number; id?: number | null; message: string }[];
};

/**
 * Admin Service Catalog Service — raw reads and write operations over the
 * service category tables (service categories, service sub categories and their
 * translations) for the platform admin panel.
 *
 * Reads return rows exactly as stored (all translations, inactive included).
 * Writes are bulk upserts designed for XLSX imports; a single-row array is the
 * row-by-row edit path of the admin panel. Rows are processed independently so
 * one bad spreadsheet line never aborts the whole import.
 */
@Injectable()
export class AdminCatalogService {
  private readonly logger = new Logger(AdminCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Raw reads ──────────────────────────────────────────────────────────────

  async getRawServiceCategories({
    adminId,
    id,
    page,
    pageSize,
    search,
  }: {
    adminId?: string;
    id?: number;
    page: number;
    pageSize: number;
    search?: string;
  }) {
    this.requireAdmin(adminId);
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.ServiceCategoryWhereInput = {
      ...(id != null && { id }),
      ...(search?.trim() && {
        translations: {
          some: { category: { contains: search.trim(), mode: 'insensitive' } },
        },
      }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.serviceCategory.count({ where }),
      this.prisma.serviceCategory.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
        include: { translations: { orderBy: { language: 'asc' } } },
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  async getRawServiceSubCategories({
    adminId,
    id,
    page,
    pageSize,
    search,
    serviceCategoryId,
  }: {
    adminId?: string;
    id?: number;
    page: number;
    pageSize: number;
    search?: string;
    serviceCategoryId?: number;
  }) {
    this.requireAdmin(adminId);
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.ServiceSubCategoryWhereInput = {
      ...(id != null && { id }),
      ...(serviceCategoryId != null && { serviceCategoryId }),
      ...(search?.trim() && {
        translations: {
          some: {
            subCategory: { contains: search.trim(), mode: 'insensitive' },
          },
        },
      }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.serviceSubCategory.count({ where }),
      this.prisma.serviceSubCategory.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
        include: { translations: { orderBy: { language: 'asc' } } },
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  // ─── Bulk upserts: service categories ─────────────────────────────────────────

  async bulkUpsertServiceCategories({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServiceCategoryUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        featuredFrom: row.featuredFrom,
        featuredUntil: row.featuredUntil,
      });

      if (row.id != null) {
        await this.prisma.serviceCategory.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const created = await this.prisma.serviceCategory.create({ data });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertServiceCategoryTranslations({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServiceCategoryTranslationUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        serviceCategoryId: row.serviceCategoryId,
        language: row.language,
        category: row.category,
        slug: row.slug,
        href: row.href,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        metaKeywords: row.metaKeywords,
      });

      if (row.id != null) {
        await this.prisma.serviceCategoryTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const { serviceCategoryId, language } = row;
      if (serviceCategoryId == null || !language) {
        throw new BadRequestError(
          'serviceCategoryId and language are required when no id is provided',
        );
      }

      const existing = await this.prisma.serviceCategoryTranslation.findUnique({
        where: { serviceCategoryId_language: { serviceCategoryId, language } },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.serviceCategoryTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }

      this.requireFields(row, ['category', 'slug']);
      const created = await this.prisma.serviceCategoryTranslation.create({
        data: {
          serviceCategoryId,
          language,
          category: row.category!,
          slug: row.slug!,
          href: row.href,
          metaTitle: row.metaTitle,
          metaDescription: row.metaDescription,
          metaKeywords: row.metaKeywords ?? [],
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  // ─── Bulk upserts: service sub categories ──────────────────────────────────────

  async bulkUpsertServiceSubCategories({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServiceSubCategoryUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        serviceCategoryId: row.serviceCategoryId,
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        featuredFrom: row.featuredFrom,
        featuredUntil: row.featuredUntil,
      });

      if (row.id != null) {
        await this.prisma.serviceSubCategory.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      if (row.serviceCategoryId == null) {
        throw new BadRequestError(
          'serviceCategoryId is required when no id is provided',
        );
      }

      const created = await this.prisma.serviceSubCategory.create({
        data: { ...data, serviceCategoryId: row.serviceCategoryId },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertServiceSubCategoryTranslations({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: ServiceSubCategoryTranslationUpsertRowInput[];
  }): Promise<BulkResult> {
    this.requireAdmin(adminId);

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        serviceSubCategoryId: row.serviceSubCategoryId,
        language: row.language,
        subCategory: row.subCategory,
        slug: row.slug,
        href: row.href,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        metaKeywords: row.metaKeywords,
      });

      if (row.id != null) {
        await this.prisma.serviceSubCategoryTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const { serviceSubCategoryId, language } = row;
      if (serviceSubCategoryId == null || !language) {
        throw new BadRequestError(
          'serviceSubCategoryId and language are required when no id is provided',
        );
      }

      const existing =
        await this.prisma.serviceSubCategoryTranslation.findUnique({
          where: {
            serviceSubCategoryId_language: { serviceSubCategoryId, language },
          },
          select: { id: true },
        });

      if (existing) {
        await this.prisma.serviceSubCategoryTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }

      this.requireFields(row, ['subCategory', 'slug']);
      const created = await this.prisma.serviceSubCategoryTranslation.create({
        data: {
          serviceSubCategoryId,
          language,
          subCategory: row.subCategory!,
          slug: row.slug!,
          href: row.href,
          metaTitle: row.metaTitle,
          metaDescription: row.metaDescription,
          metaKeywords: row.metaKeywords ?? [],
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  // ─── Deletes ────────────────────────────────────────────────────────────────

  async deleteServiceCategory({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    this.requireAdmin(adminId);
    try {
      // Translations cascade; sub categories restrict.
      await this.prisma.serviceCategory.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteServiceCategoryTranslation({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    this.requireAdmin(adminId);
    try {
      await this.prisma.serviceCategoryTranslation.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteServiceSubCategory({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    this.requireAdmin(adminId);
    try {
      // Translations cascade; services restrict.
      await this.prisma.serviceSubCategory.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteServiceSubCategoryTranslation({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    this.requireAdmin(adminId);
    try {
      await this.prisma.serviceSubCategoryTranslation.delete({ where: { id } });
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

  /** Throws when any of the listed fields is missing on a create row. */
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

  /**
   * Keeps only the keys that were actually provided so an update never
   * overwrites columns the row didn't mention. Explicit null passes through
   * to clear nullable columns.
   */
  private pickDefined<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as T;
  }

  /**
   * Runs the handler per row, tallying outcomes. A row failure is recorded
   * with its 0-based index (and id when present) instead of aborting the batch.
   */
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
        `Bulk upsert finished with ${result.failed} failed row(s): ` +
          result.errors
            .map(
              (e) => `#${e.index}${e.id ? ` (id ${e.id})` : ''}: ${e.message}`,
            )
            .join(' | '),
      );
    }

    return result;
  }

  /** Translates Prisma error codes into messages an admin can act on. */
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
