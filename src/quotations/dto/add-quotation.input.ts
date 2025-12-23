import { InputType, Field, Int, Float } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDate,
  IsJSON,
} from "class-validator";
import { GraphQLJSON } from "graphql-scalars";

@InputType()
export class AddQuotationInput {
  @Field(() => Int)
  @IsNumber()
  serviceId: number;

  @Field(() => String)
  @IsString()
  clientId: string;

  @Field(() => String)
  @IsString()
  providerId: string;

  @Field(() => String)
  @IsString()
  title: string;

  @Field(() => String)
  @IsString()
  description: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  estimatedPrice?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  clientNotes?: string;

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
  priceBreakdown?: any; // {labor, materials, tax}

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  // Timeline
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  estimatedStartDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  estimatedCompletionDate?: Date;
}
