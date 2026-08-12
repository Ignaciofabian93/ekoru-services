import { InputType, Field, Int, Float } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsArray,
  IsDate,
  IsJSON,
} from 'class-validator';
import { GraphQLJSON } from 'graphql-scalars';

/**
 * What a client sends to open a quotation request.
 *
 * The client id is **not** here: the resolver takes it from the session and
 * passes it alongside as `AddQuotationInput & { clientId }`. It is not declared
 * on the class either — with `useDefineForClassFields` (on from ES2022) even an
 * undecorated field is emitted as a real property, and the global
 * ValidationPipe's `forbidNonWhitelisted` rejects any property it has no
 * validator for.
 */
@InputType()
export class AddQuotationInput {
  @Field(() => Int)
  @IsInt()
  serviceId: number;

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
  @IsInt()
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
