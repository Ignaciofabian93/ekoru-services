import { InputType, Field, Int, Float } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDate,
  IsObject,
} from 'class-validator';
import { GraphQLJSON } from 'graphql-scalars';

/**
 * What a client sends to book a service.
 *
 * The client id is **not** here: the resolver takes it from the session and
 * passes it alongside as `AddServiceBookingInput & { clientId }`. Declaring it
 * on the class — even undecorated — would emit a real property that the global
 * ValidationPipe's `forbidNonWhitelisted` rejects.
 */
@InputType()
export class AddServiceBookingInput {
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

  @Field(() => Date)
  @IsDate()
  scheduledDate: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  scheduledTimeSlot?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  serviceLocation?: any; // {address, lat, lng, notes}

  /**
   * Ignored: a booking starts at the service's base price, and the provider
   * adjusts it before confirming. A client cannot name their own price.
   */
  @Field(() => Float, {
    nullable: true,
    description:
      "Ignored. A booking starts at the service's base price; the provider adjusts it.",
  })
  @IsOptional()
  @IsNumber()
  agreedPrice?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  clientNotes?: string;
}
