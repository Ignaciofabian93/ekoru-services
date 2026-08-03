import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CurrentAdmin } from '../../common/decorators/index.js';
import { BulkUpsertResultEntity } from '../../adminCatalog/entities/index.js';
import {
  RawServiceConnectionEntity,
  RawServicePackageConnectionEntity,
  RawServiceCredentialsConnectionEntity,
} from '../entities/index.js';
import {
  RawServiceListArgs,
  ServiceUpsertRowInput,
  ServiceMediaUpsertRowInput,
  ServiceFaqUpsertRowInput,
  RawServicePackageListArgs,
  RawServiceCredentialsListArgs,
  ServicePackageUpsertRowInput,
  ServicePackageItemUpsertRowInput,
  ServiceCredentialsUpsertRowInput,
} from '../dto/index.js';
import { AdminServicesService } from '../admin-services.service.js';

/**
 * Platform-admin surface over the Service table and its media / FAQ sub-rows.
 * Every operation requires the x-admin-id header the gateway sets; the service
 * rejects anonymous or seller traffic.
 *
 * `rawServices` returns rows exactly as stored (each with its media + FAQ) so
 * the panel can list, edit and export them — a single-row read for the edit
 * screen is `rawServices(id: …)`. Writes are bulk upserts shared by the XLSX
 * import and the row-by-row edit forms, plus per-row deletes.
 */
@Resolver()
export class AdminServicesResolver {
  constructor(private readonly adminServicesService: AdminServicesService) {}

  @Query(() => RawServiceConnectionEntity, {
    name: 'rawServices',
    description:
      'Paginated, unprocessed services (inactive included), each with its media + FAQ. Admins only.',
  })
  getRawServices(
    @Args()
    {
      id,
      page,
      pageSize,
      search,
      subcategoryId,
      sellerId,
      isActive,
    }: RawServiceListArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.getRawServices({
      adminId,
      id,
      page,
      pageSize,
      search,
      subcategoryId,
      sellerId,
      isActive,
    });
  }

  // ─── Services ─────────────────────────────────────────────────────────────────

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Bulk create/update services (rows with id update, without id create). Admins only.',
  })
  bulkUpsertServices(
    @Args('rows', { type: () => [ServiceUpsertRowInput] })
    rows: ServiceUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.bulkUpsertServices({ adminId, rows });
  }

  @Mutation(() => Boolean, {
    name: 'deleteService',
    description:
      'Hard-delete a service (cascades its media + FAQ). Fails while bookings/quotations reference it. Admins only.',
  })
  deleteService(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.deleteService({ adminId, id });
  }

  // ─── Service media ──────────────────────────────────────────────────────────

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Bulk create/update service media (rows with id update, without id create). Admins only.',
  })
  bulkUpsertServiceMedia(
    @Args('rows', { type: () => [ServiceMediaUpsertRowInput] })
    rows: ServiceMediaUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.bulkUpsertServiceMedia({ adminId, rows });
  }

  @Mutation(() => Boolean, {
    name: 'deleteServiceMedia',
    description: 'Hard-delete a service media row. Admins only.',
  })
  deleteServiceMedia(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.deleteServiceMedia({ adminId, id });
  }

  // ─── Service FAQ ──────────────────────────────────────────────────────────────

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Bulk create/update service FAQ (rows with id update, without id create). Admins only.',
  })
  bulkUpsertServiceFaqs(
    @Args('rows', { type: () => [ServiceFaqUpsertRowInput] })
    rows: ServiceFaqUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.bulkUpsertServiceFaqs({ adminId, rows });
  }

  @Mutation(() => Boolean, {
    name: 'deleteServiceFaq',
    description: 'Hard-delete a service FAQ row. Admins only.',
  })
  deleteServiceFaq(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.deleteServiceFaq({ adminId, id });
  }

  // ─── Service packages ─────────────────────────────────────────────────────────

  @Query(() => RawServicePackageConnectionEntity, {
    name: 'rawServicePackages',
    description:
      'Paginated, unprocessed service packages (inactive included), each with its items. Admins only.',
  })
  getRawServicePackages(
    @Args()
    {
      id,
      page,
      pageSize,
      search,
      sellerId,
      isActive,
    }: RawServicePackageListArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.getRawServicePackages({
      adminId,
      id,
      page,
      pageSize,
      search,
      sellerId,
      isActive,
    });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Bulk create/update service packages (rows with id update, without id create). Admins only.',
  })
  bulkUpsertServicePackages(
    @Args('rows', { type: () => [ServicePackageUpsertRowInput] })
    rows: ServicePackageUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.bulkUpsertServicePackages({
      adminId,
      rows,
    });
  }

  @Mutation(() => Boolean, {
    name: 'deleteServicePackage',
    description:
      'Hard-delete a service package (cascades its items). Admins only.',
  })
  deleteServicePackage(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.deleteServicePackage({ adminId, id });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Bulk create/update service package items (rows with id update, without id matched by packageId+serviceId). Admins only.',
  })
  bulkUpsertServicePackageItems(
    @Args('rows', { type: () => [ServicePackageItemUpsertRowInput] })
    rows: ServicePackageItemUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.bulkUpsertServicePackageItems({
      adminId,
      rows,
    });
  }

  @Mutation(() => Boolean, {
    name: 'deleteServicePackageItem',
    description: 'Hard-delete a service package item. Admins only.',
  })
  deleteServicePackageItem(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.deleteServicePackageItem({ adminId, id });
  }

  // ─── Service provider credentials ─────────────────────────────────────────────

  @Query(() => RawServiceCredentialsConnectionEntity, {
    name: 'rawServiceCredentials',
    description:
      'Paginated service provider credentials (one row per seller). Admins only.',
  })
  getRawServiceCredentials(
    @Args()
    {
      id,
      page,
      pageSize,
      search,
      isLicenseVerified,
    }: RawServiceCredentialsListArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.getRawServiceCredentials({
      adminId,
      id,
      page,
      pageSize,
      search,
      isLicenseVerified,
    });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Bulk create/update provider credentials (rows with id update, without id matched by sellerId). Admins only.',
  })
  bulkUpsertServiceCredentials(
    @Args('rows', { type: () => [ServiceCredentialsUpsertRowInput] })
    rows: ServiceCredentialsUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.bulkUpsertServiceCredentials({
      adminId,
      rows,
    });
  }

  @Mutation(() => Boolean, {
    name: 'deleteServiceCredentials',
    description: 'Hard-delete a provider credentials row. Admins only.',
  })
  deleteServiceCredentials(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.adminServicesService.deleteServiceCredentials({ adminId, id });
  }
}
