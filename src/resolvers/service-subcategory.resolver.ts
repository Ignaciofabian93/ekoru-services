import {
  Resolver,
  ResolveField,
  Parent,
  Context,
  Query,
  Int,
  Args,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import type {
  ServiceSubCategory,
  ServiceSubCategoryTranslation,
} from '../types/service-subcategory.js';
import type { GraphQLContext } from '../types/index.js';
import { ServiceSubCategory as ServiceSubCategoryEntity } from '../catalog-v2/entities/service-subcategory.entity.js';
import { ServiceSubCategoryTranslation as ServiceSubCategoryTranslationEntity } from '../catalog-v2/entities/service-subcategory-translation.entity.js';
import { Language } from '@prisma/client';
import { ServiceSubCategoryService } from '../catalog-v2/service-subcategory.service.js';

/**
 * Service Sub-Category GraphQL Resolver
 *
 * Handles all queries and field resolutions for service sub-categories.
 * Uses DataLoaders from context to efficiently batch translations.
 */
@Resolver(() => ServiceSubCategoryEntity)
export class ServiceSubCategoryResolver {
  private readonly logger = new Logger(ServiceSubCategoryResolver.name);

  constructor(
    private readonly serviceSubCategoryService: ServiceSubCategoryService,
  ) {}

  /**
   * Query: Get service sub-category by slug
   *
   * @example
   * query {
   *   getServiceSubCategoryBySlug(slug: "fotografia-bodas", language: ES) {
   *     id
   *     translation { subCategory slug }
   *   }
   * }
   */
  @Query(() => ServiceSubCategoryEntity, { nullable: true })
  async getServiceSubCategoryBySlug(
    @Args('slug') slug: string,
    @Args('language', { type: () => Language, nullable: true })
    language: Language,
    @Context() context: GraphQLContext,
  ): Promise<ServiceSubCategory> {
    this.logger.debug(
      `Query: getServiceSubCategoryBySlug - slug: ${slug}, language: ${language}`,
    );
    context.language = language;
    return this.serviceSubCategoryService.getServiceSubCategoryBySlug({
      slug,
      language,
    });
  }

  /**
   * Query: Get all service sub-categories with pagination
   *
   * @example
   * query {
   *   getServiceSubCategories(limit: 10, offset: 0, language: ES) {
   *     id
   *     translation { subCategory }
   *   }
   * }
   */
  @Query(() => [ServiceSubCategoryEntity])
  async getServiceSubCategories(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Context() context: GraphQLContext,
  ): Promise<ServiceSubCategory[]> {
    this.logger.debug(
      `Query: getServiceSubCategories - limit: ${limit}, offset: ${offset}, language: ${language}`,
    );

    context.language = language;

    const subCategories =
      await this.serviceSubCategoryService.getServiceSubCategories({
        limit,
        offset,
        language,
      });

    // Prime translation cache to avoid N+1 on translation ResolveField
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

  /**
   * Field Resolver: translation
   *
   * Resolves the translation field using DataLoader — no N+1.
   * Language is taken from context (set by parent query).
   */
  @ResolveField(() => ServiceSubCategoryTranslationEntity, { nullable: true })
  async translation(
    @Parent() serviceSubCategory: ServiceSubCategory,
    @Context() context: GraphQLContext,
  ): Promise<ServiceSubCategoryTranslation | null> {
    const language = context.language;
    this.logger.debug(
      `Resolving translation for ServiceSubCategory ID: ${serviceSubCategory.id} in language: ${language}`,
    );
    return context.serviceSubCategoryRepository.getTranslation(
      context.loaders.serviceSubCategoryTranslation,
      serviceSubCategory.id,
      language,
    );
  }
}
