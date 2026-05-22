import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotFoundError,
  InternalServerError,
} from '../common/exceptions/index.js';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils/index.js';
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

  async getServiceCategories() {
    try {
      const serviceCategories = await this.prisma.serviceCategory.findMany({
        select: {
          id: true,
          translations: {
            where: { language: Language.ES },
            select: { category: true, href: true },
            take: 1,
          },
          subcategories: {
            select: {
              id: true,
              serviceCategoryId: true,
              translations: {
                where: { language: Language.ES },
                select: { subCategory: true, href: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!serviceCategories.length) {
        throw new NotFoundError('No se encontraron categorías de servicios');
      }

      return serviceCategories.map((cat) => ({
        id: cat.id,
        category: cat.translations[0]?.category,
        href: cat.translations[0]?.href,
        subcategories: cat.subcategories.map((sub) => ({
          id: sub.id,
          serviceCategoryId: sub.serviceCategoryId,
          subCategory: sub.translations[0]?.subCategory,
          href: sub.translations[0]?.href,
        })),
      }));
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Error al obtener las categorías de servicios:', error);
      throw new InternalServerError(
        'Error al obtener las categorías de servicios',
      );
    }
  }

  async getServiceCategory(id: number) {
    try {
      const serviceCategory = await this.prisma.serviceCategory.findUnique({
        where: { id },
        select: {
          id: true,
          translations: {
            where: { language: Language.ES },
            select: { category: true, href: true },
            take: 1,
          },
          subcategories: {
            select: {
              id: true,
              serviceCategoryId: true,
              translations: {
                where: { language: Language.ES },
                select: { subCategory: true, href: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!serviceCategory) {
        throw new NotFoundError('Categoría de servicio no encontrada');
      }

      return {
        id: serviceCategory.id,
        category: serviceCategory.translations[0]?.category,
        href: serviceCategory.translations[0]?.href,
        subcategories: serviceCategory.subcategories.map((sub) => ({
          id: sub.id,
          serviceCategoryId: sub.serviceCategoryId,
          subCategory: sub.translations[0]?.subCategory,
          href: sub.translations[0]?.href,
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Error al obtener la categoría de servicio:', error);
      throw new InternalServerError(
        'Error al obtener la categoría de servicio',
      );
    }
  }

  async getServiceSubCategories(
    serviceCategoryId: number,
    page: number = 1,
    pageSize: number = 10,
  ) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const count = await this.prisma.serviceSubCategory.count({
        where: { serviceCategoryId },
      });

      const subcategories = await this.prisma.serviceSubCategory.findMany({
        where: { serviceCategoryId },
        skip,
        take,
        select: {
          id: true,
          serviceCategoryId: true,
          translations: {
            where: { language: Language.ES },
            select: { subCategory: true, href: true },
            take: 1,
          },
          _count: {
            select: {
              services: true,
            },
          },
        },
      });

      const mappedSubcategories = subcategories.map((sub) => ({
        id: sub.id,
        serviceCategoryId: sub.serviceCategoryId,
        subCategory: sub.translations[0]?.subCategory,
        href: sub.translations[0]?.href,
        serviceCount: sub._count.services,
      }));

      return createPaginatedResponse(
        mappedSubcategories,
        count,
        page,
        pageSize,
      );
    } catch (error) {
      this.logger.error(
        'Error al obtener las subcategorías de servicio:',
        error,
      );
      throw new InternalServerError(
        'Error al obtener las subcategorías de servicio',
      );
    }
  }

  async getServiceSubCategory(id: number) {
    try {
      const subcategory = await this.prisma.serviceSubCategory.findUnique({
        where: { id },
        select: {
          id: true,
          serviceCategoryId: true,
          translations: {
            where: { language: Language.ES },
            select: { subCategory: true, href: true },
            take: 1,
          },
          serviceCategory: {
            select: {
              id: true,
              translations: {
                where: { language: Language.ES },
                select: { category: true },
                take: 1,
              },
            },
          },
          _count: {
            select: {
              services: true,
            },
          },
        },
      });

      if (!subcategory) {
        throw new NotFoundError('Subcategoría de servicio no encontrada');
      }

      return {
        id: subcategory.id,
        serviceCategoryId: subcategory.serviceCategoryId,
        subCategory: subcategory.translations[0]?.subCategory,
        href: subcategory.translations[0]?.href,
        serviceCategory: {
          id: subcategory.serviceCategory.id,
          category: subcategory.serviceCategory.translations[0]?.category,
        },
        serviceCount: subcategory._count.services,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Error al obtener la subcategoría de servicio:', error);
      throw new InternalServerError(
        'Error al obtener la subcategoría de servicio',
      );
    }
  }
}
