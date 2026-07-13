import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Language } from '@prisma/client';

@ObjectType()
export class ServiceSubCategoryTranslation {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  serviceSubCategoryId: number;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  subCategory: string;

  @Field(() => String)
  slug: string;

  @Field(() => String, { nullable: true })
  href?: string;

  @Field(() => String, { nullable: true })
  metaTitle?: string;

  @Field(() => String, { nullable: true })
  metaDescription?: string;

  @Field(() => [String])
  metaKeywords: string[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
