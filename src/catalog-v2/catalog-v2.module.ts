import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';

// I18n
import { I18nService } from '../common/i18n/index.js';

// Repositories
import {
  ServiceCategoryRepository,
  ServiceSubCategoryRepository,
} from '../repositories/index.js';

// Services
import { ServiceCatalogService } from './catalog.service.js';
import { ServiceCategoryService } from './service-category.service.js';
import { ServiceSubCategoryService } from './service-subcategory.service.js';

// Resolvers
import { ServiceCatalogResolver } from './catalog.resolver.js';
import { ServiceCategoryResolver } from '../resolvers/service-category.resolver.js';
import { ServiceSubCategoryResolver } from '../resolvers/service-subcategory.resolver.js';

@Module({
  imports: [PrismaModule],
  providers: [
    // I18n
    I18nService,
    // Repositories
    ServiceCategoryRepository,
    ServiceSubCategoryRepository,
    // Services
    ServiceCatalogService,
    ServiceCategoryService,
    ServiceSubCategoryService,
    // Resolvers
    ServiceCatalogResolver,
    ServiceCategoryResolver,
    ServiceSubCategoryResolver,
  ],
  exports: [
    I18nService,
    ServiceCategoryRepository,
    ServiceSubCategoryRepository,
    ServiceCatalogService,
    ServiceCategoryService,
    ServiceSubCategoryService,
  ],
})
export class CatalogV2Module {}
