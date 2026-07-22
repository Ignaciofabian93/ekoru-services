import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { CurrentAdmin } from '../../common/decorators/index.js';
import {
  AdminServiceCategoryConnectionEntity,
  AdminServiceSubCategoryConnectionEntity,
  BulkUpsertResultEntity,
} from '../entities/index.js';
import {
  RawCatalogListArgs,
  RawServiceSubCategoriesArgs,
  ServiceCategoryUpsertRowInput,
  ServiceCategoryTranslationUpsertRowInput,
  ServiceSubCategoryUpsertRowInput,
  ServiceSubCategoryTranslationUpsertRowInput,
} from '../dto/index.js';
import { AdminCatalogService } from '../admin-catalog.service.js';

/**
 * Admin Service Catalog GraphQL Resolver
 *
 * Platform-admin surface over the service category tables. Every operation
 * requires the x-admin-id header set by the gateway; anonymous or seller
 * traffic is rejected by the service.
 *
 * Reads (`rawService*`) return rows exactly as stored so the admin panel can
 * list, edit and export them. Writes are bulk upserts shared by the XLSX import
 * and the row-by-row edit forms (a single-row array), plus per-row deletes.
 */
@Resolver()
export class AdminCatalogResolver {
  private readonly logger = new Logger(AdminCatalogResolver.name);

  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  // ─── Raw reads ──────────────────────────────────────────────────────────────

  @Query(() => AdminServiceCategoryConnectionEntity, {
    name: 'rawServiceCategories',
    description:
      'Paginated, unprocessed service categories with every translation. Admins only.',
  })
  async getRawServiceCategories(
    @Args() { id, page, pageSize, search }: RawCatalogListArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: rawServiceCategories(page: ${page})`);
    return this.adminCatalogService.getRawServiceCategories({
      adminId,
      id,
      page,
      pageSize,
      search,
    });
  }

  @Query(() => AdminServiceSubCategoryConnectionEntity, {
    name: 'rawServiceSubCategories',
    description:
      'Paginated, unprocessed service sub categories with every translation. ' +
      'Optionally filtered by serviceCategoryId. Admins only.',
  })
  async getRawServiceSubCategories(
    @Args()
    {
      id,
      page,
      pageSize,
      search,
      serviceCategoryId,
    }: RawServiceSubCategoriesArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: rawServiceSubCategories(page: ${page})`);
    return this.adminCatalogService.getRawServiceSubCategories({
      adminId,
      id,
      page,
      pageSize,
      search,
      serviceCategoryId,
    });
  }

  // ─── Bulk upserts ───────────────────────────────────────────────────────────

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates (rows without id) or updates (rows with id) service categories. Admins only.',
  })
  async bulkUpsertServiceCategories(
    @Args('rows', { type: () => [ServiceCategoryUpsertRowInput] })
    rows: ServiceCategoryUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertServiceCategories(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertServiceCategories({
      adminId,
      rows,
    });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates or updates service category translations. Rows without id are ' +
      'matched by (serviceCategoryId, language). Admins only.',
  })
  async bulkUpsertServiceCategoryTranslations(
    @Args('rows', { type: () => [ServiceCategoryTranslationUpsertRowInput] })
    rows: ServiceCategoryTranslationUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertServiceCategoryTranslations(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertServiceCategoryTranslations({
      adminId,
      rows,
    });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates (rows without id) or updates (rows with id) service sub ' +
      'categories. Setting serviceCategoryId re-parents a sub category. Admins only.',
  })
  async bulkUpsertServiceSubCategories(
    @Args('rows', { type: () => [ServiceSubCategoryUpsertRowInput] })
    rows: ServiceSubCategoryUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertServiceSubCategories(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertServiceSubCategories({
      adminId,
      rows,
    });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates or updates service sub category translations. Rows without id ' +
      'are matched by (serviceSubCategoryId, language). Admins only.',
  })
  async bulkUpsertServiceSubCategoryTranslations(
    @Args('rows', {
      type: () => [ServiceSubCategoryTranslationUpsertRowInput],
    })
    rows: ServiceSubCategoryTranslationUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertServiceSubCategoryTranslations(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertServiceSubCategoryTranslations({
      adminId,
      rows,
    });
  }

  // ─── Deletes ────────────────────────────────────────────────────────────────

  @Mutation(() => Boolean, {
    description:
      'Deletes a service category (translations cascade; fails while sub ' +
      'categories reference it). Admins only.',
  })
  async deleteServiceCategory(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteServiceCategory(${id})`);
    return this.adminCatalogService.deleteServiceCategory({ adminId, id });
  }

  @Mutation(() => Boolean, {
    description:
      'Deletes a single service category translation row. Admins only.',
  })
  async deleteServiceCategoryTranslation(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteServiceCategoryTranslation(${id})`);
    return this.adminCatalogService.deleteServiceCategoryTranslation({
      adminId,
      id,
    });
  }

  @Mutation(() => Boolean, {
    description:
      'Deletes a service sub category (translations cascade; fails while ' +
      'services reference it). Admins only.',
  })
  async deleteServiceSubCategory(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteServiceSubCategory(${id})`);
    return this.adminCatalogService.deleteServiceSubCategory({ adminId, id });
  }

  @Mutation(() => Boolean, {
    description:
      'Deletes a single service sub category translation row. Admins only.',
  })
  async deleteServiceSubCategoryTranslation(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteServiceSubCategoryTranslation(${id})`);
    return this.adminCatalogService.deleteServiceSubCategoryTranslation({
      adminId,
      id,
    });
  }
}
