import {
  Resolver,
  Query,
  ResolveField,
  ResolveReference,
  Parent,
  Args,
  Context,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import type {
  ServiceCategory,
  ServiceCategoryTranslation,
} from '../../types/service-category.js';
import type { ServiceSubCategory } from '../../types/service-subcategory.js';
import type { GraphQLContext } from '../../types/index.js';
import {
  ServiceCategory as ServiceCategoryEntity,
  ServiceCategoryTranslation as ServiceCategoryTranslationEntity,
  ServiceCategoryServices as ServiceCategoryServicesEntity,
} from '../entities/index.js';
import { ServiceSubCategory as ServiceSubCategoryEntity } from '../../serviceSubCategories/entities/index.js';
import {
  GetServiceCategoriesArgs,
  GetServiceCategoryByIdArgs,
  GetServiceCategoryBySlugArgs,
  GetServiceCategoryServicesByIdArgs,
  GetServiceCategoryServicesBySlugArgs,
} from '../dto/index.js';
import { ServiceCategoryService } from '../service-category.service.js';
import { CurrentSeller } from '../../common/decorators/index.js';

/**
 * Service Category GraphQL Resolver
 *
 * This resolver handles all GraphQL queries and field resolutions for service categories.
 * It uses DataLoaders from the context to efficiently load translations and related data.
 *
 * Lookup conventions:
 * - by slug → web browsing (e.g. /diseno-grafico)
 * - by id   → admin panel
 */
@Resolver(() => ServiceCategoryEntity)
export class ServiceCategoryResolver {
  private readonly logger = new Logger(ServiceCategoryResolver.name);

  constructor(
    private readonly serviceCategoryService: ServiceCategoryService,
  ) {}

  /**
   * Query: Get all service categories with page-based pagination
   *
   * @example
   * query {
   *   getServiceCategories(page: 1, pageSize: 20, language: ES) {
   *     id
   *     translation { category }
   *   }
   * }
   */
  @Query(() => [ServiceCategoryEntity])
  async getServiceCategories(
    @Args() { page, pageSize, language }: GetServiceCategoriesArgs,
    @Context() context: GraphQLContext,
  ): Promise<ServiceCategory[]> {
    this.logger.debug(
      `Query: getServiceCategories(page: ${page}, pageSize: ${pageSize}, language: ${language})`,
    );

    // Override context language so field resolvers (translation, subcategories)
    // use the same language the client explicitly requested.
    context.language = language;

    const serviceCategories =
      await this.serviceCategoryService.getServiceCategories({
        page,
        pageSize,
        language,
      });

    // Prime the translation cache for all service categories
    if (serviceCategories.length > 0) {
      const serviceCategoryIds = serviceCategories.map((c) => c.id);
      await context.serviceCategoryRepository.primeTranslations(
        context.loaders.serviceCategoryTranslation,
        serviceCategoryIds,
        language,
      );
    }

    return serviceCategories;
  }

  /**
   * Query: Get a single service category by ID (admin panel)
   *
   * @example
   * query {
   *   getServiceCategoryById(id: 1, language: ES) {
   *     id
   *     translation { category }
   *     subcategories { id translation { subCategory } }
   *   }
   * }
   */
  @Query(() => ServiceCategoryEntity, { nullable: true })
  async getServiceCategoryById(
    @Args() { id, language }: GetServiceCategoryByIdArgs,
    @Context() context: GraphQLContext,
  ): Promise<ServiceCategory> {
    this.logger.debug(`Query: getServiceCategoryById(${id}, ${language})`);

    context.language = language;

    return this.serviceCategoryService.getServiceCategoryById({
      id,
      language,
    });
  }

  /**
   * Query: Get a single service category by slug (web browsing)
   *
   * @example
   * query {
   *   getServiceCategoryBySlug(slug: "diseno-grafico", language: ES) {
   *     id
   *     translation { category }
   *     subcategories { id translation { subCategory } }
   *   }
   * }
   */
  @Query(() => ServiceCategoryEntity, { nullable: true })
  async getServiceCategoryBySlug(
    @Args() { slug, language }: GetServiceCategoryBySlugArgs,
    @Context() context: GraphQLContext,
  ): Promise<ServiceCategory> {
    this.logger.debug(`Query: getServiceCategoryBySlug(${slug}, ${language})`);

    context.language = language;

    return this.serviceCategoryService.getServiceCategoryBySlug({
      slug,
      language,
    });
  }

  /**
   * Query: Get a service category by ID along with its sub categories and the
   * paginated list of every service inside it (admin panel)
   *
   * @example
   * query {
   *   getServiceCategoryServicesById(id: 1, language: ES, page: 1, pageSize: 20) {
   *     serviceCategory {
   *       id
   *       translation { category slug }
   *       subcategories { id translation { subCategory } }
   *     }
   *     services {
   *       nodes { id name basePrice }
   *       pageInfo { totalCount totalPages hasNextPage }
   *     }
   *   }
   * }
   */
  @Query(() => ServiceCategoryServicesEntity, { nullable: true })
  async getServiceCategoryServicesById(
    @Args()
    {
      id,
      language,
      page,
      pageSize,
      isActive,
    }: GetServiceCategoryServicesByIdArgs,
    @Context() context: GraphQLContext,
    @CurrentSeller() currentSellerId?: string,
  ) {
    this.logger.debug(
      `Query: getServiceCategoryServicesById(${id}, ${language}, page: ${page}, pageSize: ${pageSize})`,
    );

    // Override context language so nested field resolvers (e.g. sub category
    // translations) use the same language the client explicitly requested.
    context.language = language;

    return this.serviceCategoryService.getServiceCategoryServicesById({
      id,
      language,
      page,
      pageSize,
      isActive,
      excludeSellerId: currentSellerId,
    });
  }

  /**
   * Query: Get a service category by slug along with its sub categories and the
   * paginated list of every service inside it (web browsing)
   *
   * @example
   * query {
   *   getServiceCategoryServicesBySlug(slug: "diseno-grafico", language: ES, page: 1, pageSize: 20) {
   *     serviceCategory {
   *       id
   *       translation { category slug }
   *       subcategories { id translation { subCategory } }
   *     }
   *     services {
   *       nodes { id name basePrice }
   *       pageInfo { totalCount totalPages hasNextPage }
   *     }
   *   }
   * }
   */
  @Query(() => ServiceCategoryServicesEntity, { nullable: true })
  async getServiceCategoryServicesBySlug(
    @Args()
    {
      slug,
      language,
      page,
      pageSize,
      isActive,
    }: GetServiceCategoryServicesBySlugArgs,
    @Context() context: GraphQLContext,
    @CurrentSeller() currentSellerId?: string,
  ) {
    this.logger.debug(
      `Query: getServiceCategoryServicesBySlug(${slug}, ${language}, page: ${page}, pageSize: ${pageSize})`,
    );

    // Override context language so nested field resolvers (e.g. sub category
    // translations) use the same language the client explicitly requested.
    context.language = language;

    return this.serviceCategoryService.getServiceCategoryServicesBySlug({
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
   * Resolves the translation field for a service category using DataLoader.
   * Returns a SINGLE translation object based on the current language.
   */
  @ResolveField(() => ServiceCategoryTranslationEntity, { nullable: true })
  async translation(
    @Parent() serviceCategory: ServiceCategory,
    @Context() context: GraphQLContext,
  ): Promise<ServiceCategoryTranslation | null> {
    const language = context.language;

    this.logger.debug(
      `ResolveField: ServiceCategory.translation(id: ${serviceCategory.id}, language: ${language})`,
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
   * Resolves the subcategories field for a service category using DataLoader.
   * Returns an array of sub categories for this service category.
   */
  @ResolveField(() => [ServiceSubCategoryEntity])
  async subcategories(
    @Parent() serviceCategory: ServiceCategory,
    @Context() context: GraphQLContext,
  ): Promise<ServiceSubCategory[]> {
    const language = context.language;

    this.logger.debug(
      `ResolveField: ServiceCategory.subcategories(id: ${serviceCategory.id})`,
    );

    const subCategories = await context.loaders.serviceSubCategories.load(
      serviceCategory.id,
    );

    // Prime the translation cache for all sub categories
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
   * Reference resolver for Apollo Federation.
   * Allows other subgraphs to resolve a ServiceCategory by ID.
   */
  @ResolveReference()
  async resolveReference(
    reference: { __typename: string; id: number },
    @Context() context: GraphQLContext,
  ): Promise<ServiceCategory | null> {
    this.logger.debug(`ResolveReference: ServiceCategory(id: ${reference.id})`);
    return context.loaders.serviceCategoryById.load(reference.id);
  }
}
