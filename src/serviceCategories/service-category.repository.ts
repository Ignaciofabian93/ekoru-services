import { Injectable, Logger } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  createServiceCategoryTranslationLoader,
  createServiceCategoryByIdLoader,
} from './dataloaders/index.js';
import type {
  ServiceCategory,
  ServiceCategoryTranslation,
} from '../types/service-category.js';
import type { Language } from '@prisma/client';

/**
 * Service Category Repository - Handles data loading for service categories and their translations
 *
 * This repository implements the DataLoader pattern to efficiently batch and cache
 * database queries for service categories and their translations, preventing N+1 query problems.
 */
@Injectable()
export class ServiceCategoryRepository {
  private readonly logger = new Logger(ServiceCategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a DataLoader for service category translations with composite key (id + language)
   */
  createTranslationLoader(): DataLoader<
    string,
    ServiceCategoryTranslation | null
  > {
    return createServiceCategoryTranslationLoader(this.prisma);
  }

  /**
   * Creates a DataLoader for service categories by ID
   */
  createServiceCategoryLoader(): DataLoader<number, ServiceCategory | null> {
    return createServiceCategoryByIdLoader(this.prisma);
  }

  /**
   * Finds a service category by slug and language (web browsing)
   *
   * @example
   * const serviceCategory = await findBySlug('diseno-grafico', Language.ES);
   */
  async findBySlug(
    slug: string,
    language: Language,
  ): Promise<ServiceCategory | null> {
    try {
      const translation =
        await this.prisma.serviceCategoryTranslation.findUnique({
          where: {
            slug_language: {
              slug,
              language,
            },
          },
          include: {
            serviceCategory: true,
          },
        });

      return translation?.serviceCategory || null;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error finding service category by slug: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Finds a service category by its ID (admin panel)
   */
  async findById(id: number): Promise<ServiceCategory | null> {
    try {
      return await this.prisma.serviceCategory.findUnique({
        where: { id },
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error finding service category by id: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Finds all active service categories with page-based pagination
   *
   * @param {number} page - 1-based page number
   * @param {number} pageSize - Number of service categories per page
   */
  async findAll(page: number, pageSize: number): Promise<ServiceCategory[]> {
    try {
      return await this.prisma.serviceCategory.findMany({
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
        `Error finding all service categories: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Gets a single translation for a service category using DataLoader
   */
  async getTranslation(
    loader: DataLoader<string, ServiceCategoryTranslation | null>,
    serviceCategoryId: number,
    language: Language,
  ): Promise<ServiceCategoryTranslation | null> {
    const key = `${serviceCategoryId}:${language}`;
    return loader.load(key);
  }

  /**
   * Primes the DataLoader cache with translations for multiple service categories
   * Useful for warming up the cache before resolving nested fields
   */
  async primeTranslations(
    loader: DataLoader<string, ServiceCategoryTranslation | null>,
    serviceCategoryIds: number[],
    language: Language,
  ): Promise<void> {
    const keys = serviceCategoryIds.map((id) => `${id}:${language}`);
    await loader.loadMany(keys);
  }
}
