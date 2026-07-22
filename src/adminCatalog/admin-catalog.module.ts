import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import { AdminCatalogResolver } from './resolvers/index.js';

/**
 * Admin Service Catalog Module
 *
 * Platform-admin CRUD surface over the service category tables (service
 * categories, service sub categories and their translations): raw paginated
 * reads, bulk upserts for XLSX import / row-by-row editing, and per-row deletes.
 *
 * Kept separate from the web-facing subdomain modules so the browsing queries
 * stay lean and the admin surface can grow independently.
 */
@Module({
  imports: [PrismaModule],
  providers: [AdminCatalogService, AdminCatalogResolver],
  exports: [AdminCatalogService],
})
export class AdminCatalogModule {}
