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
 * Args for listing service categories with page-based pagination.
 */
@ArgsType()
export class GetServiceCategoriesArgs {
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
 * Args for fetching a single service category by ID (admin panel).
 */
@ArgsType()
export class GetServiceCategoryByIdArgs {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field(() => Language, { defaultValue: Language.ES })
  @IsEnum(Language)
  language: Language;
}

/**
 * Args for fetching a single service category by slug (web browsing).
 */
@ArgsType()
export class GetServiceCategoryBySlugArgs {
  @Field(() => String)
  @IsString()
  slug: string;

  @Field(() => Language, { defaultValue: Language.ES })
  @IsEnum(Language)
  language: Language;
}

/**
 * Args for fetching a service category together with its paginated services by ID (admin panel).
 */
@ArgsType()
export class GetServiceCategoryServicesByIdArgs extends GetServiceCategoryByIdArgs {
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

/**
 * Args for fetching a service category together with its paginated services by slug (web browsing).
 */
@ArgsType()
export class GetServiceCategoryServicesBySlugArgs extends GetServiceCategoryBySlugArgs {
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
