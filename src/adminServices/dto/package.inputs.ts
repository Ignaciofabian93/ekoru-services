import { ArgsType, Field, InputType, Int, Float } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Admin inputs for ServicePackage (+ items) and ServiceProviderCredentials.
 * Same shared contract: `id` present → update; no `id` → create/match on the
 * business key. Omitted fields are left untouched on update.
 */

@ArgsType()
export class RawServicePackageListArgs {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int, { defaultValue: 50 })
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ArgsType()
export class RawServiceCredentialsListArgs {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int, { defaultValue: 50 })
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize: number;

  @Field(() => String, {
    nullable: true,
    description: 'Filters by seller id or license number',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isLicenseVerified?: boolean;
}

@InputType()
export class ServicePackageUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Owner seller. Required when creating (no id).',
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  discountPercentage?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  validityDays?: number | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class ServicePackageItemUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Owner package. Required when creating (no id).',
  })
  @IsOptional()
  @IsInt()
  packageId?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Service in the package. Required when creating (no id).',
  })
  @IsOptional()
  @IsInt()
  serviceId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  quantity?: number;
}

@InputType()
export class ServiceCredentialsUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description:
      'Unique per seller. Required when creating; without an id a matching row is updated.',
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  licenseNumber?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  licenseType?: string | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  licenseExpiryDate?: Date | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isLicenseVerified?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  insuranceProvider?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  insurancePolicyNumber?: string | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  insuranceExpiryDate?: Date | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  insuranceCoverage?: number | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  backgroundCheckDate?: Date | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  backgroundCheckStatus?: string | null;
}
