import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Seller } from './seller.entity.js';

/**
 * A provider with active services the public can see, for the providers row on
 * /services. `seller` is a federation reference: the gateway fills in the name
 * and logo from ekoru-users.
 */
@ObjectType()
export class ServiceProvider {
  @Field(() => ID)
  sellerId: string;

  @Field(() => Int, {
    description: 'Active services, within the category when one was given.',
  })
  serviceCount: number;

  @Field(() => Seller)
  seller: { id: string };
}
