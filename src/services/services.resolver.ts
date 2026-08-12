import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  ResolveField,
  ResolveReference,
  Parent,
  Context,
} from '@nestjs/graphql';
import { ServicesService } from './services.service.js';
import {
  Service,
  ServiceConnection,
  ServiceFaq,
  ServicePackage,
} from './entities/index.js';
import { ServiceSubCategory } from '../serviceSubCategories/entities/index.js';
import { AddServiceInput, UpdateServiceInput } from './dto/index.js';
import { ServicePricing } from '../graphql/enums/index.js';
import type { GraphQLContext } from '../types/index.js';

@Resolver(() => Service)
export class ServicesResolver {
  constructor(private readonly servicesService: ServicesService) {}

  @Query(() => Service, { name: 'getService', nullable: true })
  async getService(@Args('id', { type: () => ID }) id: string) {
    return this.servicesService.getService(parseInt(id, 10));
  }

  @Query(() => ServiceConnection, { name: 'getServices' })
  async getServices(
    @Context() ctx: GraphQLContext,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('isActive', { type: () => Boolean, nullable: true })
    isActive?: boolean,
  ) {
    return this.servicesService.getServices({
      page,
      pageSize,
      isActive,
      excludeSellerId: ctx.sellerId,
    });
  }

  @Query(() => ServiceConnection, { name: 'getServicesBySeller' })
  async getServicesBySeller(
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('isActive', { type: () => Boolean, nullable: true })
    isActive?: boolean,
  ) {
    return this.servicesService.getServicesBySeller({
      sellerId,
      page,
      pageSize,
      isActive,
    });
  }

  @Query(() => ServiceConnection, { name: 'getServicesBySubCategory' })
  async getServicesBySubCategory(
    @Args('subcategoryId', { type: () => ID }) subcategoryId: string,
    @Context() ctx: GraphQLContext,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('isActive', { type: () => Boolean, nullable: true })
    isActive?: boolean,
  ) {
    return this.servicesService.getServicesBySubCategory({
      subcategoryId: parseInt(subcategoryId, 10),
      page,
      pageSize,
      isActive,
      excludeSellerId: ctx.sellerId,
    });
  }

  @Query(() => ServiceConnection, { name: 'getServicesByPricingType' })
  async getServicesByPricingType(
    @Args('pricingType', { type: () => ServicePricing })
    pricingType: ServicePricing,
    @Context() ctx: GraphQLContext,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('isActive', { type: () => Boolean, nullable: true })
    isActive?: boolean,
  ) {
    return this.servicesService.getServicesByPricingType({
      pricingType,
      page,
      pageSize,
      isActive,
      excludeSellerId: ctx.sellerId,
    });
  }

  @Mutation(() => Service)
  async addService(@Args('input') input: AddServiceInput) {
    return this.servicesService.addService(input);
  }

  @Mutation(() => Service)
  async updateService(@Args('input') input: UpdateServiceInput) {
    return this.servicesService.updateService(input);
  }

  @Mutation(() => Service)
  async deleteService(@Args('id', { type: () => ID }) id: string) {
    return this.servicesService.deleteService(parseInt(id, 10));
  }

  @Mutation(() => Service)
  async toggleServiceActive(@Args('id', { type: () => ID }) id: string) {
    return this.servicesService.toggleServiceActive(parseInt(id, 10));
  }

  @Query(() => ServiceConnection, { name: 'getMyFavoriteServices' })
  async getMyFavoriteServices(
    @Context() ctx: GraphQLContext,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 12 }) pageSize: number,
  ) {
    return this.servicesService.getMyFavorites({
      sellerId: ctx.sellerId,
      page,
      pageSize,
    });
  }

  @Mutation(() => Service)
  async toggleServiceLike(
    @Args('serviceId', { type: () => ID }) serviceId: string,
    @Context() ctx: GraphQLContext,
  ) {
    return this.servicesService.toggleServiceLike({
      serviceId: parseInt(serviceId, 10),
      sellerId: ctx.sellerId,
    });
  }

  /**
   * Federation entity resolver: hydrates a Service that another subgraph
   * referenced by key alone (e.g. a hit from ekoru-search). Without it the
   * gateway can only hand back the id and every other field resolves to null.
   */
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.servicesService.getService(parseInt(String(reference.id), 10));
  }

  @ResolveField(() => Boolean, {
    description: 'Whether the current seller has favorited this service',
  })
  async isLiked(
    @Parent() service: Service,
    @Context() ctx: GraphQLContext,
  ): Promise<boolean> {
    return ctx.loaders.serviceLikedByMe.load(service.id);
  }

  /**
   * Resolves the service's sub-category. Batched by `subcategoryId` via a
   * DataLoader so a grid of services hits the DB once. Localized fields are
   * filled in by the `ServiceSubCategory.translation` field resolver.
   */
  @ResolveField(() => ServiceSubCategory, { nullable: true })
  async serviceCategory(
    @Parent() service: Service,
    @Context() ctx: GraphQLContext,
  ): Promise<ServiceSubCategory | null> {
    if (!service.subcategoryId) return null;
    return ctx.loaders.serviceSubCategoryById.load(service.subcategoryId);
  }
  /**
   * FAQs published for this service, active only and in display order. The
   * table also holds subcategory-level FAQs (`serviceId` null); those are not
   * this service's answers, so they are not mixed in here.
   */
  @ResolveField(() => [ServiceFaq])
  async faqs(@Parent() service: Service): Promise<ServiceFaq[]> {
    return this.servicesService.getServiceFaqs(service.id);
  }

  /**
   * Packages from this service's provider that include it. Packages belong to
   * the seller and reach services through their items, so a shopper looking at
   * one service sees the bundles it is part of.
   */
  @ResolveField(() => [ServicePackage])
  async packages(@Parent() service: Service): Promise<ServicePackage[]> {
    return this.servicesService.getServicePackagesForService(service.id);
  }
}
