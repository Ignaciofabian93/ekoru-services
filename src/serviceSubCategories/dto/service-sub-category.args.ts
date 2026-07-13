import { ArgsType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Language } from '@prisma/client';

/**
 * Args for listing service sub categories with page-based pagination.
 */
@ArgsType()
export class GetServiceSubCategoriesArgs {
  @Field(() => Int, { defaultValue: 1, description: 'Page number (1-based)' })
  @IsInt()
  page: number;

  @Field(() => Int, { defaultValue: 20, description: 'Items per page' })
  @IsInt()
  pageSize: number;

  @Field(() => Language, { defaultValue: Language.ES })
  @IsEnum(Language)
  language: Language;
}

/**
 * Args for fetching a single service sub category by ID (admin panel).
 */
@ArgsType()
export class GetServiceSubCategoryByIdArgs {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field(() => Language, { defaultValue: Language.ES })
  @IsEnum(Language)
  language: Language;
}

/**
 * Args for fetching a single service sub category by slug (web browsing).
 */
@ArgsType()
export class GetServiceSubCategoryBySlugArgs {
  @Field(() => String)
  @IsString()
  slug: string;

  @Field(() => Language, { defaultValue: Language.ES })
  @IsEnum(Language)
  language: Language;
}

/**
 * Args for fetching the paginated services of a service sub category by slug.
 */
@ArgsType()
export class GetServiceSubCategoryServicesBySlugArgs extends GetServiceSubCategoryBySlugArgs {
  @Field(() => Int, { defaultValue: 1, description: 'Page number (1-based)' })
  @IsInt()
  page: number;

  @Field(() => Int, { defaultValue: 20, description: 'Items per page' })
  @IsInt()
  pageSize: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
