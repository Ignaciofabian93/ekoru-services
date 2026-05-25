import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotFoundError,
  InternalServerError,
} from '../common/exceptions/index.js';
import type { ServiceCatalog } from '../types/catalog.js';

@Injectable()
export class ServiceCatalogService {
  private readonly logger = new Logger(ServiceCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getServiceCatalog(
    language: Language = Language.ES,
  ): Promise<ServiceCatalog> {
    try {
      const serviceCategories = await this.prisma.serviceCategory.findMany({
        where: { isActive: true },
        select: {
          id: true,
          translations: {
            where: { language },
            select: { category: true, slug: true, href: true },
            take: 1,
          },
          subcategories: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              translations: {
                where: { language },
                select: { subCategory: true, slug: true, href: true },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

      if (!serviceCategories.length) {
        throw new NotFoundError('No se encontraron categorías de servicios');
      }

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
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Error al obtener el catálogo de servicios:', error);
      throw new InternalServerError(
        'Error al obtener el catálogo de servicios',
      );
    }
  }
}
