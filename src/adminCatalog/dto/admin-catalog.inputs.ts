import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
// The subgraph's graphql/enums registers Language but does not re-export it;
// import the registered enum object from @prisma/client.
import { Language } from '@prisma/client';

/**
 * Admin service-catalog inputs.
 *
 * Every `*UpsertRowInput` follows the shared catalog contract:
 * - `id` present            → update that row (only the provided fields change)
 * - no `id`, translation row → upsert by its (parentId, language) unique key
 * - no `id`, base row        → create
 *
 * Omitted fields are left untouched on update; explicit `null` clears a
 * nullable column.
 */

// ─── Args shared by the raw list queries ─────────────────────────────────────

@ArgsType()
export class RawCatalogListArgs {
  @Field(() => Int, {
    nullable: true,
    description: 'Fetch a single row by id (edit screens)',
  })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, { defaultValue: 1, description: 'Page number (1-based)' })
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int, { defaultValue: 50, description: 'Items per page' })
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize: number;

  @Field(() => String, {
    nullable: true,
    description: 'Filters rows whose translation name contains this text',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

@ArgsType()
export class RawServiceSubCategoriesArgs extends RawCatalogListArgs {
  @Field(() => Int, {
    nullable: true,
    description: 'Filter by parent service category',
  })
  @IsOptional()
  @IsInt()
  serviceCategoryId?: number;
}

// ─── Service categories ────────────────────────────────────────────────────────

@InputType()
export class ServiceCategoryUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredUntil?: Date | null;
}

@InputType()
export class ServiceCategoryTranslationUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsInt()
  serviceCategoryId?: number;

  @Field(() => Language, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @Field(() => String, {
    nullable: true,
    description: 'Category display name. Required when creating (no id).',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  slug?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  href?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaDescription?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  metaKeywords?: string[];
}

// ─── Service sub categories ─────────────────────────────────────────────────────

@InputType()
export class ServiceSubCategoryUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Parent service category. Required when creating; on update it ' +
      're-parents the sub category (the fix for wrongly related rows)',
  })
  @IsOptional()
  @IsInt()
  serviceCategoryId?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredUntil?: Date | null;
}

@InputType()
export class ServiceSubCategoryTranslationUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsInt()
  serviceSubCategoryId?: number;

  @Field(() => Language, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @Field(() => String, {
    nullable: true,
    description: 'Sub category display name. Required when creating (no id).',
  })
  @IsOptional()
  @IsString()
  subCategory?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  slug?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  href?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaDescription?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  metaKeywords?: string[];
}
