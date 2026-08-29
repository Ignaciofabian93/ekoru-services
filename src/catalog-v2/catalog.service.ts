import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ServiceCatalog } from '../types/catalog.js';

@Injectable()
export class ServiceCatalogService {
  private readonly logger = new Logger(ServiceCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mirrors the store and community catalog readers: an empty catalog is a
   * valid result (`[]`), and a genuine failure is logged and rethrown as-is
   * rather than collapsed into an opaque INTERNAL_SERVER_ERROR.
   */
  async getServiceCatalog(
    language: Language = Language.ES,
  ): Promise<ServiceCatalog> {
    try {
      const serviceCategories = await this.prisma.serviceCategory.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        include: {
          translations: {
            where: { language: language },
            select: {
              id: true,
              category: true,
              slug: true,
              href: true,
            },
          },
          subcategories: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              translations: {
                where: { language: language },
                select: {
                  id: true,
                  subCategory: true,
                  slug: true,
                  href: true,
                },
              },
            },
          },
        },
      });

      return serviceCategories.map((cat) => ({
        id: cat.id,
        name: cat.translations[0]?.category || '',
        slug: cat.translations[0]?.slug || '',
        href: cat.translations[0]?.href || '',
        subCategoryItems: cat.subcategories.map((sub) => ({
          id: sub.id,
          name: sub.translations[0]?.subCategory || '',
          slug: sub.translations[0]?.slug || '',
          href: sub.translations[0]?.href || '',
        })),
      }));
    } catch (error) {
      this.logger.error(
        `Error getting service catalog: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
