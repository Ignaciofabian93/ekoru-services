import { Resolver, Query, Args } from '@nestjs/graphql';
import { ServiceCatalogService } from './catalog.service.js';
import { ServiceCatalogItemEntity } from './entities/index.js';
import { Language } from '@prisma/client';

@Resolver()
export class ServiceCatalogResolver {
  constructor(private readonly catalogService: ServiceCatalogService) {}

  @Query(() => [ServiceCatalogItemEntity], {
    name: 'getServiceCatalog',
    description: 'Get the complete service catalog with sub-categories',
  })
  async getServiceCatalog(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.catalogService.getServiceCatalog(language);
  }
}
