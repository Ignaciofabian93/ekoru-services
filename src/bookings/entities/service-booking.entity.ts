import { ObjectType, Field, ID, Int, Float, Directive } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { Seller } from '../../services/entities/seller.entity.js';
import { Service } from '../../services/entities/service.entity.js';

@ObjectType()
@Directive('@key(fields: "id")')
export class ServiceBooking {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  serviceId: number;

  @Field(() => String)
  clientId: string;

  @Field(() => String)
  providerId: string;

  @Field(() => Date)
  bookingDate: Date;

  @Field(() => Date)
  scheduledDate: Date;

  @Field(() => String, { nullable: true })
  scheduledTimeSlot?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  serviceLocation?: any;

  @Field(() => Float)
  agreedPrice: number;

  // `paymentMode` is resolved in BookingsResolver (SRV-5). The old free-text
  // `paymentStatus` column is never written, so it is no longer exposed.

  @Field(() => String)
  status: string; // PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED

  @Field(() => String, { nullable: true })
  clientNotes?: string;

  @Field(() => String, { nullable: true })
  providerNotes?: string;

  @Field(() => Date, { nullable: true })
  completedAt?: Date;

  @Field(() => String, { nullable: true })
  cancellationReason?: string;

  @Field(() => String, { nullable: true })
  cancelledBy?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  // Relations
  @Field(() => Service, { nullable: true })
  service?: Service;

  @Field(() => Seller, { nullable: true })
  client?: Seller;

  @Field(() => Seller, { nullable: true })
  provider?: Seller;
}
