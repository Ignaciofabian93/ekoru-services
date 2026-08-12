import { InputType, Field, Int, Float } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDate,
  IsJSON,
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

  @Field(() => String)
  @IsString()
  providerId: string;

  @Field(() => Date)
  @IsDate()
  scheduledDate: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  scheduledTimeSlot?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsJSON()
  serviceLocation?: any; // {address, lat, lng, notes}

  @Field(() => Float)
  @IsNumber()
  agreedPrice: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  clientNotes?: string;
}
