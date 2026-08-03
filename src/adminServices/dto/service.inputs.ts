import { ArgsType, Field, InputType, Int, Float } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ServicePricing } from '../../graphql/enums/index.js';

/**
 * Admin service inputs.
 *
 * The bulk upserts follow the shared catalog contract:
 * - `id` present → update that row (only the provided fields change)
 * - no `id`      → create (the listed fields are required)
 *
 * Omitted fields are left untouched on update; explicit `null` clears a
 * nullable column. Metrics, timestamps and the JSON scheduling columns are not
 * editable here.
 */

@ArgsType()
export class RawServiceListArgs {
  @Field(() => Int, {
    nullable: true,
    description: 'Fetch a single row by id (edit screen)',
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
    description: 'Filters services whose name contains this text',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => Int, { nullable: true, description: 'Filter by sub category' })
  @IsOptional()
  @IsInt()
  subcategoryId?: number;

  @Field(() => String, { nullable: true, description: 'Filter by seller' })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Filter by active flag (omitted → all)',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class ServiceUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Owner seller. Required when creating (no id).',
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field(() => ServicePricing, { nullable: true })
  @IsOptional()
  @IsEnum(ServicePricing)
  pricingType?: ServicePricing;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  basePrice?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  priceRange?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  duration?: number | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  images?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @Field(() => Int, {
    nullable: true,
    description:
      'Parent sub category. Required when creating; on update it re-parents.',
  })
  @IsOptional()
  @IsInt()
  subcategoryId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  maxConcurrentBookings?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  advanceBookingDays?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  serviceRadius?: number | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isRemoteService?: boolean | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isCurrentlyAvailable?: boolean | null;
}

@InputType()
export class ServiceMediaUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Owner service. Required when creating (no id).',
  })
  @IsOptional()
  @IsInt()
  serviceId?: number;

  @Field(() => String, {
    nullable: true,
    description: 'e.g. "image" | "video" | "document". Required when creating.',
  })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  title?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isPortfolio?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isCertificate?: boolean;
}

@InputType()
export class ServiceFaqUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Owner service (FAQ may attach to a service or a subcategory).',
  })
  @IsOptional()
  @IsInt()
  serviceId?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  subcategoryId?: number | null;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  question?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  answer?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
