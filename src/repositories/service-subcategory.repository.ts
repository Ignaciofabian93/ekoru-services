import { Injectable, Logger } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ServiceSubCategory,
  ServiceSubCategoryTranslation,
} from '../types/service-subcategory.js';
import type { Language } from '@prisma/client';

@Injectable()
export class ServiceSubCategoryRepository {
  private readonly logger = new Logger(ServiceSubCategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a DataLoader for service sub-category translations with composite key (id:language)
   *
   * @example
   * const loader = createTranslationLoader();
   * const translation = await loader.load('1:ES');
   */
  createTranslationLoader(): DataLoader<
    string,
    ServiceSubCategoryTranslation | null
  > {
    return new DataLoader<string, ServiceSubCategoryTranslation | null>(
      async (compositeKeys: readonly string[]) => {
        try {
          const keyPairs = compositeKeys.map((key) => {
            const [idStr, language] = key.split(':');
            return {
              serviceSubCategoryId: parseInt(idStr, 10),
              language: language as Language,
            };
          });

          const translations =
            await this.prisma.serviceSubCategoryTranslation.findMany({
              where: {
                OR: keyPairs.map(({ serviceSubCategoryId, language }) => ({
                  serviceSubCategoryId,
                  language,
                })),
              },
            });

          const translationMap = new Map<
            string,
            ServiceSubCategoryTranslation
          >();
          translations.forEach((translation) => {
            const key = `${translation.serviceSubCategoryId}:${translation.language}`;
            translationMap.set(key, translation);
          });

          return compositeKeys.map((key) => translationMap.get(key) || null);
        } catch (error) {
          this.logger.error(
            `Error loading service sub-category translations: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      },
      {
        cacheKeyFn: (key: string) => key,
      },
    );
  }

  /**
   * Creates a DataLoader for service sub-categories by service category ID
   *
   * @example
   * const loader = createServiceSubCategoryByCategoryLoader();
   * const subCategories = await loader.load(1);
   */
  createServiceSubCategoryByCategoryLoader(): DataLoader<
    number,
    ServiceSubCategory[]
  > {
    return new DataLoader<number, ServiceSubCategory[]>(
      async (serviceCategoryIds: readonly number[]) => {
        try {
          const subCategories = await this.prisma.serviceSubCategory.findMany({
            where: {
              serviceCategoryId: { in: [...serviceCategoryIds] },
              isActive: true,
            },
            orderBy: { sortOrder: 'asc' },
          });

          const subCategoryMap = new Map<number, ServiceSubCategory[]>();
          subCategories.forEach((subCategory) => {
            const existing =
              subCategoryMap.get(subCategory.serviceCategoryId) || [];
            subCategoryMap.set(subCategory.serviceCategoryId, [
              ...existing,
              subCategory,
            ]);
          });

          return serviceCategoryIds.map((id) => subCategoryMap.get(id) || []);
        } catch (error) {
          this.logger.error(
            `Error loading service sub-categories by category IDs: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      },
    );
  }

  /**
   * Finds a service sub-category by slug and language
   *
   * @example
   * const sub = await findBySlug('fotografia-bodas', Language.ES);
   */
  async findBySlug(
    slug: string,
    language: Language,
  ): Promise<ServiceSubCategory | null> {
    try {
      const translation =
        await this.prisma.serviceSubCategoryTranslation.findFirst({
          where: { slug, language },
          include: { serviceSubCategory: true },
        });

      return translation?.serviceSubCategory || null;
    } catch (error) {
      this.logger.error(
        `Error finding service sub-category by slug: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds all active service sub-categories with pagination
   */
  async findAll(limit: number, offset: number): Promise<ServiceSubCategory[]> {
    try {
      return await this.prisma.serviceSubCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      this.logger.error(
        `Error finding all service sub-categories: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds all service sub-categories for a specific category
   */
  async findByServiceCategoryId(
    serviceCategoryId: number,
  ): Promise<ServiceSubCategory[]> {
    try {
      return await this.prisma.serviceSubCategory.findMany({
        where: { serviceCategoryId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding service sub-categories by category ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gets a single translation for a service sub-category using DataLoader
   */
  async getTranslation(
    loader: DataLoader<string, ServiceSubCategoryTranslation | null>,
    serviceSubCategoryId: number,
    language: Language,
  ): Promise<ServiceSubCategoryTranslation | null> {
    const key = `${serviceSubCategoryId}:${language}`;
    return loader.load(key);
  }

  /**
   * Primes the DataLoader cache with translations for multiple service sub-categories
   */
  async primeTranslations(
    loader: DataLoader<string, ServiceSubCategoryTranslation | null>,
    serviceSubCategoryIds: number[],
    language: Language,
  ): Promise<void> {
    const keys = serviceSubCategoryIds.map((id) => `${id}:${language}`);
    await loader.loadMany(keys);
  }
}
