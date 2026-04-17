import { InputType, Field, ID, Float } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDate,
  IsJSON,
} from 'class-validator';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class UpdateServiceBookingInput {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  scheduledDate?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  scheduledTimeSlot?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsJSON()
  serviceLocation?: any;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  agreedPrice?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paymentStatus?: string; // PENDING, PARTIAL, PAID

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  status?: string; // PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  clientNotes?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  providerNotes?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cancelledBy?: string; // CLIENT or PROVIDER
}
