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

  /**
   * Ignored: the provider is the service's seller. Optional only so a web
   * bundle from before that change still validates.
   */
  @Field(() => String, {
    nullable: true,
    description: "Ignored. The provider is the service's seller.",
  })
  @IsOptional()
  @IsString()
  providerId?: string;

  @Field(() => String)
  @IsString()
  title: string;

  @Field(() => String)
  @IsString()
  description: string;

  /**
   * Ignored: only the provider prices a quotation (updateQuotation). A client
   * who could set it could accept their own price. A budget goes in
   * `clientNotes`.
   */
  @Field(() => Float, {
    nullable: true,
    description: 'Ignored. Only the provider prices a quotation.',
  })
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
