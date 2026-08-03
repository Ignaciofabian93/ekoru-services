import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { PageInfo } from '../../catalog-v2/entities/page-info.entity.js';

/**
 * Raw, admin-only views of ServicePackage (with its items) and
 * ServiceProviderCredentials. Rows are returned exactly as stored (inactive
 * included). Names are `Admin*`-prefixed to stay distinct from any federated
 * types. The `certifications` JSON column on credentials is not exposed here —
 * it is edited through the seller app and left untouched by admin upserts.
 */
@ObjectType('AdminServicePackageItem')
export class RawServicePackageItemEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  packageId: number;

  @Field(() => Int)
  serviceId: number;

  @Field(() => Int)
  quantity: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType('AdminServicePackage')
export class RawServicePackageEntity {
  @Field(() => Int)
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

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [RawServicePackageItemEntity])
  servicePackageItem: RawServicePackageItemEntity[];
}

@ObjectType('AdminServiceProviderCredentials')
export class RawServiceCredentialsEntity {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  sellerId: string;

  @Field(() => String, { nullable: true })
  licenseNumber?: string | null;

  @Field(() => String, { nullable: true })
  licenseType?: string | null;

  @Field(() => Date, { nullable: true })
  licenseExpiryDate?: Date | null;

  @Field(() => Boolean)
  isLicenseVerified: boolean;

  @Field(() => String, { nullable: true })
  insuranceProvider?: string | null;

  @Field(() => String, { nullable: true })
  insurancePolicyNumber?: string | null;

  @Field(() => Date, { nullable: true })
  insuranceExpiryDate?: Date | null;

  @Field(() => Float, { nullable: true })
  insuranceCoverage?: number | null;

  @Field(() => Date, { nullable: true })
  backgroundCheckDate?: Date | null;

  @Field(() => String, { nullable: true })
  backgroundCheckStatus?: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

// ─── Connections ──────────────────────────────────────────────────────────────

@ObjectType('AdminServicePackageConnection')
export class RawServicePackageConnectionEntity {
  @Field(() => [RawServicePackageEntity])
  nodes: RawServicePackageEntity[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType('AdminServiceProviderCredentialsConnection')
export class RawServiceCredentialsConnectionEntity {
  @Field(() => [RawServiceCredentialsEntity])
  nodes: RawServiceCredentialsEntity[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
