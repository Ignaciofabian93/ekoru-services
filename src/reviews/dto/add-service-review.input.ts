import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * What a reviewer sends when rating a service.
 *
 * The reviewer id is **not** here: the resolver takes it from the session and
 * passes it alongside as `AddServiceReviewInput & { reviewerId }`. Declaring it
 * on the class — even undecorated — would emit a real property that the global
 * ValidationPipe's `forbidNonWhitelisted` rejects.
 */
@InputType()
export class AddServiceReviewInput {
  @Field(() => Int)
  @IsNumber()
  serviceId: number;

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
