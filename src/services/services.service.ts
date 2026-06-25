import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotFoundError,
  UnauthorizedError,
  InternalServerError,
} from '../common/exceptions/index.js';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils/index.js';
import { AddServiceInput, UpdateServiceInput } from './dto/index.js';
import { ServicePricing } from '../graphql/enums/index.js';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getService(id: number) {
    try {
      const service = await this.prisma.service.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          sellerId: true,
          subcategoryId: true,
          pricingType: true,
          basePrice: true,
          priceRange: true,
          duration: true,
          isActive: true,
          images: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          serviceCategory: {
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
            },
          },
          serviceReview: {
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,
              reviewerId: true,
            },
          },
        },
      });

      if (!service) {
        throw new NotFoundError('Servicio no encontrado');
      }

      const averageRating =
        service.serviceReview.length > 0
          ? service.serviceReview.reduce(
              (sum, review) => sum + review.rating,
              0,
            ) / service.serviceReview.length
          : 0;

      const { serviceCategory: rawSC, serviceReview, ...restService } = service;
      return {
        ...restService,
        serviceCategory: rawSC
          ? {
              id: rawSC.id,
              serviceCategoryId: rawSC.serviceCategoryId,
              subCategory: rawSC.translations[0]?.subCategory,
              href: rawSC.translations[0]?.href,
              serviceCategory: rawSC.serviceCategory
                ? {
                    id: rawSC.serviceCategory.id,
                    category: rawSC.serviceCategory.translations[0]?.category,
                  }
                : null,
            }
          : null,
        seller: { id: service.sellerId },
        averageRating,
        reviewCount: serviceReview.length,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Error al obtener el servicio:', error);
      throw new InternalServerError('Error al obtener el servicio');
    }
  }

  async getServices({
    page,
    pageSize,
    isActive,
  }: {
    page: number;
    pageSize: number;
    isActive?: boolean;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = isActive !== undefined ? { isActive } : {};
      const count = await this.prisma.service.count({ where });
      const services = await this.prisma.service.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          description: true,
          sellerId: true,
          subcategoryId: true,
          pricingType: true,
          basePrice: true,
          priceRange: true,
          duration: true,
          isActive: true,
          images: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              serviceReview: true,
            },
          },
        },
      });

      const mappedServices = services.map((service) => ({
        ...service,
        seller: { id: service.sellerId },
        reviewCount: service._count.serviceReview,
        averageRating: 0,
      }));

      return createPaginatedResponse(mappedServices, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener los servicios:', error);
      throw new InternalServerError('Error al obtener los servicios');
    }
  }

  async getServicesBySeller({
    sellerId,
    page,
    pageSize,
    isActive,
  }: {
    sellerId: string;
    page: number;
    pageSize: number;
    isActive?: boolean;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = {
        sellerId,
        ...(isActive !== undefined && { isActive }),
      };

      const count = await this.prisma.service.count({ where });
      const services = await this.prisma.service.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          description: true,
          sellerId: true,
          subcategoryId: true,
          pricingType: true,
          basePrice: true,
          priceRange: true,
          duration: true,
          isActive: true,
          images: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              serviceReview: true,
            },
          },
        },
      });

      const mappedServices = services.map((service) => ({
        ...service,
        seller: { id: service.sellerId },
        reviewCount: service._count.serviceReview,
        averageRating: 0,
      }));

      return createPaginatedResponse(mappedServices, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener los servicios del vendedor:', error);
      throw new InternalServerError(
        'Error al obtener los servicios del vendedor',
      );
    }
  }

  async getServicesBySubCategory({
    subcategoryId,
    page,
    pageSize,
    isActive,
  }: {
    subcategoryId: number;
    page: number;
    pageSize: number;
    isActive?: boolean;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = {
        subcategoryId,
        ...(isActive !== undefined && { isActive }),
      };

      const count = await this.prisma.service.count({ where });
      const services = await this.prisma.service.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          description: true,
          sellerId: true,
          subcategoryId: true,
          pricingType: true,
          basePrice: true,
          priceRange: true,
          duration: true,
          isActive: true,
          images: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              serviceReview: true,
            },
          },
        },
      });

      const mappedServices = services.map((service) => ({
        ...service,
        seller: { id: service.sellerId },
        reviewCount: service._count.serviceReview,
        averageRating: 0,
      }));

      return createPaginatedResponse(mappedServices, count, page, pageSize);
    } catch (error) {
      this.logger.error(
        'Error al obtener los servicios por subcategoría:',
        error,
      );
      throw new InternalServerError(
        'Error al obtener los servicios por subcategoría',
      );
    }
  }

  async getServicesByPricingType({
    pricingType,
    page,
    pageSize,
    isActive,
  }: {
    pricingType: ServicePricing;
    page: number;
    pageSize: number;
    isActive?: boolean;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = {
        pricingType,
        ...(isActive !== undefined && { isActive }),
      };

      const count = await this.prisma.service.count({ where });
      const services = await this.prisma.service.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          description: true,
          sellerId: true,
          subcategoryId: true,
          pricingType: true,
          basePrice: true,
          priceRange: true,
          duration: true,
          isActive: true,
          images: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              serviceReview: true,
            },
          },
        },
      });

      const mappedServices = services.map((service) => ({
        ...service,
        seller: { id: service.sellerId },
        reviewCount: service._count.serviceReview,
        averageRating: 0,
      }));

      return createPaginatedResponse(mappedServices, count, page, pageSize);
    } catch (error) {
      this.logger.error(
        'Error al obtener los servicios por tipo de precio:',
        error,
      );
      throw new InternalServerError(
        'Error al obtener los servicios por tipo de precio',
      );
    }
  }

  async addService(input: AddServiceInput) {
    try {
      const service = await this.prisma.service.create({
        data: {
          name: input.name,
          description: input.description,
          subcategoryId: input.subcategoryId,
          pricingType: input.pricingType,
          basePrice: input.basePrice,
          priceRange: input.priceRange,
          duration: input.duration,
          images: input.images,
          tags: input.tags || [],
          sellerId: input.sellerId,
          isActive: input.isActive ?? true,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          description: true,
          sellerId: true,
          subcategoryId: true,
          pricingType: true,
          basePrice: true,
          priceRange: true,
          duration: true,
          isActive: true,
          images: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          serviceCategory: {
            select: {
              id: true,
              serviceCategoryId: true,
              translations: {
                where: { language: Language.ES },
                select: { subCategory: true },
                take: 1,
              },
            },
          },
        },
      });

      return {
        ...service,
        serviceCategory: service.serviceCategory
          ? {
              id: service.serviceCategory.id,
              serviceCategoryId: service.serviceCategory.serviceCategoryId,
              subCategory: service.serviceCategory.translations[0]?.subCategory,
            }
          : null,
        seller: { id: service.sellerId },
        averageRating: 0,
        reviewCount: 0,
      };
    } catch (error) {
      this.logger.error('Error al crear el servicio:', error);
      throw new InternalServerError('Error al crear el servicio');
    }
  }

  async updateService(input: UpdateServiceInput) {
    try {
      const id = parseInt(input.id, 10);

      const service = await this.prisma.service.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description && { description: input.description }),
          ...(input.subcategoryId && { subcategoryId: input.subcategoryId }),
          ...(input.pricingType && { pricingType: input.pricingType }),
          ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
          ...(input.priceRange && { priceRange: input.priceRange }),
          ...(input.duration !== undefined && { duration: input.duration }),
          ...(input.images && { images: input.images }),
          ...(input.tags && { tags: input.tags }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          sellerId: true,
          subcategoryId: true,
          pricingType: true,
          basePrice: true,
          priceRange: true,
          duration: true,
          isActive: true,
          images: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          serviceCategory: {
            select: {
              id: true,
              serviceCategoryId: true,
              translations: {
                where: { language: Language.ES },
                select: { subCategory: true },
                take: 1,
              },
            },
          },
          _count: {
            select: {
              serviceReview: true,
            },
          },
        },
      });

      return {
        ...service,
        serviceCategory: service.serviceCategory
          ? {
              id: service.serviceCategory.id,
              serviceCategoryId: service.serviceCategory.serviceCategoryId,
              subCategory: service.serviceCategory.translations[0]?.subCategory,
            }
          : null,
        seller: { id: service.sellerId },
        averageRating: 0,
        reviewCount: service._count.serviceReview,
      };
    } catch (error) {
      this.logger.error('Error al actualizar el servicio:', error);
      throw new InternalServerError('Error al actualizar el servicio');
    }
  }

  async deleteService(id: number) {
    try {
      const service = await this.prisma.service.delete({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          sellerId: true,
          subcategoryId: true,
          pricingType: true,
          basePrice: true,
          priceRange: true,
          duration: true,
          isActive: true,
          images: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        ...service,
        seller: { id: service.sellerId },
        averageRating: 0,
        reviewCount: 0,
      };
    } catch (error) {
      this.logger.error('Error al eliminar el servicio:', error);
      throw new InternalServerError('Error al eliminar el servicio');
    }
  }

  async toggleServiceActive(id: number) {
    try {
      const currentService = await this.prisma.service.findUnique({
        where: { id },
        select: { isActive: true },
      });

      if (!currentService) {
        throw new NotFoundError('Servicio no encontrado');
      }

      const service = await this.prisma.service.update({
        where: { id },
        data: { isActive: !currentService.isActive },
        select: {
          id: true,
          name: true,
          description: true,
          sellerId: true,
          subcategoryId: true,
          pricingType: true,
          basePrice: true,
          priceRange: true,
          duration: true,
          isActive: true,
          images: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          serviceCategory: {
            select: {
              id: true,
              serviceCategoryId: true,
              translations: {
                where: { language: Language.ES },
                select: { subCategory: true },
                take: 1,
              },
            },
          },
          _count: {
            select: {
              serviceReview: true,
            },
          },
        },
      });

      return {
        ...service,
        serviceCategory: service.serviceCategory
          ? {
              id: service.serviceCategory.id,
              serviceCategoryId: service.serviceCategory.serviceCategoryId,
              subCategory: service.serviceCategory.translations[0]?.subCategory,
            }
          : null,
        seller: { id: service.sellerId },
        averageRating: 0,
        reviewCount: service._count.serviceReview,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Error al cambiar el estado del servicio:', error);
      throw new InternalServerError('Error al cambiar el estado del servicio');
    }
  }

  /**
   * Toggle the current seller's favorite mark on a service. Idempotent per
   * (service, seller). Returns the service so `isLiked` re-resolves.
   */
  async toggleServiceLike({
    serviceId,
    sellerId,
  }: {
    serviceId: number;
    sellerId?: string;
  }) {
    if (!sellerId) {
      throw new UnauthorizedError('No autorizado');
    }

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundError('Servicio no encontrado');
    }

    try {
      const existing = await this.prisma.serviceLike.findUnique({
        where: { serviceId_sellerId: { serviceId, sellerId } },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.serviceLike.delete({ where: { id: existing.id } });
      } else {
        await this.prisma.serviceLike.create({ data: { serviceId, sellerId } });
      }

      return service;
    } catch (error) {
      this.logger.error('Error al cambiar el favorito del servicio:', error);
      throw new InternalServerError('Error al actualizar favoritos');
    }
  }

  /**
   * Paginated list of the current seller's favorite services. Inactive services
   * are excluded so unavailable favorites drop off automatically.
   */
  async getMyFavorites({
    sellerId,
    page,
    pageSize,
  }: {
    sellerId?: string;
    page: number;
    pageSize: number;
  }) {
    if (!sellerId) {
      throw new UnauthorizedError('No autorizado');
    }

    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);
      const where = { sellerId, service: { isActive: true } };

      const [likes, count] = await Promise.all([
        this.prisma.serviceLike.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          include: { service: true },
        }),
        this.prisma.serviceLike.count({ where }),
      ]);

      const services = likes.map((like) => ({
        ...like.service,
        seller: { id: like.service.sellerId },
      }));
      return createPaginatedResponse(services, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener servicios favoritos:', error);
      throw new InternalServerError('Error al obtener servicios favoritos');
    }
  }
}
