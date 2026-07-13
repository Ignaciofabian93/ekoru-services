import { Logger } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ServiceSubCategory,
  ServiceSubCategoryTranslation,
} from '../../types/service-subcategory.js';
import type { Language } from '@prisma/client';

const logger = new Logger('ServiceSubCategoryDataLoader');

/**
 * Creates a DataLoader for service sub category translations with composite key (id + language)
 *
 * @example
 * const loader = createServiceSubCategoryTranslationLoader(prisma);
 * const translation = await loader.load('1:ES');
 */
export function createServiceSubCategoryTranslationLoader(
  prisma: PrismaService,
): DataLoader<string, ServiceSubCategoryTranslation | null> {
  return new DataLoader<string, ServiceSubCategoryTranslation | null>(
    async (compositeKeys: readonly string[]) => {
      try {
        // Parse composite keys: "serviceSubCategoryId:language"
        const keyPairs = compositeKeys.map((key) => {
          const [idStr, language] = key.split(':');
          return {
            serviceSubCategoryId: parseInt(idStr, 10),
            language: language as Language,
          };
        });

        // Batch load all translations
        const translations =
          await prisma.serviceSubCategoryTranslation.findMany({
            where: {
              OR: keyPairs.map(({ serviceSubCategoryId, language }) => ({
                serviceSubCategoryId,
                language,
              })),
            },
          });

        // Create a map for O(1) lookup
        const translationMap = new Map<string, ServiceSubCategoryTranslation>();
        translations.forEach((translation) => {
          const key = `${translation.serviceSubCategoryId}:${translation.language}`;
          translationMap.set(key, translation);
        });

        // Return results in the same order as requested keys
        return compositeKeys.map((key) => translationMap.get(key) || null);
      } catch (error) {
        const err = error as Error;
        logger.error(
          `Error loading service sub category translations: ${err.message}`,
          err.stack,
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
 * Creates a DataLoader for service sub categories grouped by service category ID
 *
 * @example
 * const loader = createServiceSubCategoriesByServiceCategoryLoader(prisma);
 * const subCategories = await loader.load(1);
 */
export function createServiceSubCategoriesByServiceCategoryLoader(
  prisma: PrismaService,
): DataLoader<number, ServiceSubCategory[]> {
  return new DataLoader<number, ServiceSubCategory[]>(
    async (serviceCategoryIds: readonly number[]) => {
      try {
        const subCategories = await prisma.serviceSubCategory.findMany({
          where: {
            serviceCategoryId: {
              in: [...serviceCategoryIds],
            },
            isActive: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        });

        // Group sub categories by service category ID
        const subCategoryMap = new Map<number, ServiceSubCategory[]>();
        subCategories.forEach((subCategory) => {
          const existing =
            subCategoryMap.get(subCategory.serviceCategoryId) || [];
          subCategoryMap.set(subCategory.serviceCategoryId, [
            ...existing,
            subCategory,
          ]);
        });

        // Return results in the same order as requested service category IDs
        return serviceCategoryIds.map((id) => subCategoryMap.get(id) || []);
      } catch (error) {
        const err = error as Error;
        logger.error(
          `Error loading service sub categories: ${err.message}`,
          err.stack,
        );
        throw error;
      }
    },
  );
}

/**
 * Creates a DataLoader for service sub categories by their own ID.
 *
 * Batches the per-service `Service.serviceCategory` lookups on a grid into a
 * single query, keeping the field resolver free of N+1.
 *
 * @example
 * const loader = createServiceSubCategoryByIdLoader(prisma);
 * const subCategory = await loader.load(26);
 */
export function createServiceSubCategoryByIdLoader(
  prisma: PrismaService,
): DataLoader<number, ServiceSubCategory | null> {
  return new DataLoader<number, ServiceSubCategory | null>(
    async (ids: readonly number[]) => {
      try {
        const subCategories = await prisma.serviceSubCategory.findMany({
          where: {
            id: {
              in: [...ids],
            },
          },
        });

        const subCategoryMap = new Map<number, ServiceSubCategory>();
        subCategories.forEach((subCategory) => {
          subCategoryMap.set(subCategory.id, subCategory);
        });

        return ids.map((id) => subCategoryMap.get(id) || null);
      } catch (error) {
        const err = error as Error;
        logger.error(
          `Error loading service sub categories by id: ${err.message}`,
          err.stack,
        );
        throw error;
      }
    },
  );
}
