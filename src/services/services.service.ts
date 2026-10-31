import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
} from '../common/exceptions/index.js';
import { assertAdminCan } from '../common/admin-access.js';
import { hiddenProviderIds } from '../common/seller-visibility.js';
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
  // Kept current by ReviewsService.recomputeAverageRating on every review.
  averageRating: true,
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

/** Business types whose sellers publish services (the web wizard's rule). */
const SERVICE_BUSINESS_TYPES = ['SERVICES', 'MIXED'];

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Leaves out services of hidden providers (banned, deactivated or not an
   * approved business), and the viewer's own services when given.
   */
  private async sellerFilter(excludeSellerId?: string) {
    const hidden = await hiddenProviderIds(this.prisma);
    const notIn = excludeSellerId ? [...hidden, excludeSellerId] : hidden;
    return notIn.length ? { sellerId: { notIn } } : {};
  }

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

      // A banned, deactivated or unapproved provider's service is not shown.
      if (
        !service ||
        (await hiddenProviderIds(this.prisma)).includes(service.sellerId)
      ) {
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
        ...(await this.sellerFilter(excludeSellerId)),
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

      if ((await hiddenProviderIds(this.prisma)).includes(sellerId)) {
        return createPaginatedResponse([], 0, page, pageSize);
      }
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
        ...(await this.sellerFilter(excludeSellerId)),
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
        ...(await this.sellerFilter(excludeSellerId)),
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
        ...(await this.sellerFilter(excludeSellerId)),
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

  /**
   * Who may publish: an active business seller whose profile EKORU approved
   * and whose business type offers services. Seller and BusinessProfile belong
   * to ekoru-users, so they are read with raw SQL. A ban or deactivation sets
   * `Seller.isActive` false, which covers tokens issued before it.
   */
  private async assertCanPublish(sellerId: string | undefined) {
    if (!sellerId) {
      throw new UnauthorizedError('Debes iniciar sesión para publicar');
    }
    const rows = await this.prisma.$queryRaw<
      {
        isActive: boolean;
        approvalStatus: string | null;
        businessType: string | null;
      }[]
    >`SELECT s."isActive",
             bp."approvalStatus"::text AS "approvalStatus",
             bp."businessType"::text   AS "businessType"
        FROM "Seller" s
        LEFT JOIN "BusinessProfile" bp ON bp."sellerId" = s."id"
       WHERE s."id" = ${sellerId}
       LIMIT 1`;
    const seller = rows[0];
    if (
      !seller?.isActive ||
      seller.approvalStatus !== 'APPROVED' ||
      !SERVICE_BUSINESS_TYPES.includes(seller.businessType ?? '')
    ) {
      throw new ForbiddenError(
        'Solo las empresas de servicios aprobadas por EKORU pueden publicar servicios',
      );
    }
  }

  /**
   * The provider edits their own service; anyone else needs to be a platform
   * admin with MANAGE_PRODUCTS (SEC-8). A bare admin token, a BUSINESS
   * admin's included, is not enough.
   */
  private async assertOwnerOrServiceAdmin({
    id,
    sellerId,
    adminId,
  }: {
    id: number;
    sellerId?: string;
    adminId?: string;
  }) {
    if (!sellerId && !adminId) {
      throw new UnauthorizedError('Debes iniciar sesión');
    }
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: { sellerId: true },
    });
    if (!service) throw new NotFoundError('Servicio no encontrado');
    if (sellerId && service.sellerId === sellerId) return;
    if (!adminId) {
      throw new ForbiddenError(
        'No puedes modificar el servicio de otro proveedor',
      );
    }
    await assertAdminCan(this.prisma, adminId, 'MANAGE_PRODUCTS');
  }

  async addService({
    input,
    sellerId,
  }: {
    input: AddServiceInput;
    sellerId?: string;
  }) {
    await this.assertCanPublish(sellerId);
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
          sellerId: sellerId!,
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
        reviewCount: 0,
      };
    } catch (error) {
      this.logger.error('Error al crear el servicio:', error);
      throw new InternalServerError('Error al crear el servicio');
    }
  }

  async updateService({
    input,
    sellerId,
    adminId,
  }: {
    input: UpdateServiceInput;
    sellerId?: string;
    adminId?: string;
  }) {
    const id = parseInt(input.id, 10);
    await this.assertOwnerOrServiceAdmin({ id, sellerId, adminId });
    try {
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
        reviewCount: service._count.serviceReview,
      };
    } catch (error) {
      this.logger.error('Error al actualizar el servicio:', error);
      throw new InternalServerError('Error al actualizar el servicio');
    }
  }

  async deleteService({
    id,
    sellerId,
    adminId,
  }: {
    id: number;
    sellerId?: string;
    adminId?: string;
  }) {
    await this.assertOwnerOrServiceAdmin({ id, sellerId, adminId });
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
        reviewCount: 0,
      };
    } catch (error) {
      this.logger.error('Error al eliminar el servicio:', error);
      throw new InternalServerError('Error al eliminar el servicio');
    }
  }

  async toggleServiceActive({
    id,
    sellerId,
    adminId,
  }: {
    id: number;
    sellerId?: string;
    adminId?: string;
  }) {
    await this.assertOwnerOrServiceAdmin({ id, sellerId, adminId });
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
      const where = {
        sellerId,
        service: {
          isActive: true,
          sellerId: { notIn: await hiddenProviderIds(this.prisma) },
        },
      };

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
