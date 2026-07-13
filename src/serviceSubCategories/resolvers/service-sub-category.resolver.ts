import {
  Resolver,
  Query,
  ResolveField,
  Parent,
  Context,
  Args,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import type {
  ServiceSubCategory,
  ServiceSubCategoryTranslation,
} from '../../types/service-subcategory.js';
import type { GraphQLContext } from '../../types/index.js';
import {
  ServiceSubCategory as ServiceSubCategoryEntity,
  ServiceSubCategoryTranslation as ServiceSubCategoryTranslationEntity,
  ServiceSubCategoryServices as ServiceSubCategoryServicesEntity,
} from '../entities/index.js';
import {
  GetServiceSubCategoriesArgs,
  GetServiceSubCategoryByIdArgs,
  GetServiceSubCategoryBySlugArgs,
  GetServiceSubCategoryServicesBySlugArgs,
} from '../dto/index.js';
import { ServiceSubCategoryService } from '../service-sub-category.service.js';
import { CurrentSeller } from '../../common/decorators/index.js';

/**
 * Service Sub Category GraphQL Resolver
 *
 * This resolver handles queries and field resolutions for service sub categories.
 * It uses DataLoaders from the context to efficiently load translations.
 */
@Resolver(() => ServiceSubCategoryEntity)
export class ServiceSubCategoryResolver {
  private readonly logger = new Logger(ServiceSubCategoryResolver.name);

  constructor(
    private readonly serviceSubCategoryService: ServiceSubCategoryService,
  ) {}

  /**
   * Query: Get all service sub categories with page-based pagination
   *
   * @example
   * query {
   *   getServiceSubCategories(page: 1, pageSize: 20, language: ES) {
   *     id
   *     translation { subCategory }
   *   }
   * }
   */
  @Query(() => [ServiceSubCategoryEntity])
  async getServiceSubCategories(
    @Args() { page, pageSize, language }: GetServiceSubCategoriesArgs,
    @Context() context: GraphQLContext,
  ): Promise<ServiceSubCategory[]> {
    this.logger.debug(
      `Query: getServiceSubCategories(page: ${page}, pageSize: ${pageSize}, language: ${language})`,
    );

    // Override context language so field resolvers use the same language the client requested.
    context.language = language;

    const subCategories =
      await this.serviceSubCategoryService.getServiceSubCategories({
        page,
        pageSize,
        language,
      });

    if (subCategories.length > 0) {
      const subCategoryIds = subCategories.map((sub) => sub.id);

      // Prime the translation cache for all sub categories
      await context.serviceSubCategoryRepository.primeTranslations(
        context.loaders.serviceSubCategoryTranslation,
        subCategoryIds,
        language,
      );
    }

    return subCategories;
  }

  /**
   * Query: Get a single service sub category by ID (admin panel)
   */
  @Query(() => ServiceSubCategoryEntity, { nullable: true })
  async getServiceSubCategoryById(
    @Args() { id, language }: GetServiceSubCategoryByIdArgs,
    @Context() context: GraphQLContext,
  ): Promise<ServiceSubCategory> {
    this.logger.debug(`Query: getServiceSubCategoryById(${id}, ${language})`);

    context.language = language;

    return this.serviceSubCategoryService.getServiceSubCategoryById({
      id,
      language,
    });
  }

  /**
   * Query: Get a single service sub category by slug (web browsing)
   */
  @Query(() => ServiceSubCategoryEntity, { nullable: true })
  async getServiceSubCategoryBySlug(
    @Args() { slug, language }: GetServiceSubCategoryBySlugArgs,
    @Context() context: GraphQLContext,
  ): Promise<ServiceSubCategory> {
    this.logger.debug(
      `Query: getServiceSubCategoryBySlug(${slug}, ${language})`,
    );

    context.language = language;

    return this.serviceSubCategoryService.getServiceSubCategoryBySlug({
      slug,
      language,
    });
  }

  /**
   * Query: Get a service sub category by slug along with its paginated services
   * (web browsing). This is the most focused browsing level.
   *
   * On the first load select the full payload; when paginating select only
   * `services` so the sub category data is not re-resolved.
   *
   * @example
   * query {
   *   getServiceSubCategoryServicesBySlug(slug: "fotografia-bodas", language: ES, page: 1, pageSize: 12) {
   *     serviceSubCategory {
   *       id
   *       translation { subCategory slug }
   *     }
   *     services {
   *       nodes { id name basePrice }
   *       pageInfo { totalCount totalPages hasNextPage }
   *     }
   *   }
   * }
   */
  @Query(() => ServiceSubCategoryServicesEntity, { nullable: true })
  async getServiceSubCategoryServicesBySlug(
    @Args()
    {
      slug,
      language,
      page,
      pageSize,
      isActive,
    }: GetServiceSubCategoryServicesBySlugArgs,
    @Context() context: GraphQLContext,
    @CurrentSeller() currentSellerId?: string,
  ) {
    this.logger.debug(
      `Query: getServiceSubCategoryServicesBySlug(${slug}, ${language}, page: ${page}, pageSize: ${pageSize})`,
    );

    // Override context language so field resolvers use the same language the client requested.
    context.language = language;

    return this.serviceSubCategoryService.getServiceSubCategoryServicesBySlug({
      slug,
      language,
      page,
      pageSize,
      isActive,
      excludeSellerId: currentSellerId,
    });
  }

  /**
   * Field Resolver: translation
   *
   * Resolves the translation field for a service sub category using DataLoader.
   * Returns a SINGLE translation object based on the current language.
   */
  @ResolveField(() => ServiceSubCategoryTranslationEntity, { nullable: true })
  async translation(
    @Parent() serviceSubCategory: ServiceSubCategory,
    @Context() context: GraphQLContext,
  ): Promise<ServiceSubCategoryTranslation | null> {
    const language = context.language;

    this.logger.debug(
      `ResolveField: ServiceSubCategory.translation(id: ${serviceSubCategory.id}, language: ${language})`,
    );

    return context.serviceSubCategoryRepository.getTranslation(
      context.loaders.serviceSubCategoryTranslation,
      serviceSubCategory.id,
      language,
    );
  }
}
