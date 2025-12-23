import { InputType, Field, Int, Float } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsJSON,
} from "class-validator";
import { ServicePricing } from "../../graphql/enums/index.js";
import { GraphQLJSON } from "graphql-scalars";

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
  @IsNumber()
  subcategoryId: number;

  @Field(() => ServicePricing)
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
  @IsNumber()
  duration?: number;

  @Field(() => [String])
  @IsArray()
  images: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
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
  @IsNumber()
  maxConcurrentBookings?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  advanceBookingDays?: number;

  // Location
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
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
