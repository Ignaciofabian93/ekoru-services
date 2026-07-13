import { Logger } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ServiceCategory,
  ServiceCategoryTranslation,
} from '../../types/service-category.js';
import type { Language } from '@prisma/client';

const logger = new Logger('ServiceCategoryDataLoader');

/**
 * Creates a DataLoader for service category translations with composite key (id + language)
 *
 * @example
 * const loader = createServiceCategoryTranslationLoader(prisma);
 * const translation = await loader.load('1:ES');
 */
export function createServiceCategoryTranslationLoader(
  prisma: PrismaService,
): DataLoader<string, ServiceCategoryTranslation | null> {
  return new DataLoader<string, ServiceCategoryTranslation | null>(
    async (compositeKeys: readonly string[]) => {
      try {
        // Parse composite keys: "serviceCategoryId:language"
        const keyPairs = compositeKeys.map((key) => {
          const [idStr, language] = key.split(':');
          return {
            serviceCategoryId: parseInt(idStr, 10),
            language: language as Language,
          };
        });

        // Batch load all translations
        const translations = await prisma.serviceCategoryTranslation.findMany({
          where: {
            OR: keyPairs.map(({ serviceCategoryId, language }) => ({
              serviceCategoryId,
              language,
            })),
          },
        });

        // Create a map for O(1) lookup
        const translationMap = new Map<string, ServiceCategoryTranslation>();
        translations.forEach((translation) => {
          const key = `${translation.serviceCategoryId}:${translation.language}`;
          translationMap.set(key, translation);
        });

        // Return results in the same order as requested keys
        return compositeKeys.map((key) => translationMap.get(key) || null);
      } catch (error) {
        const err = error as Error;
        logger.error(
          `Error loading service category translations: ${err.message}`,
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
 * Creates a DataLoader for service categories by ID
 *
 * @example
 * const loader = createServiceCategoryByIdLoader(prisma);
 * const serviceCategory = await loader.load(1);
 */
export function createServiceCategoryByIdLoader(
  prisma: PrismaService,
): DataLoader<number, ServiceCategory | null> {
  return new DataLoader<number, ServiceCategory | null>(
    async (ids: readonly number[]) => {
      try {
        const categories = await prisma.serviceCategory.findMany({
          where: {
            id: {
              in: [...ids],
            },
          },
        });

        const categoryMap = new Map<number, ServiceCategory>();
        categories.forEach((category) => {
          categoryMap.set(category.id, category);
        });

        return ids.map((id) => categoryMap.get(id) || null);
      } catch (error) {
        const err = error as Error;
        logger.error(
          `Error loading service categories: ${err.message}`,
          err.stack,
        );
        throw error;
      }
    },
  );
}
