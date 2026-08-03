import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { ServicePricing } from '../../graphql/enums/index.js';
import { PageInfo } from '../../catalog-v2/entities/page-info.entity.js';

/**
 * Raw, admin-only views of the Service table and its ServiceMedia / ServiceFAQ
 * sub-rows.
 *
 * Unlike the web-facing Service entity, these return rows exactly as stored —
 * inactive included, no seller scoping — so the admin panel can list, correct
 * and export the whole catalog. Names are `Admin*`-prefixed to stay distinct
 * from the federated `Service` entity. Metrics (averageRating/viewCount) and
 * timestamps are read-only. The JSON scheduling columns
 * (availabilitySchedule / serviceLocations) are intentionally not exposed here —
 * they are edited through the seller app, and left untouched by admin upserts.
 */
@ObjectType('AdminService')
export class RawServiceEntity {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String)
  sellerId: string;

  @Field(() => ServicePricing)
  pricingType: ServicePricing;

  @Field(() => Float, { nullable: true })
  basePrice?: number | null;

  @Field(() => String, { nullable: true })
  priceRange?: string | null;

  @Field(() => Int, { nullable: true })
  duration?: number | null;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => [String])
  images: string[];

  @Field(() => [String])
  tags: string[];

  @Field(() => Int)
  subcategoryId: number;

  @Field(() => Int, { nullable: true })
  maxConcurrentBookings?: number | null;

  @Field(() => Int, { nullable: true })
  advanceBookingDays?: number | null;

  @Field(() => Int, { nullable: true })
  serviceRadius?: number | null;

  @Field(() => Boolean, { nullable: true })
  isRemoteService?: boolean | null;

  @Field(() => Boolean, { nullable: true })
  isCurrentlyAvailable?: boolean | null;

  // Metrics (read-only)
  @Field(() => Float, { nullable: true })
  averageRating?: number | null;

  @Field(() => Int)
  viewCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [RawServiceMediaEntity])
  serviceMedia: RawServiceMediaEntity[];

  @Field(() => [RawServiceFaqEntity])
  serviceFAQ: RawServiceFaqEntity[];
}

@ObjectType('AdminServiceMedia')
export class RawServiceMediaEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  serviceId: number;

  @Field(() => String)
  mediaType: string;

  @Field(() => String)
  url: string;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Int)
  displayOrder: number;

  @Field(() => Boolean)
  isPortfolio: boolean;

  @Field(() => Boolean)
  isCertificate: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType('AdminServiceFAQ')
export class RawServiceFaqEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int, { nullable: true })
  serviceId?: number | null;

  @Field(() => Int, { nullable: true })
  subcategoryId?: number | null;

  @Field(() => String)
  question: string;

  @Field(() => String)
  answer: string;

  @Field(() => Int)
  displayOrder: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

// ─── Connections ──────────────────────────────────────────────────────────────

@ObjectType('AdminServiceConnection')
export class RawServiceConnectionEntity {
  @Field(() => [RawServiceEntity])
  nodes: RawServiceEntity[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
