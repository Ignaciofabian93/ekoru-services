import { Injectable, Logger } from '@nestjs/common';
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

/**
 * Scalar columns returned for a Service across every read/write method. Kept in
 * one place so a newly added column surfaces everywhere at once instead of
 * silently resolving to `null` because a `select` block was missed. Relation and
 * aggregate selections (`serviceReview`, `_count`) are added per-query.
 */
const serviceSelect = {
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
  availabilitySchedule: true,
  isCurrentlyAvailable: true,
  maxConcurrentBookings: true,
  advanceBookingDays: true,
  serviceRadius: true,
  serviceLocations: true,
  isRemoteService: true,
} as const;

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getService(id: number) {
    try {
      const service = await this.prisma.service.findUnique({
        where: { id },
        select: {
          ...serviceSelect,
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

      // `serviceCategory` and `seller` are populated by their field resolvers
      // (ServicesResolver.serviceCategory / the federated Seller reference).
      const { serviceReview, ...restService } = service;
      return {
        ...restService,
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
    excludeSellerId,
  }: {
    page: number;
    pageSize: number;
    isActive?: boolean;
    excludeSellerId?: string;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      // Hide the current user's own services from browsing; they remain visible
      // to the seller in their profile via getServicesBySeller.
      const where = {
        ...(isActive !== undefined && { isActive }),
        ...(excludeSellerId && { sellerId: { not: excludeSellerId } }),
      };
      const count = await this.prisma.service.count({ where });
      const services = await this.prisma.service.findMany({
        where,
        skip,
        take,
        select: {
          ...serviceSelect,
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
          ...serviceSelect,
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
    excludeSellerId,
  }: {
    subcategoryId: number;
    page: number;
    pageSize: number;
    isActive?: boolean;
    excludeSellerId?: string;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = {
        subcategoryId,
        ...(isActive !== undefined && { isActive }),
        ...(excludeSellerId && { sellerId: { not: excludeSellerId } }),
      };

      const count = await this.prisma.service.count({ where });
      const services = await this.prisma.service.findMany({
        where,
        skip,
        take,
        select: {
          ...serviceSelect,
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

  /**
   * Get services by Service Category ID.
   * Returns all services from all sub categories under this category.
   */
  async getServicesByCategory({
    categoryId,
    page,
    pageSize,
    isActive,
    excludeSellerId,
  }: {
    categoryId: number;
    page: number;
    pageSize: number;
    isActive?: boolean;
    excludeSellerId?: string;
  }) {
    try {
      // First, get all sub category IDs under this service category
      const subCategories = await this.prisma.serviceSubCategory.findMany({
        where: {
          serviceCategoryId: categoryId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      const subCategoryIds = subCategories.map((sub) => sub.id);

      if (subCategoryIds.length === 0) {
        return createPaginatedResponse([], 0, page, pageSize);
      }

      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = {
        subcategoryId: { in: subCategoryIds },
        ...(isActive !== undefined && { isActive }),
        ...(excludeSellerId && { sellerId: { not: excludeSellerId } }),
      };

      const count = await this.prisma.service.count({ where });
      const services = await this.prisma.service.findMany({
        where,
        skip,
        take,
        select: {
          ...serviceSelect,
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
      this.logger.error('Error al obtener los servicios por categoría:', error);
      throw new InternalServerError(
        'Error al obtener los servicios por categoría',
      );
    }
  }

  async getServicesByPricingType({
    pricingType,
    page,
    pageSize,
    isActive,
    excludeSellerId,
  }: {
    pricingType: ServicePricing;
    page: number;
    pageSize: number;
    isActive?: boolean;
    excludeSellerId?: string;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = {
        pricingType,
        ...(isActive !== undefined && { isActive }),
        ...(excludeSellerId && { sellerId: { not: excludeSellerId } }),
      };

      const count = await this.prisma.service.count({ where });
      const services = await this.prisma.service.findMany({
        where,
        skip,
        take,
        select: {
          ...serviceSelect,
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
          availabilitySchedule: input.availabilitySchedule,
          isCurrentlyAvailable: input.isCurrentlyAvailable,
          maxConcurrentBookings: input.maxConcurrentBookings,
          advanceBookingDays: input.advanceBookingDays,
          serviceRadius: input.serviceRadius,
          serviceLocations: input.serviceLocations,
          isRemoteService: input.isRemoteService,
          updatedAt: new Date(),
        },
        select: {
          ...serviceSelect,
        },
      });

      return {
        ...service,
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
          ...(input.availabilitySchedule !== undefined && {
            availabilitySchedule: input.availabilitySchedule,
          }),
          ...(input.isCurrentlyAvailable !== undefined && {
            isCurrentlyAvailable: input.isCurrentlyAvailable,
          }),
          ...(input.maxConcurrentBookings !== undefined && {
            maxConcurrentBookings: input.maxConcurrentBookings,
          }),
          ...(input.advanceBookingDays !== undefined && {
            advanceBookingDays: input.advanceBookingDays,
          }),
          ...(input.serviceRadius !== undefined && {
            serviceRadius: input.serviceRadius,
          }),
          ...(input.serviceLocations !== undefined && {
            serviceLocations: input.serviceLocations,
          }),
          ...(input.isRemoteService !== undefined && {
            isRemoteService: input.isRemoteService,
          }),
        },
        select: {
          ...serviceSelect,
          _count: {
            select: {
              serviceReview: true,
            },
          },
        },
      });

      return {
        ...service,
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
          ...serviceSelect,
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
          ...serviceSelect,
          _count: {
            select: {
              serviceReview: true,
            },
          },
        },
      });

      return {
        ...service,
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
  /** Active FAQs written for one service, in the order the provider set. */
  async getServiceFaqs(serviceId: number) {
    try {
      return await this.prisma.serviceFAQ.findMany({
        where: { serviceId, isActive: true },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          question: true,
          answer: true,
          displayOrder: true,
        },
      });
    } catch (error) {
      this.logger.error('Error al obtener las preguntas frecuentes:', error);
      return [];
    }
  }

  /**
   * Active packages that include this service. Item rows carry the bundled
   * service's name so a package can be read without a second round trip.
   */
  async getServicePackagesForService(serviceId: number) {
    try {
      const packages = await this.prisma.servicePackage.findMany({
        where: {
          isActive: true,
          servicePackageItem: { some: { serviceId } },
        },
        orderBy: { totalPrice: 'asc' },
        select: {
          id: true,
          sellerId: true,
          name: true,
          description: true,
          totalPrice: true,
          discountPercentage: true,
          validityDays: true,
          servicePackageItem: {
            select: {
              id: true,
              serviceId: true,
              quantity: true,
              service: { select: { name: true } },
            },
          },
        },
      });

      return packages.map((pkg) => ({
        ...pkg,
        items: pkg.servicePackageItem.map((item) => ({
          id: item.id,
          serviceId: item.serviceId,
          quantity: item.quantity,
          serviceName: item.service?.name ?? null,
        })),
      }));
    } catch (error) {
      this.logger.error('Error al obtener los paquetes del servicio:', error);
      return [];
    }
  }
}
