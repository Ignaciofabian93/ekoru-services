import {
  Resolver,
  Query,
  ResolveField,
  Parent,
  Args,
  Context,
  Int,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import type {
  ServiceCategory,
  ServiceCategoryTranslation,
} from '../types/service-category.js';
import type { ServiceSubCategory } from '../types/service-subcategory.js';
import type { GraphQLContext } from '../types/index.js';
import { ServiceCategory as ServiceCategoryEntity } from '../catalog-v2/entities/service-category.entity.js';
import { ServiceCategoryTranslation as ServiceCategoryTranslationEntity } from '../catalog-v2/entities/service-category-translation.entity.js';
import { ServiceSubCategory as ServiceSubCategoryEntity } from '../catalog-v2/entities/service-subcategory.entity.js';
import { ServiceCategoryService } from '../catalog-v2/service-category.service.js';

/**
 * Service Category GraphQL Resolver
 *
 * Handles all queries and field resolutions for service categories.
 * Uses DataLoaders from context to efficiently batch translations and subcategories.
 */
@Resolver(() => ServiceCategoryEntity)
export class ServiceCategoryResolver {
  private readonly logger = new Logger(ServiceCategoryResolver.name);

  constructor(
    private readonly serviceCategoryService: ServiceCategoryService,
  ) {}

  /**
   * Query: Get service category by slug
   *
   * @example
   * query {
   *   getServiceCategoryBySlug(slug: "diseno-grafico", language: ES) {
   *     id
   *     translation { category slug }
   *   }
   * }
   */
  @Query(() => ServiceCategoryEntity, { nullable: true })
  async getServiceCategoryBySlug(
    @Args('slug') slug: string,
    @Args('language', { type: () => Language }) language: Language,
    @Context() context: GraphQLContext,
  ): Promise<ServiceCategory> {
    this.logger.debug(
      `Query: getServiceCategoryBySlug - slug: ${slug}, language: ${language}`,
    );
    context.language = language;
    return this.serviceCategoryService.getServiceCategoryBySlug(slug, language);
  }

  /**
   * Query: Get all service categories with pagination
   *
   * @example
   * query {
   *   getServiceCategories(limit: 10, offset: 0, language: ES) {
   *     id
   *     translation { category }
   *   }
   * }
   */
  @Query(() => [ServiceCategoryEntity])
  async getServiceCategories(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Context() context: GraphQLContext,
  ): Promise<ServiceCategory[]> {
    this.logger.debug(
      `Query: getServiceCategories - limit: ${limit}, offset: ${offset}, language: ${language}`,
    );

    context.language = language;

    const categories = await this.serviceCategoryService.getServiceCategories(
      limit,
      offset,
      language,
    );

    // Prime translation cache to avoid N+1 on translation ResolveField
    if (categories.length > 0) {
      const categoryIds = categories.map((cat) => cat.id);
      await context.serviceCategoryRepository.primeTranslations(
        context.loaders.serviceCategoryTranslation,
        categoryIds,
        language,
      );
    }

    return categories;
  }

  /**
   * Field Resolver: translation
   *
   * Resolves the translation field using DataLoader — no N+1.
   * Language is taken from context (set by parent query).
   */
  @ResolveField(() => ServiceCategoryTranslationEntity, { nullable: true })
  async translation(
    @Parent() serviceCategory: ServiceCategory,
    @Context() context: GraphQLContext,
  ): Promise<ServiceCategoryTranslation | null> {
    const language = context.language;
    this.logger.debug(
      `ResolveField: translation - serviceCategoryId: ${serviceCategory.id}, language: ${language}`,
    );
    return context.serviceCategoryRepository.getTranslation(
      context.loaders.serviceCategoryTranslation,
      serviceCategory.id,
      language,
    );
  }

  /**
   * Field Resolver: subcategories
   *
   * Resolves subcategories via DataLoader and primes their translation cache.
   */
  @ResolveField(() => [ServiceSubCategoryEntity])
  async subcategories(
    @Parent() serviceCategory: ServiceCategory,
    @Context() context: GraphQLContext,
  ): Promise<ServiceSubCategory[]> {
    const language = context.language;
    this.logger.debug(
      `ResolveField: ServiceCategory.subcategories(id: ${serviceCategory.id}) - language: ${language}`,
    );

    const subCategories = await context.loaders.serviceSubCategories.load(
      serviceCategory.id,
    );

    // Prime subcategory translation cache
    if (subCategories.length > 0) {
      const subCategoryIds = subCategories.map((sub) => sub.id);
      await context.serviceSubCategoryRepository.primeTranslations(
        context.loaders.serviceSubCategoryTranslation,
        subCategoryIds,
        language,
      );
    }

    return subCategories;
  }
}
