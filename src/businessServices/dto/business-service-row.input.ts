import { InputType, Field, Int, Float } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ServicePricing } from '../../graphql/enums/index.js';

/**
 * One line of a business's services spreadsheet (ADM-16). The fields a
 * provider sets on the web when it publishes, and nothing else: never the
 * seller (always the caller), ratings or views. The weekly schedule and the
 * service areas stay on the web.
 *
 * - no `id` → a new service: name, subcategoryId and pricingType are
 *   required, and a price unless it is quoted;
 * - `id` → one of the provider's own services: only the sent fields change.
 */
@InputType()
export class BusinessServiceRowInput {
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
  @IsString()
  description?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  subcategoryId?: number;

  @Field(() => ServicePricing, { nullable: true })
  @IsOptional()
  @IsEnum(ServicePricing)
  pricingType?: ServicePricing;

  @Field(() => Float, { nullable: true, description: 'Price in whole pesos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  priceRange?: string | null;

  @Field(() => Int, { nullable: true, description: 'Minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number | null;

  @Field(() => [String], {
    nullable: true,
    description:
      "Photos already on EKORU's image hosts (the export carries them).",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isRemoteService?: boolean;

  @Field(() => Int, { nullable: true, description: 'Kilometres' })
  @IsOptional()
  @IsInt()
  @Min(0)
  serviceRadius?: number | null;
}
