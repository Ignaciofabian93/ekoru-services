import { ObjectType, Field } from '@nestjs/graphql';
import { ServiceSubCategory } from './service-subcategory.entity.js';
import { ServiceConnection } from '../../services/entities/service-connection.entity.js';

/**
 * GraphQL ServiceSubCategoryServices Entity
 *
 * Combined payload for service sub category browsing: the sub category itself
 * (with its translation resolved by field resolvers) plus the paginated list
 * of its services.
 *
 * Clients select the full payload on the first load and only the `services`
 * field when paginating, so the sub category data is not re-resolved on page changes.
 *
 * Returned by getServiceSubCategoryServicesBySlug.
 */
@ObjectType()
export class ServiceSubCategoryServices {
  @Field(() => ServiceSubCategory, {
    description: 'Service sub category data including translation',
  })
  serviceSubCategory: ServiceSubCategory;

  @Field(() => ServiceConnection, {
    description: 'Paginated services belonging to the sub category',
  })
  services: ServiceConnection;
}
