import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { ServiceCategoryRepository } from './service-category.repository.js';
import { I18nServiceCategoryService } from './i18n/index.js';
import { ServicesService } from '../services/services.service.js';
import { BadRequestError, NotFoundError } from '../common/exceptions/index.js';
import type { ServiceCategory } from '../types/service-category.js';

type BaseParams = {
  language: Language;
};

type ListParams = BaseParams & {
  page?: number | null;
  pageSize?: number | null;
};

type ServiceQueryParams = ListParams & {
  isActive?: boolean;
  excludeSellerId?: string;
};

/**
 * Service Category Service - Business logic for service category operations
 *
 * This service provides high-level operations for service categories, coordinating
 * between repositories and applying business rules.
 *
 * Lookup conventions:
 * - by slug → web browsing (e.g. /diseno-grafico)
 * - by id   → admin panel
 */
@Injectable()
export class ServiceCategoryService {
  private readonly logger = new Logger(ServiceCategoryService.name);

  constructor(
    private readonly serviceCategoryRepository: ServiceCategoryRepository,
    private readonly i18nService: I18nServiceCategoryService,
    private readonly servicesService: ServicesService,
  ) {}

  /**
   * Gets all service categories with page-based pagination
   *
   * @example
   * const serviceCategories = await getServiceCategories({ page: 1, pageSize: 20, language: Language.ES });
   */
  async getServiceCategories({
    page = 1,
    pageSize = 20,
    language,
  }: ListParams): Promise<ServiceCategory[]> {
    const currentPage = page ?? 1;
    const currentPageSize = pageSize ?? 20;

    this.logger.debug(
      `Getting service categories: page=${currentPage}, pageSize=${currentPageSize}, language=${language}`,
    );

    this.validatePagination(currentPage, currentPageSize, language);

    const serviceCategories = await this.serviceCategoryRepository.findAll(
      currentPage,
      currentPageSize,
    );

    this.logger.debug(`Found ${serviceCategories.length} service categories`);

    return serviceCategories;
  }

  /**
   * Gets a service category by its ID (admin panel)
   *
   * @throws {NotFoundError} If service category is not found
   */
  async getServiceCategoryById({
    id,
    language,
  }: BaseParams & { id: number }): Promise<ServiceCategory> {
    this.logger.debug(
      `Getting service category by id: ${id}, language: ${language}`,
    );

    const serviceCategory = await this.serviceCategoryRepository.findById(id);

    if (!serviceCategory) {
      throw new NotFoundError(
        this.i18nService.translate(
          'errors.service_category_not_found_id',
          language,
          { id: String(id) },
        ),
      );
    }

    return serviceCategory;
  }

  /**
   * Gets a service category by its slug (web browsing)
   *
   * @throws {NotFoundError} If service category is not found
   *
   * @example
   * const serviceCategory = await getServiceCategoryBySlug({ slug: 'diseno-grafico', language: Language.ES });
   */
  async getServiceCategoryBySlug({
    slug,
    language,
  }: BaseParams & { slug: string }): Promise<ServiceCategory> {
    this.logger.debug(
      `Getting service category by slug: ${slug}, language: ${language}`,
    );

    const serviceCategory = await this.serviceCategoryRepository.findBySlug(
      slug,
      language,
    );

    if (!serviceCategory) {
      throw new NotFoundError(
        this.i18nService.translate(
          'errors.service_category_not_found',
          language,
          { slug },
        ),
      );
    }

    return serviceCategory;
  }

  /**
   * Gets a service category by ID together with the paginated list of every
   * service under it (admin panel). Sub categories are resolved through the
   * ServiceCategory field resolvers.
   */
  async getServiceCategoryServicesById({
    id,
    language,
    page = 1,
    pageSize = 20,
    isActive,
    excludeSellerId,
  }: ServiceQueryParams & { id: number }) {
    this.logger.debug(
      `Getting service category services by id: ${id}, page=${page}, pageSize=${pageSize}`,
    );

    const serviceCategory = await this.getServiceCategoryById({
      id,
      language,
    });

    return this.buildServiceCategoryServices(serviceCategory, {
      language,
      page,
      pageSize,
      isActive,
      excludeSellerId,
    });
  }

  /**
   * Gets a service category by slug together with the paginated list of every
   * service under it (web browsing). Sub categories are resolved through the
   * ServiceCategory field resolvers.
   *
   * @example
   * const { serviceCategory, services } = await getServiceCategoryServicesBySlug({
   *   slug: 'diseno-grafico',
   *   language: Language.ES,
   *   page: 1,
   *   pageSize: 20,
   * });
   */
  async getServiceCategoryServicesBySlug({
    slug,
    language,
    page = 1,
    pageSize = 20,
    isActive,
    excludeSellerId,
  }: ServiceQueryParams & { slug: string }) {
    this.logger.debug(
      `Getting service category services by slug: ${slug}, page=${page}, pageSize=${pageSize}`,
    );

    const serviceCategory = await this.getServiceCategoryBySlug({
      slug,
      language,
    });

    return this.buildServiceCategoryServices(serviceCategory, {
      language,
      page,
      pageSize,
      isActive,
      excludeSellerId,
    });
  }

  /**
   * Fetches the paginated services of an already-resolved service category and
   * returns the combined ServiceCategoryServices payload.
   */
  private async buildServiceCategoryServices(
    serviceCategory: ServiceCategory,
    {
      language,
      page = 1,
      pageSize = 20,
      isActive,
      excludeSellerId,
    }: ServiceQueryParams,
  ) {
    const currentPage = page ?? 1;
    const currentPageSize = pageSize ?? 20;

    this.validatePagination(currentPage, currentPageSize, language);

    const services = await this.servicesService.getServicesByCategory({
      categoryId: serviceCategory.id,
      page: currentPage,
      pageSize: currentPageSize,
      isActive,
      excludeSellerId,
    });

    return {
      serviceCategory,
      services,
    };
  }

  /**
   * Validates page-based pagination parameters (page >= 1, 1 <= pageSize <= 100)
   */
  private validatePagination(
    page: number,
    pageSize: number,
    language: Language,
  ): void {
    if (page < 1) {
      throw new BadRequestError(
        this.i18nService.translate('errors.invalid_page', language),
      );
    }

    if (pageSize < 1 || pageSize > 100) {
      throw new BadRequestError(
        this.i18nService.translate('errors.page_size_out_of_range', language, {
          min: '1',
          max: '100',
        }),
      );
    }
  }
}
