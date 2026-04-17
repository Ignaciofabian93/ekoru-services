import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsArray,
  IsDate,
  IsBoolean,
  IsEnum,
  IsJSON,
} from 'class-validator';
import { GraphQLJSON } from 'graphql-scalars';
import { QuotationStatus } from '../../graphql/enums/index.js';

@InputType()
export class UpdateQuotationInput {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  estimatedPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  finalPrice?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  estimatedDuration?: number;

  @Field(() => QuotationStatus, { nullable: true })
  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  clientNotes?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  providerNotes?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  attachments?: string[];

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  // Pricing breakdown
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsJSON()
  priceBreakdown?: any;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  depositPaid?: boolean;

  // Timeline
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  estimatedStartDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  estimatedCompletionDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  actualStartDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  actualCompletionDate?: Date;

  // Feedback
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  declineReason?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
