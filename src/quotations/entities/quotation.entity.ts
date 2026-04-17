import { ObjectType, Field, ID, Int, Float, Directive } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { QuotationStatus } from '../../graphql/enums/index.js';
import { Seller } from '../../services/entities/index.js';
import { Service } from '../../services/entities/index.js';

@ObjectType()
@Directive('@key(fields: "id")')
export class Quotation {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  serviceId: number;

  @Field(() => String)
  clientId: string;

  @Field(() => String)
  providerId: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;

  @Field(() => Float, { nullable: true })
  estimatedPrice?: number;

  @Field(() => Float, { nullable: true })
  finalPrice?: number;

  @Field(() => Int, { nullable: true })
  estimatedDuration?: number;

  @Field(() => QuotationStatus)
  status: QuotationStatus;

  @Field(() => String, { nullable: true })
  clientNotes?: string;

  @Field(() => String, { nullable: true })
  providerNotes?: string;

  @Field(() => [String])
  attachments: string[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Date, { nullable: true })
  acceptedAt?: Date;

  @Field(() => Date, { nullable: true })
  completedAt?: Date;

  // Pricing breakdown
  @Field(() => GraphQLJSON, { nullable: true })
  priceBreakdown?: any;

  @Field(() => Float, { nullable: true })
  depositAmount?: number;

  @Field(() => Boolean, { nullable: true })
  depositPaid?: boolean;

  // Timeline
  @Field(() => Date, { nullable: true })
  estimatedStartDate?: Date;

  @Field(() => Date, { nullable: true })
  estimatedCompletionDate?: Date;

  @Field(() => Date, { nullable: true })
  actualStartDate?: Date;

  @Field(() => Date, { nullable: true })
  actualCompletionDate?: Date;

  // Revisions
  @Field(() => Int, { nullable: true })
  revisionCount?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  previousVersions?: any;

  // Feedback
  @Field(() => String, { nullable: true })
  declineReason?: string;

  @Field(() => String, { nullable: true })
  cancellationReason?: string;

  // Relations
  @Field(() => Service, { nullable: true })
  service?: Service;

  @Field(() => Seller, { nullable: true })
  client?: Seller;

  @Field(() => Seller, { nullable: true })
  provider?: Seller;
}
