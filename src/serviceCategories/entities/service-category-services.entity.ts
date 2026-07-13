import { ObjectType, Field } from '@nestjs/graphql';
import { ServiceCategory } from './service-category.entity.js';
import { ServiceConnection } from '../../services/entities/service-connection.entity.js';

/**
 * GraphQL ServiceCategoryServices Entity
 *
 * Combined payload for service category browsing: the service category itself
 * (with its translation and nested sub categories resolved by field resolvers)
 * plus the paginated list of every service that lives under the category.
 *
 * Returned by getServiceCategoryServicesBySlug (web) and getServiceCategoryServicesById (admin).
 */
@ObjectType()
export class ServiceCategoryServices {
  @Field(() => ServiceCategory, {
    description:
      'Service category data including translation and sub categories',
  })
  serviceCategory: ServiceCategory;

  @Field(() => ServiceConnection, {
    description: 'Paginated services belonging to the service category',
  })
  services: ServiceConnection;
}
