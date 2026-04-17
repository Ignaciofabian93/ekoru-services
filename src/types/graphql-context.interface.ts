import DataLoader from 'dataloader';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Language } from '@prisma/client';
import type {
  ServiceCategory,
  ServiceCategoryTranslation,
} from './service-category.js';
import type {
  ServiceSubCategory,
  ServiceSubCategoryTranslation,
} from './service-subcategory.js';
import type { ServiceCategoryRepository } from '../repositories/service-category.repository.js';
import type { ServiceSubCategoryRepository } from '../repositories/service-subcategory.repository.js';

/**
 * GraphQL Context Interface
 *
 * Defines the per-request context available to all resolvers.
 *
 * `language` is resolved from the Accept-Language header and can be overridden
 * by resolvers that accept an explicit `language` argument (e.g. `context.language = language`).
 */
export interface GraphQLContext {
  req: Request;
  res: Response;

  // Mutable per-request — resolvers may override for explicit language args
  language: Language;

  prisma: PrismaService;

  // Repositories
  serviceCategoryRepository: ServiceCategoryRepository;
  serviceSubCategoryRepository: ServiceSubCategoryRepository;

  // DataLoaders - Fresh per request to prevent stale data
  loaders: {
    serviceCategoryTranslation: DataLoader<
      string,
      ServiceCategoryTranslation | null
    >;
    serviceCategoryById: DataLoader<number, ServiceCategory | null>;
    serviceSubCategories: DataLoader<number, ServiceSubCategory[]>;
    serviceSubCategoryTranslation: DataLoader<
      string,
      ServiceSubCategoryTranslation | null
    >;
  };

  sellerId?: string;
  token?: string;
}

export function isValidGraphQLContext(context: any): context is GraphQLContext {
  return (
    context &&
    typeof context === 'object' &&
    'loaders' in context &&
    'language' in context &&
    'prisma' in context
  );
}
