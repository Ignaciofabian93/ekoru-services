# Services Module Documentation

## Overview

The Services module is the core of the platform, managing service listings from providers. It handles service creation, updates, categorization, pricing models, and status management. Services are the primary entities that users browse and book.

## Table of Contents

- [Architecture](#architecture)
- [Business Logic](#business-logic)
- [Key Features](#key-features)
- [Pricing Models](#pricing-models)
- [Data Model](#data-model)
- [API Operations](#api-operations)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Architecture

### Module Structure

```
services/
├── dto/
│   ├── add-service.input.ts          # Create service input
│   ├── update-service.input.ts       # Update service input
│   └── index.ts
├── entities/
│   ├── service.entity.ts             # GraphQL entity
│   ├── service-connection.entity.ts  # Paginated response
│   ├── seller.entity.ts              # Seller reference
│   └── index.ts
├── services.module.ts                 # Module definition
├── services.resolver.ts               # GraphQL resolver
├── services.service.ts                # Business logic
└── services.spec.ts                   # Unit tests
```

### Dependencies

- **PrismaService**: Database operations
- **Common Utilities**: Pagination, error handling
- **GraphQL**: Query/mutation resolvers
- **Enums**: ServicePricing enum

## Business Logic

### Service Creation Flow

1. **Input Validation**: Validate required fields and pricing
2. **Seller Verification**: Ensure seller exists (external check)
3. **Subcategory Validation**: Verify subcategory exists
4. **Creation**: Insert service with default active status
5. **Response**: Return service with initial stats

```typescript
async addService(input: AddServiceInput) {
  const service = await this.prisma.service.create({
    data: {
      ...input,
      tags: input.tags || [],
      isActive: input.isActive ?? true,
      updatedAt: new Date()
    }
  });

  return {
    ...service,
    seller: { id: service.sellerId },
    averageRating: 0,
    reviewCount: 0
  };
}
```

### Update Flow

Services support partial updates:

```typescript
async updateService(input: UpdateServiceInput) {
  // Only update fields that are provided
  const data = {
    ...(input.name && { name: input.name }),
    ...(input.description && { description: input.description }),
    ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
    // ... other optional fields
  };

  return await this.prisma.service.update({
    where: { id },
    data
  });
}
```

### Status Management

Services can be activated/deactivated:

```typescript
async toggleServiceActive(id: number) {
  const current = await this.prisma.service.findUnique({
    where: { id },
    select: { isActive: true }
  });

  return await this.prisma.service.update({
    where: { id },
    data: { isActive: !current.isActive }
  });
}
```

## Key Features

### 1. Comprehensive Filtering

Query services by multiple criteria:

- **Seller**: All services from a specific provider
- **Subcategory**: Services in a category
- **Pricing Type**: Filter by pricing model
- **Active Status**: Show only active/inactive services

### 2. Flexible Pagination

All list queries support pagination with cursor-based navigation:

```typescript
{
  edges: [...],
  pageInfo: {
    totalCount: 100,
    hasNextPage: true,
    hasPreviousPage: false,
    page: 1,
    pageSize: 10
  }
}
```

### 3. Rich Media Support

Services can include multiple images:

```typescript
images: ["service-main.jpg", "service-detail-1.jpg", "service-detail-2.jpg"];
```

### 4. Tagging System

Free-form tags for better searchability:

```typescript
tags: ["quick-delivery", "eco-friendly", "premium", "certified"];
```

### 5. Rating System

Automatic rating calculation:

- Average rating from all reviews
- Review count for social proof
- Displayed with service details

### 6. Duration Tracking

Services specify estimated duration in minutes:

```typescript
duration: 120; // 2 hours
```

## Pricing Models

### ServicePricing Enum

```typescript
enum ServicePricing {
  FIXED = "FIXED", // Single fixed price
  VARIABLE = "VARIABLE", // Price varies by factors
  HOURLY = "HOURLY", // Charged per hour
  CUSTOM = "CUSTOM", // Negotiable/custom pricing
}
```

### Pricing Model Details

#### FIXED Pricing

```typescript
{
  pricingType: "FIXED",
  basePrice: 100,         // Exact price
  priceRange: null        // Not used
}
```

**Use cases:** Standard services, packages, flat-rate offerings

#### VARIABLE Pricing

```typescript
{
  pricingType: "VARIABLE",
  basePrice: null,        // Not used
  priceRange: {
    min: 50,
    max: 200
  }
}
```

**Use cases:** Services with multiple tiers, customizable packages

#### HOURLY Pricing

```typescript
{
  pricingType: "HOURLY",
  basePrice: 50,          // Rate per hour
  priceRange: null
}
```

**Use cases:** Consulting, hourly labor, time-based services

#### CUSTOM Pricing

```typescript
{
  pricingType: "CUSTOM",
  basePrice: null,
  priceRange: null        // Use quotation system
}
```

**Use cases:** Complex projects, enterprise services, consultation required

## Data Model

### Service Entity

```typescript
{
  id: number;                      // Primary key
  name: string;                    // Service title
  description: string;             // Detailed description

  // Ownership
  sellerId: string;                // Provider/seller ID

  // Categorization
  subcategoryId: number;           // FK to ServiceSubCategory

  // Pricing
  pricingType: ServicePricing;     // Pricing model
  basePrice: float;                // Base/fixed price (optional)
  priceRange: JSON;                // Min/max range (optional)

  // Details
  duration: number;                // Estimated minutes
  images: string[];                // Array of image URLs
  tags: string[];                  // Search tags

  // Status
  isActive: boolean;               // Active/inactive flag

  // Timestamps
  createdAt: DateTime;             // Creation date
  updatedAt: DateTime;             // Last update

  // Relations
  serviceCategory: ServiceSubCategory;  // Category info
  serviceReview: ServiceReview[];  // All reviews

  // Computed (not stored)
  seller: { id: string };          // Seller reference
  averageRating: float;            // Calculated from reviews
  reviewCount: number;             // Count of reviews
}
```

### Input DTOs

**AddServiceInput:**

```typescript
{
  name: string;                    // Required
  description: string;             // Required
  sellerId: string;                // Required
  subcategoryId: number;           // Required
  pricingType: ServicePricing;     // Required
  basePrice?: float;               // Depends on pricing type
  priceRange?: JSON;               // Depends on pricing type
  duration?: number;               // Optional (minutes)
  images: string[];                // Optional, defaults to []
  tags?: string[];                 // Optional, defaults to []
  isActive?: boolean;              // Optional, defaults to true
}
```

**UpdateServiceInput:**

```typescript
{
  id: string;                      // Required
  name?: string;                   // Optional
  description?: string;            // Optional
  subcategoryId?: number;          // Optional
  pricingType?: ServicePricing;    // Optional
  basePrice?: float;               // Optional
  priceRange?: JSON;               // Optional
  duration?: number;               // Optional
  images?: string[];               // Optional
  tags?: string[];                 // Optional
  isActive?: boolean;              // Optional
}
```

## API Operations

### Queries

#### 1. Get Single Service

```typescript
getService(id: ID!): Service
```

Fetches complete service details with reviews and ratings.

**Returns:**

- Service data with all fields
- Category and subcategory info
- All reviews
- Calculated average rating
- Review count

#### 2. Get All Services

```typescript
getServices(
  page: Int = 1,
  pageSize: Int = 10,
  isActive?: Boolean
): ServiceConnection
```

Lists services with optional active status filter.

#### 3. Get Services by Seller

```typescript
getServicesBySeller(
  sellerId: ID!,
  page: Int = 1,
  pageSize: Int = 10,
  isActive?: Boolean
): ServiceConnection
```

Lists all services from a specific seller/provider.

**Use cases:**

- Provider profile page
- Seller dashboard
- Portfolio display

#### 4. Get Services by Subcategory

```typescript
getServicesBySubCategory(
  subcategoryId: ID!,
  page: Int = 1,
  pageSize: Int = 10,
  isActive?: Boolean
): ServiceConnection
```

Lists services in a specific category.

**Use cases:**

- Category browsing
- Filtered search
- Navigation menus

#### 5. Get Services by Pricing Type

```typescript
getServicesByPricingType(
  pricingType: ServicePricing!,
  page: Int = 1,
  pageSize: Int = 10,
  isActive?: Boolean
): ServiceConnection
```

Filters services by pricing model.

**Use cases:**

- Budget filtering
- Pricing model preference
- Advanced search

### Mutations

#### 1. Create Service

```typescript
addService(input: AddServiceInput!): Service
```

Creates a new service listing.

**Validation:**

- ✅ All required fields present
- ✅ Subcategory exists
- ✅ Pricing model matches price fields
- ✅ Images are valid URLs

**Defaults:**

- `isActive`: true
- `tags`: []
- `reviewCount`: 0
- `averageRating`: 0

#### 2. Update Service

```typescript
updateService(input: UpdateServiceInput!): Service
```

Updates service details with partial updates.

**Use cases:**

- Price changes
- Description updates
- Image management
- Tag updates

#### 3. Delete Service

```typescript
deleteService(id: ID!): Service
```

Permanently deletes a service.

**Considerations:**

- ⚠️ Cannot delete if active bookings exist
- ⚠️ Reviews are orphaned (consider soft delete)
- ⚠️ Quotations may reference deleted service

#### 4. Toggle Active Status

```typescript
toggleServiceActive(id: ID!): Service
```

Switches between active/inactive state.

**Use cases:**

- Temporarily disable service
- Seasonal availability
- Provider vacation mode

## Error Handling

### Common Errors

| Error Type            | When Thrown       | HTTP Status | Message                            |
| --------------------- | ----------------- | ----------- | ---------------------------------- |
| `NotFoundError`       | Service not found | 404         | "Servicio no encontrado"           |
| `InternalServerError` | Database error    | 500         | "Error al [operation] el servicio" |

### Error Examples

```typescript
// Service not found
{
  "errors": [{
    "message": "Servicio no encontrado",
    "extensions": { "code": "NOT_FOUND" }
  }]
}

// Update error
{
  "errors": [{
    "message": "Error al actualizar el servicio",
    "extensions": { "code": "INTERNAL_SERVER_ERROR" }
  }]
}
```

## Best Practices

### For Developers

1. **Validation**: Validate pricing data matches pricing type
2. **Images**: Validate image URLs and file types
3. **Categories**: Ensure subcategory exists before creation
4. **Soft Delete**: Consider isActive instead of deletion
5. **Search**: Implement full-text search on name/description

### For API Consumers

1. **Active Filter**: Default to showing only active services
2. **Image Optimization**: Resize images for thumbnails
3. **Rating Display**: Show stars visually with count
4. **Pricing Display**: Format based on pricing type
5. **Caching**: Cache service lists with short TTL

### Security Considerations

1. **Authorization**: Verify seller owns service before update/delete
2. **Image Upload**: Validate and sanitize image uploads
3. **XSS Protection**: Sanitize description HTML
4. **Rate Limiting**: Prevent service spam
5. **Content Moderation**: Review service descriptions

### Performance Tips

1. **Indexing**: Index sellerId, subcategoryId, isActive, pricingType
2. **Pagination**: Always use pagination for lists
3. **Caching**: Cache popular services
4. **Lazy Loading**: Load images lazily in UI
5. **Search Optimization**: Use database full-text search

## Example Workflows

### Complete Service Creation

```typescript
// 1. Create service
const service = await addService({
  name: "Professional Web Development",
  description: "Full-stack web development services...",
  sellerId: "seller-123",
  subcategoryId: 5,
  pricingType: "HOURLY",
  basePrice: 75,
  duration: 480, // 8 hours typical project
  images: ["portfolio-1.jpg", "portfolio-2.jpg"],
  tags: ["web-development", "full-stack", "react", "nodejs"],
  isActive: true,
});

// 2. Service is now live and searchable
```

### Update Service Pricing

```typescript
// Change from FIXED to HOURLY
await updateService({
  id: serviceId,
  pricingType: "HOURLY",
  basePrice: 75,
  priceRange: null, // Clear range for hourly
});
```

### Deactivate Service

```typescript
// Temporarily disable
await toggleServiceActive(serviceId);

// Later reactivate
await toggleServiceActive(serviceId);
```

## Business Rules

### Validation Rules

1. **name**: 10-200 characters
2. **description**: 50-2000 characters
3. **basePrice**: > 0 for FIXED and HOURLY
4. **priceRange**: min < max for VARIABLE
5. **duration**: > 0 minutes
6. **images**: Valid URLs, max 10 images
7. **tags**: Max 20 tags, 50 chars each

### Pricing Rules

| Pricing Type | basePrice | priceRange | Validation         |
| ------------ | --------- | ---------- | ------------------ |
| FIXED        | Required  | null       | basePrice > 0      |
| VARIABLE     | null      | Required   | min > 0, max > min |
| HOURLY       | Required  | null       | basePrice > 0      |
| CUSTOM       | null      | null       | Use quotations     |

### Status Rules

1. Inactive services cannot be booked
2. Inactive services don't appear in public search
3. Existing bookings continue if service deactivated
4. Reviews remain visible even if service inactive

## Testing

The module includes comprehensive tests covering:

- ✅ Service creation with all pricing types
- ✅ Partial updates
- ✅ Filtering (seller, subcategory, pricing, active)
- ✅ Rating calculation
- ✅ Toggle active status
- ✅ Deletion
- ✅ Error handling
- ✅ Default value handling

Run tests:

```bash
npm test -- services.spec.ts
```

## Related Modules

- **Catalog**: Service categorization
- **Bookings**: Services can be booked
- **Reviews**: Services receive reviews
- **Quotations**: Custom pricing requests
- **Sellers**: Service providers/owners

## Search and Discovery

### Recommended Search Fields

- `name`: Full-text search
- `description`: Full-text search
- `tags`: Exact match or contains
- `subcategoryId`: Filter by category
- `pricingType`: Filter by pricing model
- `basePrice`: Range queries

### Sorting Options

- **Relevance**: Based on search query
- **Rating**: averageRating DESC
- **Price**: basePrice ASC/DESC
- **Popularity**: reviewCount DESC
- **Recent**: createdAt DESC

---

For GraphQL query examples, see [queries.md](./queries.md).
