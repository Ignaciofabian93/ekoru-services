import { ObjectType, Field, ID, Int, Directive } from '@nestjs/graphql';
import { ServiceSubCategoryTranslation } from './service-subcategory-translation.entity.js';

@ObjectType()
@Directive('@key(fields: "id")')
export class ServiceSubCategory {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  serviceCategoryId: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => String, { nullable: true })
  subCategory?: string;

  @Field(() => Int, { nullable: true })
  serviceCount?: number;

  @Field(() => String, { nullable: true })
  href?: string;

  @Field(() => ServiceSubCategoryTranslation, { nullable: true })
  translation?: ServiceSubCategoryTranslation;
}
