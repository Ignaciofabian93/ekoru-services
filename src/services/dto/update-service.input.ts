import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsArray,
  IsBoolean,
  IsEnum,
  IsJSON,
} from 'class-validator';
import { GraphQLJSON } from 'graphql-scalars';
import { ServicePricing } from '../../graphql/enums/index.js';

@InputType()
export class UpdateServiceInput {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  subcategoryId?: number;

  @Field(() => ServicePricing, { nullable: true })
  @IsOptional()
  @IsEnum(ServicePricing)
  pricingType?: ServicePricing;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  priceRange?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  duration?: number;

  @Field(() => [String], { nullable: true })
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

  // Availability and scheduling
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsJSON()
  availabilitySchedule?: any;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isCurrentlyAvailable?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  maxConcurrentBookings?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  advanceBookingDays?: number;

  // Location
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  serviceRadius?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsJSON()
  serviceLocations?: any;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isRemoteService?: boolean;
}
