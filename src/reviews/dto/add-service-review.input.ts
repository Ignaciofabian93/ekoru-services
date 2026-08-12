import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

@InputType()
export class AddServiceReviewInput {
  @Field(() => Int)
  @IsNumber()
  serviceId: number;

  /**
   * Not part of the GraphQL input: the resolver fills it from the session, so
   * nobody can post a review under another seller's name.
   */
  reviewerId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;
}
