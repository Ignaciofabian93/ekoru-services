import { registerEnumType } from '@nestjs/graphql';
import { Language } from '@prisma/client';

export enum ServicePricing {
  FIXED = 'FIXED',
  QUOTATION = 'QUOTATION',
  HOURLY = 'HOURLY',
  PACKAGE = 'PACKAGE',
}

export enum QuotationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * How a booking is paid (SRV-5, decision D7). Beta: the client pays the
 * provider directly, at the place of service; nothing is charged through EKORU.
 */
export enum BookingPaymentMode {
  ON_SITE = 'ON_SITE',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum ServiceSortField {
  CREATED_AT = 'CREATED_AT',
  NAME = 'NAME',
  BASE_PRICE = 'BASE_PRICE',
}

// Register enums with GraphQL
registerEnumType(Language, {
  name: 'Language',
  description: 'Supported languages for multi-language content',
});

registerEnumType(ServicePricing, {
  name: 'ServicePricing',
  description: 'Service pricing types',
});

registerEnumType(QuotationStatus, {
  name: 'QuotationStatus',
  description: 'Quotation status types',
});

registerEnumType(BookingPaymentMode, {
  name: 'BookingPaymentMode',
  description:
    'How a booking is paid. ON_SITE: directly to the provider, at the place of service.',
});

registerEnumType(SortOrder, {
  name: 'SortOrder',
  description: 'Sort order direction',
});

registerEnumType(ServiceSortField, {
  name: 'ServiceSortField',
  description: 'Service sort field options',
});
