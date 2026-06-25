import DataLoader from 'dataloader';
import { Request, Response } from 'express';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import { I18nService } from '../common/i18n/index.js';
import type { GraphQLContext } from '../types/index.js';
import { ServiceCategoryRepository } from '../repositories/service-category.repository.js';
import { ServiceSubCategoryRepository } from '../repositories/service-subcategory.repository.js';

/**
 * GraphQL Context Factory
 *
 * Creates a fresh context object for each request. Language is resolved once
 * from the Accept-Language header and stored in context.language. DataLoaders
 * are created fresh per request to prevent stale cache across requests.
 */
export function createGraphQLContext(
  req: Request,
  res: Response,
  moduleRef: ModuleRef,
): GraphQLContext {
  const prisma = moduleRef.get(PrismaService, { strict: false });
  const serviceCategoryRepository = moduleRef.get(ServiceCategoryRepository, {
    strict: false,
  });
  const serviceSubCategoryRepository = moduleRef.get(
    ServiceSubCategoryRepository,
    { strict: false },
  );

  // Parse Accept-Language header once per request
  const i18nService = moduleRef.get(I18nService, { strict: false });
  const language = i18nService.parseAcceptLanguage(
    req.headers['accept-language'],
  );

  const sellerId = req.headers['x-seller-id'] as string | undefined;
  const adminId = req.headers['x-admin-id'] as string | undefined;
  const token = req.headers.authorization?.replace('Bearer ', '');

  // DataLoaders MUST be fresh per request to prevent stale cache
  const loaders = {
    serviceCategoryTranslation:
      serviceCategoryRepository.createTranslationLoader(),
    serviceCategoryById:
      serviceCategoryRepository.createServiceCategoryLoader(),
    serviceSubCategories:
      serviceSubCategoryRepository.createServiceSubCategoryByCategoryLoader(),
    serviceSubCategoryTranslation:
      serviceSubCategoryRepository.createTranslationLoader(),

    // Batches "did the current seller favorite these services?" lookups so
    // grids resolve `isLiked` without an N+1. Anonymous → all false.
    serviceLikedByMe: new DataLoader<number, boolean>(async (serviceIds) => {
      if (!sellerId) return serviceIds.map(() => false);
      const likes = await prisma.serviceLike.findMany({
        where: { sellerId, serviceId: { in: [...serviceIds] } },
        select: { serviceId: true },
      });
      const liked = new Set(likes.map((l) => l.serviceId));
      return serviceIds.map((id) => liked.has(id));
    }),
  };

  return {
    req,
    res,
    language,
    prisma,
    serviceCategoryRepository,
    serviceSubCategoryRepository,
    loaders,
    sellerId,
    adminId,
    token,
  };
}

/**
 * Context factory wrapper for GraphQLModule configuration.
 *
 * @example
 * GraphQLModule.forRootAsync({
 *   useFactory: (moduleRef: ModuleRef) => ({
 *     context: createContextFactory(moduleRef),
 *   }),
 *   inject: [ModuleRef],
 * })
 */
export function createContextFactory(moduleRef: ModuleRef) {
  return ({ req, res }: { req: Request; res: Response }): GraphQLContext => {
    return createGraphQLContext(req, res, moduleRef);
  };
}
