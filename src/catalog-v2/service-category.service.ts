import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { ServiceCategoryRepository } from '../repositories/service-category.repository.js';
import { I18nService } from '../common/i18n/index.js';
import { NotFoundError } from '../common/exceptions/index.js';
import type { ServiceCategory } from '../types/service-category.js';

@Injectable()
export class ServiceCategoryService {
  private readonly logger = new Logger(ServiceCategoryService.name);

  constructor(
    private readonly serviceCategoryRepository: ServiceCategoryRepository,
    private readonly i18nService: I18nService,
  ) {}

  async getServiceCategoryBySlug(
    slug: string,
    language?: Language,
  ): Promise<ServiceCategory> {
    const lang = language ?? this.i18nService.getDefaultLanguage();
    const category = await this.serviceCategoryRepository.findBySlug(
      slug,
      lang,
    );
    if (!category) {
      throw new NotFoundError(
        this.i18nService.translate('errors.service_category_not_found', lang, {
          slug,
        }),
      );
    }
    return category;
  }

  async getServiceCategories(
    limit: number = 20,
    offset: number = 0,
    language?: Language,
  ): Promise<ServiceCategory[]> {
    const lang = language ?? this.i18nService.getDefaultLanguage();
    if (limit < 1 || limit > 100)
      throw new Error(
        this.i18nService.translate('errors.limit_out_of_range', lang, {
          min: '1',
          max: '100',
        }),
      );
    if (offset < 0)
      throw new Error(
        this.i18nService.translate('errors.offset_negative', lang),
      );
    return this.serviceCategoryRepository.findAll(limit, offset);
  }

  async getServiceCategoryById(id: number): Promise<ServiceCategory> {
    const loader = this.serviceCategoryRepository.createServiceCategoryLoader();
    const category = await loader.load(id);
    if (!category) {
      throw new NotFoundError(
        this.i18nService.translate(
          'errors.service_category_id_not_found',
          this.i18nService.getDefaultLanguage(),
          { id: String(id) },
        ),
      );
    }
    return category;
  }
}
