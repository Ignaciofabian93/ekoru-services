import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { ServiceSubCategoryRepository } from '../repositories/service-subcategory.repository.js';
import { I18nService } from '../common/i18n/index.js';
import { NotFoundError } from '../common/exceptions/index.js';
import type { ServiceSubCategory } from '../types/service-subcategory.js';

@Injectable()
export class ServiceSubCategoryService {
  private readonly logger = new Logger(ServiceSubCategoryService.name);

  constructor(
    private readonly serviceSubCategoryRepository: ServiceSubCategoryRepository,
    private readonly i18nService: I18nService,
  ) {}

  async getServiceSubCategoryBySlug(
    slug: string,
    language?: Language,
  ): Promise<ServiceSubCategory> {
    const lang = language ?? this.i18nService.getDefaultLanguage();
    const subCategory = await this.serviceSubCategoryRepository.findBySlug(
      slug,
      lang,
    );
    if (!subCategory) {
      throw new NotFoundError(
        this.i18nService.translate(
          'errors.service_subcategory_not_found',
          lang,
          { slug },
        ),
      );
    }
    return subCategory;
  }

  async getServiceSubCategories(
    limit: number = 20,
    offset: number = 0,
    language?: Language,
  ): Promise<ServiceSubCategory[]> {
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
    return this.serviceSubCategoryRepository.findAll(limit, offset);
  }
}
