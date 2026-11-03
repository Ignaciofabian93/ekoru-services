import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Language } from '@prisma/client';
import { CurrentAdmin } from '../common/decorators/index.js';
// The shared bulk-result type from adminCatalog; a second
// `ServiceBulkUpsertResult` ObjectType would collide in the federated schema.
import { BulkUpsertResultEntity } from '../adminCatalog/entities/index.js';
import { BusinessServiceRowInput } from './dto/index.js';
import { BusinessServicesService } from './business-services.service.js';

/** A business's own services from the panel's spreadsheet (ADM-16). */
@Resolver()
export class BusinessServicesResolver {
  constructor(private readonly service: BusinessServicesService) {}

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Publishes (rows without id) or updates (rows with id) the signed-in ' +
      "business's own services, with the web's rules. A business account " +
      'that is the owner or holds MANAGE_BUSINESS_PRODUCTS; at most 200 rows ' +
      'per call.',
  })
  publishMyServices(
    @Args('rows', { type: () => [BusinessServiceRowInput] })
    rows: BusinessServiceRowInput[],
    @Args('language', { type: () => Language, nullable: true })
    language?: Language,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.service.publishMyServices({ adminId, rows, language });
  }
}
