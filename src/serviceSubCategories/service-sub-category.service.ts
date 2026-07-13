import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { ServiceSubCategoryRepository } from './service-sub-category.repository.js';
import { I18nServiceSubCategoryService } from './i18n/index.js';
import { ServicesService } from '../services/services.service.js';
import { BadRequestError, NotFoundError } from '../common/exceptions/index.js';
import type { ServiceSubCategory } from '../types/service-subcategory.js';

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
 * Service Sub Category Service - Business logic for service sub category operations
 *
 * Lookup conventions:
 * - by slug → web browsing (e.g. /fotografia-bodas)
 * - by id   → admin panel
 */
@Injectable()
export class ServiceSubCategoryService {
  private readonly logger = new Logger(ServiceSubCategoryService.name);

  constructor(
    private readonly serviceSubCategoryRepository: ServiceSubCategoryRepository,
    private readonly i18nService: I18nServiceSubCategoryService,
    private readonly servicesService: ServicesService,
  ) {}

  /**
   * Gets all service sub categories with page-based pagination
   *
   * @example
   * const subCategories = await getServiceSubCategories({ page: 1, pageSize: 20, language: Language.ES });
   */
  async getServiceSubCategories({
    page = 1,
    pageSize = 20,
    language,
  }: ListParams): Promise<ServiceSubCategory[]> {
    const currentPage = page ?? 1;
    const currentPageSize = pageSize ?? 20;

    this.logger.debug(
      `Getting service sub categories: page=${currentPage}, pageSize=${currentPageSize}, language=${language}`,
    );

    this.validatePagination(currentPage, currentPageSize, language);

    const subCategories = await this.serviceSubCategoryRepository.findAll(
      currentPage,
      currentPageSize,
    );

    this.logger.debug(`Found ${subCategories.length} service sub categories`);

    return subCategories;
  }

  /**
   * Gets a service sub category by its ID (admin panel)
   *
   * @throws {NotFoundError} If service sub category is not found
   */
  async getServiceSubCategoryById({
    id,
    language,
  }: BaseParams & { id: number }): Promise<ServiceSubCategory> {
    this.logger.debug(
      `Getting service sub category by id: ${id}, language: ${language}`,
    );

    const subCategory = await this.serviceSubCategoryRepository.findById(id);

    if (!subCategory) {
      throw new NotFoundError(
        this.i18nService.translate(
          'errors.service_sub_category_not_found_id',
          language,
          { id: String(id) },
        ),
      );
    }

    return subCategory;
  }

  /**
   * Gets a service sub category by its slug (web browsing)
   *
   * @throws {NotFoundError} If service sub category is not found
   *
   * @example
   * const subCategory = await getServiceSubCategoryBySlug({ slug: 'fotografia-bodas', language: Language.ES });
   */
  async getServiceSubCategoryBySlug({
    slug,
    language,
  }: BaseParams & { slug: string }): Promise<ServiceSubCategory> {
    this.logger.debug(
      `Getting service sub category by slug: ${slug}, language: ${language}`,
    );

    const subCategory = await this.serviceSubCategoryRepository.findBySlug(
      slug,
      language,
    );

    if (!subCategory) {
      throw new NotFoundError(
        this.i18nService.translate(
          'errors.service_sub_category_not_found',
          language,
          { slug },
        ),
      );
    }

    return subCategory;
  }

  /**
   * Gets a service sub category by slug together with its paginated services
   * (web browsing). The sub category's translation is resolved through the
   * ServiceSubCategory field resolvers, so clients can select only `services`
   * when paginating.
   */
  async getServiceSubCategoryServicesBySlug({
    slug,
    language,
    page = 1,
    pageSize = 20,
    isActive,
    excludeSellerId,
  }: ServiceQueryParams & { slug: string }) {
    this.logger.debug(
      `Getting service sub category services by slug: ${slug}, page=${page}, pageSize=${pageSize}`,
    );

    const currentPage = page ?? 1;
    const currentPageSize = pageSize ?? 20;

    this.validatePagination(currentPage, currentPageSize, language);

    const serviceSubCategory = await this.getServiceSubCategoryBySlug({
      slug,
      language,
    });

    const services = await this.servicesService.getServicesBySubCategory({
      subcategoryId: serviceSubCategory.id,
      page: currentPage,
      pageSize: currentPageSize,
      isActive,
      excludeSellerId,
    });

    return {
      serviceSubCategory,
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
