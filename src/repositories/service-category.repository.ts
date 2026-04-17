import { Injectable, Logger } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ServiceCategory,
  ServiceCategoryTranslation,
} from '../types/service-category.js';
import type { Language } from '@prisma/client';

@Injectable()
export class ServiceCategoryRepository {
  private readonly logger = new Logger(ServiceCategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a DataLoader for service category translations with composite key (id:language)
   *
   * @example
   * const loader = createTranslationLoader();
   * const translation = await loader.load('1:ES');
   */
  createTranslationLoader(): DataLoader<
    string,
    ServiceCategoryTranslation | null
  > {
    return new DataLoader<string, ServiceCategoryTranslation | null>(
      async (compositeKeys: readonly string[]) => {
        try {
          const keyPairs = compositeKeys.map((key) => {
            const [idStr, language] = key.split(':');
            return {
              serviceCategoryId: parseInt(idStr, 10),
              language: language as Language,
            };
          });

          const translations =
            await this.prisma.serviceCategoryTranslation.findMany({
              where: {
                OR: keyPairs.map(({ serviceCategoryId, language }) => ({
                  serviceCategoryId,
                  language,
                })),
              },
            });

          const translationMap = new Map<string, ServiceCategoryTranslation>();
          translations.forEach((translation) => {
            const key = `${translation.serviceCategoryId}:${translation.language}`;
            translationMap.set(key, translation);
          });

          return compositeKeys.map((key) => translationMap.get(key) || null);
        } catch (error) {
          this.logger.error(
            `Error loading service category translations: ${error.message}`,
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
   * Creates a DataLoader for service categories by ID
   */
  createServiceCategoryLoader(): DataLoader<number, ServiceCategory | null> {
    return new DataLoader<number, ServiceCategory | null>(
      async (ids: readonly number[]) => {
        try {
          const categories = await this.prisma.serviceCategory.findMany({
            where: { id: { in: [...ids] } },
          });

          const categoryMap = new Map<number, ServiceCategory>();
          categories.forEach((category) => {
            categoryMap.set(category.id, category);
          });

          return ids.map((id) => categoryMap.get(id) || null);
        } catch (error) {
          this.logger.error(
            `Error loading service categories: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      },
    );
  }

  /**
   * Finds a service category by slug and language
   *
   * @example
   * const cat = await findBySlug('diseno-grafico', Language.ES);
   */
  async findBySlug(
    slug: string,
    language: Language,
  ): Promise<ServiceCategory | null> {
    try {
      const translation =
        await this.prisma.serviceCategoryTranslation.findUnique({
          where: {
            slug_language: { slug, language },
          },
          include: { serviceCategory: true },
        });

      return translation?.serviceCategory || null;
    } catch (error) {
      this.logger.error(
        `Error finding service category by slug: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gets a single translation for a service category using DataLoader
   */
  async getTranslation(
    loader: DataLoader<string, ServiceCategoryTranslation | null>,
    serviceCategoryId: number,
    language: Language,
  ): Promise<ServiceCategoryTranslation | null> {
    const key = `${serviceCategoryId}:${language}`;
    return loader.load(key);
  }

  /**
   * Primes the DataLoader cache with translations for multiple service categories
   */
  async primeTranslations(
    loader: DataLoader<string, ServiceCategoryTranslation | null>,
    serviceCategoryIds: number[],
    language: Language,
  ): Promise<void> {
    const keys = serviceCategoryIds.map((id) => `${id}:${language}`);
    await loader.loadMany(keys);
  }

  /**
   * Finds all active service categories with pagination
   */
  async findAll(limit: number, offset: number): Promise<ServiceCategory[]> {
    try {
      return await this.prisma.serviceCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      this.logger.error(
        `Error finding all service categories: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
