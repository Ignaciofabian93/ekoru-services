import { Resolver, Query, Args, Int, ID } from '@nestjs/graphql';
import { ServiceCatalogService } from './catalog.service.js';
import {
  ServiceCategory,
  ServiceSubCategory,
  ServiceSubCategoryConnection,
} from './entities/index.js';
import { Language } from '@prisma/client';

@Resolver()
export class ServiceCatalogResolver {
  constructor(private readonly catalogService: ServiceCatalogService) {}

  @Query(() => [ServiceCategory], {
    name: 'serviceCatalog',
    nullable: true,
  })
  async getServiceCatalog(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.catalogService.getServiceCatalog(language);
  }

  @Query(() => [ServiceCategory], { name: 'serviceCategories', nullable: true })
  async getServiceCategories() {
    return this.catalogService.getServiceCategories();
  }

  @Query(() => ServiceCategory, {
    name: 'getServiceCategory',
    nullable: true,
  })
  async getServiceCategory(@Args('id', { type: () => ID }) id: string) {
    return this.catalogService.getServiceCategory(parseInt(id, 10));
  }

  @Query(() => ServiceSubCategoryConnection, {
    name: 'getServiceSubCategories',
  })
  async getServiceSubCategories(
    @Args('serviceCategoryId', { type: () => ID }) serviceCategoryId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
  ) {
    return this.catalogService.getServiceSubCategories(
      parseInt(serviceCategoryId, 10),
      page,
      pageSize,
    );
  }

  @Query(() => ServiceSubCategory, {
    name: 'getServiceSubCategory',
    nullable: true,
  })
  async getServiceSubCategory(@Args('id', { type: () => ID }) id: string) {
    return this.catalogService.getServiceSubCategory(parseInt(id, 10));
  }
}
