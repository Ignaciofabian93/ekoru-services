import { InputType, Field, Int, Float } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDate,
  IsJSON,
} from "class-validator";
import { GraphQLJSON } from "graphql-scalars";

@InputType()
export class AddServiceBookingInput {
  @Field(() => Int)
  @IsNumber()
  serviceId: number;

  @Field(() => String)
  @IsString()
  clientId: string;

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
