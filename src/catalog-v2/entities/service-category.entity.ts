import { ObjectType, Field, ID, Int, Directive } from '@nestjs/graphql';
import { ServiceSubCategory } from './service-subcategory.entity.js';
import { ServiceCategoryTranslation } from './service-category-translation.entity.js';

@ObjectType()
@Directive('@key(fields: "id")')
export class ServiceCategory {
  @Field(() => ID)
  id: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String, { nullable: true })
  href?: string;

  @Field(() => ServiceCategoryTranslation, { nullable: true })
  translation?: ServiceCategoryTranslation;

  @Field(() => [ServiceSubCategory], { nullable: true })
  subcategories?: ServiceSubCategory[];
}
