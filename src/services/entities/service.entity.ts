import { ObjectType, Field, ID, Int, Float, Directive } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { ServicePricing } from '../../graphql/enums/index.js';
import { ServiceSubCategory } from '../../catalog-v2/entities/index.js';
import { Seller } from './seller.entity.js';

@ObjectType()
@Directive('@key(fields: "id")')
export class Service {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  sellerId: string;

  @Field(() => Int)
  subcategoryId: number;

  @Field(() => ServicePricing)
  pricingType: ServicePricing;

  @Field(() => Float, { nullable: true })
  basePrice?: number;

  @Field(() => String, { nullable: true })
  priceRange?: string;

  @Field(() => Int, { nullable: true })
  duration?: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => [String])
  images: string[];

  @Field(() => [String])
  tags: string[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;

  // Availability and scheduling
  @Field(() => GraphQLJSON, { nullable: true })
  availabilitySchedule?: any;

  @Field(() => Boolean, { nullable: true })
  isCurrentlyAvailable?: boolean;

  @Field(() => Int, { nullable: true })
  maxConcurrentBookings?: number;

  @Field(() => Int, { nullable: true })
  advanceBookingDays?: number;

  // Location
  @Field(() => Int, { nullable: true })
  serviceRadius?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  serviceLocations?: any;

  @Field(() => Boolean, { nullable: true })
  isRemoteService?: boolean;

  // Relations
  @Field(() => ServiceSubCategory, { nullable: true })
  serviceCategory?: ServiceSubCategory;

  @Field(() => Seller, { nullable: true })
  seller?: Seller;

  // Computed fields
  @Field(() => Float, { nullable: true })
  averageRating?: number;

  @Field(() => Int)
  reviewCount: number;

  @Field(() => Int, { nullable: true })
  viewCount?: number;
}
