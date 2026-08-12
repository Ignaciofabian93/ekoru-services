import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

/**
 * Buyer-facing views of the tables that hang off a service.
 *
 * The admin panel reads these through the `Admin*` raw types in
 * `adminServices/`, which include internal state and no visibility rules. These
 * are the public shapes: active rows only, ordered for display, no ownership
 * data a shopper has no business seeing.
 */

@ObjectType('ServiceFaq')
export class ServiceFaq {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  question: string;

  @Field(() => String)
  answer: string;

  @Field(() => Int)
  displayOrder: number;
}

@ObjectType('ServicePackageItem')
export class ServicePackageItem {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  serviceId: number;

  @Field(() => Int)
  quantity: number;

  @Field(() => String, {
    nullable: true,
    description: 'Name of the bundled service, so a package reads on its own.',
  })
  serviceName?: string | null;
}

/**
 * A bundle a provider sells. Packages belong to the **seller**, not to a single
 * service, and reach services through their items — so the same package shows
 * on every service it contains.
 */
@ObjectType('ServicePackage')
export class ServicePackage {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  sellerId: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => Float)
  totalPrice: number;

  @Field(() => Float, { nullable: true })
  discountPercentage?: number | null;

  @Field(() => Int, { nullable: true })
  validityDays?: number | null;

  @Field(() => [ServicePackageItem])
  items: ServicePackageItem[];
}
