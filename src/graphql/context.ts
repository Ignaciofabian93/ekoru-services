import DataLoader from 'dataloader';
import { Request, Response } from 'express';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import { I18nService } from '../common/i18n/index.js';
import type { GraphQLContext } from '../types/index.js';
import { ServiceCategoryRepository } from '../serviceCategories/service-category.repository.js';
import { ServiceSubCategoryRepository } from '../serviceSubCategories/service-sub-category.repository.js';
import { resolveIdentity } from '../common/identity.js';

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
  // Identity comes from the verified access token, not from the gateway's
  // `x-seller-id` / `x-admin-id` headers — those are unsigned and were
  // believed unconditionally. See ../common/identity.
  const { sellerId, adminId, adminRole, adminType, adminSellerId, token } =
    resolveIdentity(req.headers);

  // DataLoaders MUST be fresh per request to prevent stale cache
  const loaders = {
    serviceCategoryTranslation:
      serviceCategoryRepository.createTranslationLoader(),
    serviceCategoryById:
      serviceCategoryRepository.createServiceCategoryLoader(),
    serviceSubCategories:
      serviceSubCategoryRepository.createServiceSubCategoryByCategoryLoader(),
    serviceSubCategoryById:
      serviceSubCategoryRepository.createServiceSubCategoryByIdLoader(),
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

    // Provider avatars, for services published without their own image. Most
    // providers are businesses (logo), but a person account can publish a
    // service too, so both profile tables are covered in one pass.
    //
    // Both belong to the users subgraph — same database, so they are read with
    // raw SQL — and batched, so a grid of image-less services costs one query
    // rather than one per card.
    providerLogo: new DataLoader<string, string | null>(async (sellerIds) => {
      const rows = await prisma.$queryRaw<
        { sellerId: string; image: string | null }[]
      >`SELECT s."id" AS "sellerId",
               COALESCE(bp."logo", pp."profileImage") AS "image"
          FROM "Seller" s
          LEFT JOIN "BusinessProfile" bp ON bp."sellerId" = s."id"
          LEFT JOIN "PersonProfile" pp ON pp."sellerId" = s."id"
         WHERE s."id" = ANY(${[...sellerIds]}::text[])`;
      const bySeller = new Map(rows.map((r) => [r.sellerId, r.image]));
      return sellerIds.map((id) => bySeller.get(id) ?? null);
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
    adminRole,
    adminType,
    adminSellerId,
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
