import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Language } from '@prisma/client';
import { PageInfo } from '../../catalog-v2/entities/page-info.entity.js';

/**
 * Raw, admin-only views of the service catalog tables.
 *
 * Unlike the web-facing `catalog-v2` entities (single active-language
 * `translation` field, active rows only), these return each row exactly as
 * stored — every translation, all meta fields, inactive rows included — so the
 * admin panel can drive CRUD screens and XLSX export/import directly.
 *
 * ObjectType names are `Admin*`-prefixed to stay unique in the federated
 * supergraph.
 */

@ObjectType('AdminServiceCategoryTranslation')
export class AdminServiceCategoryTranslationEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  serviceCategoryId: number;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  category: string;

  @Field(() => String)
  slug: string;

  @Field(() => String, { nullable: true })
  href?: string | null;

  @Field(() => String, { nullable: true })
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  metaDescription?: string | null;

  @Field(() => [String])
  metaKeywords: string[];
}

@ObjectType('AdminServiceCategory')
export class AdminServiceCategoryEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Date, { nullable: true })
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  featuredUntil?: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [AdminServiceCategoryTranslationEntity])
  translations: AdminServiceCategoryTranslationEntity[];
}

@ObjectType('AdminServiceSubCategoryTranslation')
export class AdminServiceSubCategoryTranslationEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  serviceSubCategoryId: number;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  subCategory: string;

  @Field(() => String)
  slug: string;

  @Field(() => String, { nullable: true })
  href?: string | null;

  @Field(() => String, { nullable: true })
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  metaDescription?: string | null;

  @Field(() => [String])
  metaKeywords: string[];
}

@ObjectType('AdminServiceSubCategory')
export class AdminServiceSubCategoryEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  serviceCategoryId: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Date, { nullable: true })
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  featuredUntil?: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [AdminServiceSubCategoryTranslationEntity])
  translations: AdminServiceSubCategoryTranslationEntity[];
}

// ─── Connections ──────────────────────────────────────────────────────────────

@ObjectType('AdminServiceCategoryConnection')
export class AdminServiceCategoryConnectionEntity {
  @Field(() => [AdminServiceCategoryEntity])
  nodes: AdminServiceCategoryEntity[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType('AdminServiceSubCategoryConnection')
export class AdminServiceSubCategoryConnectionEntity {
  @Field(() => [AdminServiceSubCategoryEntity])
  nodes: AdminServiceSubCategoryEntity[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

// ─── Bulk upsert result ───────────────────────────────────────────────────────

/**
 * Per-row failure inside a bulk upsert. `index` is the 0-based position of the
 * offending row in the submitted array so the admin panel can point at the
 * exact spreadsheet line.
 */
@ObjectType('ServiceBulkRowError')
export class BulkRowErrorEntity {
  @Field(() => Int)
  index: number;

  @Field(() => Int, { nullable: true })
  id?: number | null;

  @Field(() => String)
  message: string;
}

/**
 * Outcome of a bulk upsert. Rows are processed independently: one bad row is
 * reported in `errors` without aborting the rest of the batch.
 */
@ObjectType('ServiceBulkUpsertResult')
export class BulkUpsertResultEntity {
  @Field(() => Int)
  created: number;

  @Field(() => [Int], {
    description: 'ids of the rows created by this batch, in submission order',
  })
  createdIds: number[];

  @Field(() => Int)
  updated: number;

  @Field(() => Int)
  failed: number;

  @Field(() => [BulkRowErrorEntity])
  errors: BulkRowErrorEntity[];
}
