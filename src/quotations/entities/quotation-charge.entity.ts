import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { QuotationStatus } from '../../graphql/enums/index.js';

/**
 * What ekoru-transactions needs to charge a quotation (SRV-3). Internal only:
 * the queries returning it require INTERNAL_SERVICE_SECRET.
 */
@ObjectType()
export class QuotationCharge {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  title: string;

  @Field(() => QuotationStatus)
  status: QuotationStatus;

  /** Who pays. */
  @Field(() => String)
  clientId: string;

  /** Who is paid. */
  @Field(() => String)
  providerId: string;

  /** `finalPrice ?? estimatedPrice`; null while the provider has not priced it. */
  @Field(() => Float, { nullable: true })
  amount: number | null;

  @Field(() => String)
  currency: string;

  @Field(() => Boolean)
  paid: boolean;

  @Field(() => Date, { nullable: true })
  paidAt: Date | null;

  @Field(() => Int, { nullable: true })
  paidPaymentId: number | null;
}
