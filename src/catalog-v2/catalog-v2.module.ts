import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';

// I18n
import { I18nService } from '../common/i18n/index.js';

// Services
import { ServiceCatalogService } from './catalog.service.js';

// Resolvers
import { ServiceCatalogResolver } from './catalog.resolver.js';

/**
 * Catalog Module - Service catalog (web menu) queries only
 *
 * This module is concerned exclusively with catalog queries such as
 * getServiceCatalog, which returns the list of service categories with nested
 * sub categories used by the web menu.
 *
 * Service category and service sub category queries live in their own subdomain
 * modules (ServiceCategoriesModule, ServiceSubCategoriesModule).
 */
@Module({
  imports: [PrismaModule],
  providers: [
    // I18N (also used by the GraphQL context factory to parse Accept-Language)
    I18nService,

    // Catalog
    ServiceCatalogService,
    ServiceCatalogResolver,
  ],
  exports: [I18nService, ServiceCatalogService],
})
export class CatalogV2Module {}
