import { Injectable, Logger } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  createServiceSubCategoryTranslationLoader,
  createServiceSubCategoriesByServiceCategoryLoader,
  createServiceSubCategoryByIdLoader,
} from './dataloaders/index.js';
import type {
  ServiceSubCategory,
  ServiceSubCategoryTranslation,
} from '../types/service-subcategory.js';
import type { Language } from '@prisma/client';

/**
 * Service Sub Category Repository - Handles data loading for service sub categories and their translations
 *
 * This repository implements the DataLoader pattern to efficiently batch and cache
 * database queries for service sub categories and their translations.
 */
@Injectable()
export class ServiceSubCategoryRepository {
  private readonly logger = new Logger(ServiceSubCategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a DataLoader for service sub category translations with composite key (id + language)
   */
  createTranslationLoader(): DataLoader<
    string,
    ServiceSubCategoryTranslation | null
  > {
    return createServiceSubCategoryTranslationLoader(this.prisma);
  }

  /**
   * Creates a DataLoader for service sub categories by service category ID
   */
  createServiceSubCategoryByCategoryLoader(): DataLoader<
    number,
    ServiceSubCategory[]
  > {
    return createServiceSubCategoriesByServiceCategoryLoader(this.prisma);
  }

  /**
   * Creates a DataLoader for service sub categories by their own ID.
   *
   * Batches the per-service `Service.serviceCategory` lookups on a grid into a
   * single query, keeping the field resolver free of N+1.
   */
  createServiceSubCategoryByIdLoader(): DataLoader<
    number,
    ServiceSubCategory | null
  > {
    return createServiceSubCategoryByIdLoader(this.prisma);
  }

  /**
   * Finds a service sub category by slug and language (web browsing)
   *
   * @example
   * const subCategory = await findBySlug('fotografia-bodas', Language.ES);
   */
  async findBySlug(
    slug: string,
    language: Language,
  ): Promise<ServiceSubCategory | null> {
    try {
      const translation =
        await this.prisma.serviceSubCategoryTranslation.findUnique({
          where: {
            slug_language: {
              slug,
              language,
            },
          },
          include: {
            serviceSubCategory: true,
          },
        });

      return translation?.serviceSubCategory || null;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error finding service sub category by slug: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Finds a service sub category by its ID (admin panel)
   */
  async findById(id: number): Promise<ServiceSubCategory | null> {
    try {
      return await this.prisma.serviceSubCategory.findUnique({
        where: { id },
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error finding service sub category by id: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Finds all active service sub categories with page-based pagination
   *
   * @param {number} page - 1-based page number
   * @param {number} pageSize - Number of service sub categories per page
   */
  async findAll(page: number, pageSize: number): Promise<ServiceSubCategory[]> {
    try {
      return await this.prisma.serviceSubCategory.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error finding all service sub categories: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Finds all service sub categories for a specific service category
   */
  async findByServiceCategoryId(
    serviceCategoryId: number,
  ): Promise<ServiceSubCategory[]> {
    try {
      return await this.prisma.serviceSubCategory.findMany({
        where: {
          serviceCategoryId,
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error finding service sub categories by service category: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Gets a single translation for a service sub category using DataLoader
   */
  async getTranslation(
    loader: DataLoader<string, ServiceSubCategoryTranslation | null>,
    serviceSubCategoryId: number,
    language: Language,
  ): Promise<ServiceSubCategoryTranslation | null> {
    const key = `${serviceSubCategoryId}:${language}`;
    return loader.load(key);
  }

  /**
   * Primes the DataLoader cache with translations for multiple service sub categories
   */
  async primeTranslations(
    loader: DataLoader<string, ServiceSubCategoryTranslation | null>,
    serviceSubCategoryIds: number[],
    language: Language,
  ): Promise<void> {
    const keys = serviceSubCategoryIds.map((id) => `${id}:${language}`);
    await loader.loadMany(keys);
  }
}
