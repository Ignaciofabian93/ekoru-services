import { InputType, Field, ID, Float } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDate,
  IsIn,
  IsObject,
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
  @IsObject()
  serviceLocation?: any;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  agreedPrice?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn([
    'PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED',
  ])
  status?: string; // the provider moves it; see booking-rules.ts

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
