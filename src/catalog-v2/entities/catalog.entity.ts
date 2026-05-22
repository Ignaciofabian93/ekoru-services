import { Directive, ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('ServiceSubCategoryItem')
export class ServiceSubCategoryItemEntity {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  href: string;

  @Field(() => String)
  slug: string;
}

@ObjectType('ServiceCatalogItem')
@Directive('@key(fields: "id")')
export class ServiceCatalogItemEntity {
  @Field(() => Int, { description: 'Unique identifier for the catalog item' })
  id: number;

  @Field(() => String, { description: 'Name of the catalog item' })
  name: string;

  @Field(() => String, { description: 'Href of the catalog item' })
  href: string;

  @Field(() => String, { description: 'Slug of the catalog item' })
  slug: string;

  @Field(() => [ServiceSubCategoryItemEntity], {
    description: 'List of sub-category items',
  })
  subCategoryItems: ServiceSubCategoryItemEntity[];
}
