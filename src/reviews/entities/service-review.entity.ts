import { ObjectType, Field, ID, Int, Directive } from "@nestjs/graphql";
import { Seller } from "../../services/entities/index.js";
import { Service } from "../../services/entities/index.js";

@ObjectType()
@Directive('@key(fields: "id")')
export class ServiceReview {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  serviceId: number;

  @Field(() => String)
  reviewerId: string;

  @Field(() => Int)
  rating: number;

  @Field(() => String, { nullable: true })
  comment?: string;

  @Field(() => Date)
  createdAt: Date;

  // Verification
  @Field(() => Int, { nullable: true })
  quotationId?: number;

  @Field(() => Int, { nullable: true })
  bookingId?: number;

  @Field(() => Boolean, { nullable: true })
  isVerifiedPurchase?: boolean;

  // Review quality
  @Field(() => Int, { nullable: true })
  helpfulCount?: number;

  @Field(() => Int, { nullable: true })
  reportCount?: number;

  // Provider response
  @Field(() => String, { nullable: true })
  providerResponse?: string;

  @Field(() => Date, { nullable: true })
  providerResponseAt?: Date;

  // Relations
  @Field(() => Service, { nullable: true })
  service?: Service;

  @Field(() => Seller, { nullable: true })
  reviewer?: Seller;
}
