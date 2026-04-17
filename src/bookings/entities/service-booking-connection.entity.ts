import { ObjectType, Field } from '@nestjs/graphql';
import { ServiceBooking } from './service-booking.entity.js';
import { PageInfo } from '../../catalog-v2/entities/page-info.entity.js';

@ObjectType()
export class ServiceBookingConnection {
  @Field(() => [ServiceBooking])
  nodes: ServiceBooking[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
