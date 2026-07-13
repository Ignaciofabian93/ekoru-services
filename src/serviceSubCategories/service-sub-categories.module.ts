import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ServicesModule } from '../services/services.module.js';
import { ServiceSubCategoryRepository } from './service-sub-category.repository.js';
import { ServiceSubCategoryService } from './service-sub-category.service.js';
import { ServiceSubCategoryResolver } from './resolvers/index.js';
import { I18nServiceSubCategoryService } from './i18n/index.js';

/**
 * Service Sub Categories Module
 *
 * Self-contained subdomain module for service sub categories:
 * - Repository layer with DataLoader pattern for N+1 prevention
 * - Service layer with business logic (by id for admin, by slug for web,
 *   plus combined sub category + services queries)
 * - GraphQL resolver with field-level resolution
 * - Subdomain-scoped I18N service
 */
@Module({
  imports: [PrismaModule, ServicesModule],
  providers: [
    I18nServiceSubCategoryService,
    ServiceSubCategoryRepository,
    ServiceSubCategoryService,
    ServiceSubCategoryResolver,
  ],
  exports: [
    I18nServiceSubCategoryService,
    ServiceSubCategoryRepository,
    ServiceSubCategoryService,
  ],
})
export class ServiceSubCategoriesModule {}
