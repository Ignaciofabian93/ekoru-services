import { InputType, Field, Int, Float } from '@nestjs/graphql';
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
import { ServicePricing } from '../../graphql/enums/index.js';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class AddServiceInput {
  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int)
  @IsInt()
  subcategoryId: number;

  @Field(() => ServicePricing)
  @IsEnum(ServicePricing)
  pricingType: ServicePricing;

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

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @Field(() => String)
  @IsString()
  sellerId: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Availability and scheduling
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsJSON()
  availabilitySchedule?: any; // {mon: "9-5", tue: "9-5", ...}

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
  serviceLocations?: any; // [{address, lat, lng, ...}]

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isRemoteService?: boolean;
}
