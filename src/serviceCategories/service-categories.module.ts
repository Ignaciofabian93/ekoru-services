import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ServicesModule } from '../services/services.module.js';
import { ServiceCategoryRepository } from './service-category.repository.js';
import { ServiceCategoryService } from './service-category.service.js';
import { ServiceCategoryResolver } from './resolvers/index.js';
import { I18nServiceCategoryService } from './i18n/index.js';

/**
 * Service Categories Module
 *
 * Self-contained subdomain module for service categories:
 * - Repository layer with DataLoader pattern for N+1 prevention
 * - Service layer with business logic (by id for admin, by slug for web,
 *   plus combined service category + services queries)
 * - GraphQL resolver with field-level resolution
 * - Subdomain-scoped I18N service
 */
@Module({
  imports: [PrismaModule, ServicesModule],
  providers: [
    I18nServiceCategoryService,
    ServiceCategoryRepository,
    ServiceCategoryService,
    ServiceCategoryResolver,
  ],
  exports: [
    I18nServiceCategoryService,
    ServiceCategoryRepository,
    ServiceCategoryService,
  ],
})
export class ServiceCategoriesModule {}
