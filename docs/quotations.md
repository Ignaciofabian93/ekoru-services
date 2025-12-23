# Quotations Module Documentation

## Overview

The Quotations module manages custom service quotes between clients and providers. It supports a complete workflow from request to completion, with status tracking, pricing negotiation, and document attachments.

## Table of Contents

- [Architecture](#architecture)
- [Business Logic](#business-logic)
- [Status Workflow](#status-workflow)
- [Key Features](#key-features)
- [Data Model](#data-model)
- [API Operations](#api-operations)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Architecture

### Module Structure

```
quotations/
├── dto/
│   ├── add-quotation.input.ts          # Create quotation input
│   ├── update-quotation.input.ts       # Update quotation input
│   └── index.ts
├── entities/
│   ├── quotation.entity.ts             # GraphQL entity
│   ├── quotation-connection.entity.ts  # Paginated response
│   └── index.ts
├── quotations.module.ts                 # Module definition
├── quotations.resolver.ts               # GraphQL resolver
├── quotations.service.ts                # Business logic
└── quotations.spec.ts                   # Unit tests
```

### Dependencies

- **PrismaService**: Database operations
- **Common Utilities**: Pagination, error handling
- **GraphQL**: Query/mutation resolvers
- **Enums**: QuotationStatus enum

## Business Logic

### Quotation Creation Flow

1. **Request**: Client requests a quote for a service
2. **Details**: Provide description, estimated price, and duration
3. **Attachments**: Optional document attachments
4. **Expiration**: Set expiration date for the quote
5. **Status**: Created with `PENDING` status

### Update Flow

Quotations support partial updates:

- Update pricing (estimated and final)
- Update estimated duration
- Change status
- Add notes (client/provider)
- Update attachments
- Extend expiration date

### Status Transition Methods

Specialized methods for common transitions:

1. **Accept**: Provider accepts the quotation
2. **Decline**: Provider declines with optional reason
3. **Complete**: Mark work as completed
4. **Cancel**: Cancel the quotation (by either party)
5. **Delete**: Permanently remove quotation

## Status Workflow

### Quotation Status Lifecycle

```
PENDING → ACCEPTED → IN_PROGRESS → COMPLETED
   ↓         ↓
DECLINED  CANCELLED
```

### Status Descriptions

| Status        | Description                               | Who Can Set     | Next States            |
| ------------- | ----------------------------------------- | --------------- | ---------------------- |
| `PENDING`     | Initial state, awaiting provider response | System          | ACCEPTED, DECLINED     |
| `ACCEPTED`    | Provider accepted the quotation           | Provider        | IN_PROGRESS, CANCELLED |
| `DECLINED`    | Provider declined the quotation           | Provider        | -                      |
| `IN_PROGRESS` | Work has started                          | Provider        | COMPLETED, CANCELLED   |
| `COMPLETED`   | Work finished successfully                | Provider        | -                      |
| `CANCELLED`   | Cancelled by either party                 | Client/Provider | -                      |

### Automatic Timestamps

- **acceptedAt**: Set when status changes to ACCEPTED
- **completedAt**: Set when status changes to COMPLETED
- **updatedAt**: Set on every update

## Key Features

### 1. Flexible Pricing

Quotations support two price points:

- **estimatedPrice**: Initial estimate from provider
- **finalPrice**: Actual final price (may differ from estimate)

```typescript
{
  estimatedPrice: 500,    // Initial quote
  finalPrice: 475         // Actual charge (optional discount)
}
```

### 2. Document Attachments

Attach files for reference:

```typescript
attachments: ["specifications.pdf", "reference-image.jpg", "contract.pdf"];
```

### 3. Expiration Management

Set and update expiration dates:

```typescript
{
  expiresAt: "2025-12-31T23:59:59Z",
  // Quote is only valid until this date
}
```

### 4. Two-Way Communication

Client and provider notes:

```typescript
{
  clientNotes: "Need this completed by end of month",
  providerNotes: "Can complete in 2 weeks, materials extra"
}
```

### 5. Filtering Capabilities

Query quotations by:

- Client ID (all quotes requested by client)
- Provider ID (all quotes received by provider)
- Service ID (all quotes for a service)
- Status (e.g., all PENDING quotes)

### 6. Pagination Support

All list queries support pagination:

```typescript
getQuotationsByClient(
  clientId: "client-123",
  page: 1,
  pageSize: 10
)
```

## Data Model

### Quotation Entity

```typescript
{
  id: number;                      // Primary key
  serviceId: number;               // Foreign key to Service
  clientId: string;                // Client user ID
  providerId: string;              // Provider user ID

  // Description
  title: string;                   // Quotation title
  description: string;             // Detailed description

  // Pricing
  estimatedPrice: float;           // Initial estimate
  finalPrice: float;               // Final price (optional)

  // Duration
  estimatedDuration: number;       // Minutes expected

  // Status
  status: QuotationStatus;         // Current status

  // Communication
  clientNotes: string;             // Client notes (optional)
  providerNotes: string;           // Provider notes (optional)

  // Attachments
  attachments: string[];           // Array of file URLs/paths

  // Timestamps
  createdAt: DateTime;             // Creation date
  updatedAt: DateTime;             // Last update
  expiresAt: DateTime;             // Expiration date (optional)
  acceptedAt: DateTime;            // When accepted (optional)
  completedAt: DateTime;           // When completed (optional)

  // Relations
  service: Service;                // Related service
  client: User;                    // Client details
  provider: User;                  // Provider details
}
```

### Input DTOs

**AddQuotationInput:**

```typescript
{
  serviceId: number;               // Required
  clientId: string;                // Required
  providerId: string;              // Required
  title: string;                   // Required
  description: string;             // Required
  estimatedPrice: float;           // Required
  estimatedDuration: number;       // Required (minutes)
  clientNotes?: string;            // Optional
  attachments?: string[];          // Optional
  expiresAt?: DateTime;            // Optional
}
```

**UpdateQuotationInput:**

```typescript
{
  id: string;                      // Required
  estimatedPrice?: float;          // Optional
  finalPrice?: float;              // Optional
  estimatedDuration?: number;      // Optional
  status?: QuotationStatus;        // Optional
  clientNotes?: string;            // Optional
  providerNotes?: string;          // Optional
  attachments?: string[];          // Optional
  expiresAt?: DateTime;            // Optional
}
```

## API Operations

### Queries

#### 1. Get Single Quotation

```typescript
getQuotation(id: ID!): Quotation
```

Fetches a single quotation with service details.

**Returns:**

- Complete quotation data
- Related service information
- Client and provider references

#### 2. Get Quotations by Client

```typescript
getQuotationsByClient(
  clientId: ID!,
  page: Int = 1,
  pageSize: Int = 10
): QuotationConnection
```

List all quotations requested by a specific client.

#### 3. Get Quotations by Provider

```typescript
getQuotationsByProvider(
  providerId: ID!,
  page: Int = 1,
  pageSize: Int = 10
): QuotationConnection
```

List all quotations received by a specific provider.

#### 4. Get Quotations by Service

```typescript
getQuotationsByService(
  serviceId: ID!,
  page: Int = 1,
  pageSize: Int = 10
): QuotationConnection
```

List all quotations for a specific service.

#### 5. Get Quotations by Status

```typescript
getQuotationsByStatus(
  status: QuotationStatus!,
  page: Int = 1,
  pageSize: Int = 10
): QuotationConnection
```

List quotations filtered by status.

**Status values:**

- `PENDING`
- `ACCEPTED`
- `DECLINED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### Mutations

#### 1. Create Quotation

```typescript
addQuotation(input: AddQuotationInput!): Quotation
```

Creates a new quotation with PENDING status.

#### 2. Update Quotation

```typescript
updateQuotation(input: UpdateQuotationInput!): Quotation
```

Updates quotation details. Supports partial updates.

#### 3. Accept Quotation

```typescript
acceptQuotation(id: ID!): Quotation
```

Provider accepts the quotation.

**Side effects:**

- Sets status to ACCEPTED
- Sets acceptedAt timestamp
- Updates updatedAt

#### 4. Decline Quotation

```typescript
declineQuotation(
  id: ID!,
  reason?: String
): Quotation
```

Provider declines the quotation.

**Side effects:**

- Sets status to DECLINED
- Optional reason saved in providerNotes
- Updates updatedAt

#### 5. Complete Quotation

```typescript
completeQuotation(id: ID!): Quotation
```

Marks quotation work as completed.

**Side effects:**

- Sets status to COMPLETED
- Sets completedAt timestamp
- Updates updatedAt

#### 6. Cancel Quotation

```typescript
cancelQuotation(
  id: ID!,
  reason?: String
): Quotation
```

Cancels the quotation (either party).

**Side effects:**

- Sets status to CANCELLED
- Optional reason saved in providerNotes
- Updates updatedAt

#### 7. Delete Quotation

```typescript
deleteQuotation(id: ID!): Boolean
```

Permanently deletes a quotation.

**Returns:**

- `true`: Successfully deleted
- `false`: Error occurred

## Error Handling

### Common Errors

| Error Type            | When Thrown           | HTTP Status | Message                              |
| --------------------- | --------------------- | ----------- | ------------------------------------ |
| `NotFoundError`       | Quotation not found   | 404         | "Cotización no encontrada"           |
| `InternalServerError` | Database/system error | 500         | "Error al [operation] la cotización" |

### Error Examples

```typescript
// Quotation not found
{
  "errors": [{
    "message": "Cotización no encontrada",
    "extensions": { "code": "NOT_FOUND" }
  }]
}

// Internal server error
{
  "errors": [{
    "message": "Error al actualizar la cotización",
    "extensions": { "code": "INTERNAL_SERVER_ERROR" }
  }]
}
```

## Best Practices

### For Developers

1. **Status Validation**: Validate status transitions are valid
2. **Expiration Checks**: Check if quotation is expired before accepting
3. **Price Validation**: Ensure finalPrice is set before completing
4. **Attachment Security**: Validate and sanitize attachment URLs
5. **Timezone Handling**: Store timestamps in UTC

### For API Consumers

1. **Check Expiration**: Display expired quotes differently
2. **Status Display**: Show clear status indicators in UI
3. **Price Changes**: Alert users if finalPrice differs from estimated
4. **Confirmation**: Require confirmation for status changes
5. **File Upload**: Implement secure file upload for attachments

### Security Considerations

1. **Authorization**: Verify user is client or provider before access
2. **Status Transitions**: Enforce valid status workflows
3. **File Validation**: Validate attachment file types and sizes
4. **Audit Trail**: Log all status changes
5. **Expiration**: Prevent actions on expired quotations

### Performance Tips

1. **Index fields**: clientId, providerId, status, expiresAt
2. **Pagination**: Always use pagination for lists
3. **Caching**: Cache service details
4. **Batch queries**: Fetch related data in single query

## Example Workflows

### Complete Quotation Workflow

```typescript
// 1. Client requests quotation
const quotation = await addQuotation({
  serviceId: 1,
  clientId: "client-123",
  providerId: "provider-456",
  title: "Custom Web Development",
  description: "Need a custom e-commerce website",
  estimatedPrice: 5000,
  estimatedDuration: 14400, // 10 days in minutes
  clientNotes: "Prefer completion within 2 months",
  expiresAt: "2025-12-31T23:59:59Z",
});

// 2. Provider reviews and accepts
await acceptQuotation(quotation.id);

// 3. Work begins
await updateQuotation({
  id: quotation.id,
  status: "IN_PROGRESS",
  providerNotes: "Started development, will update weekly",
});

// 4. Work completed
await updateQuotation({
  id: quotation.id,
  finalPrice: 4800, // Small discount applied
  providerNotes: "Project completed ahead of schedule",
});

await completeQuotation(quotation.id);
```

### Decline Workflow

```typescript
// Provider declines with reason
await declineQuotation(quotationId, "Timeline conflicts with current projects");
```

### Update Pricing Workflow

```typescript
// Negotiate pricing
await updateQuotation({
  id: quotationId,
  estimatedPrice: 4500, // Revised estimate
  providerNotes: "Reduced price for simplified scope",
});
```

## Business Rules

### Validation Rules

1. **estimatedPrice**: Must be > 0
2. **estimatedDuration**: Must be > 0
3. **expiresAt**: Must be in the future
4. **status transitions**: Follow defined workflow
5. **finalPrice**: Cannot be set if status is PENDING or DECLINED

### Automatic Actions

1. **Creation**: Status automatically set to PENDING
2. **Accept**: acceptedAt automatically set
3. **Complete**: completedAt automatically set
4. **Update**: updatedAt always updated

### Business Constraints

1. Cannot accept expired quotations
2. Cannot complete without ACCEPTED or IN_PROGRESS status
3. Cannot modify DECLINED or COMPLETED quotations
4. finalPrice should be set before COMPLETED status

## Testing

The module includes comprehensive tests covering:

- ✅ Quotation creation with all fields
- ✅ Filtering by client, provider, service, status
- ✅ Status transitions (accept, decline, complete, cancel)
- ✅ Partial updates
- ✅ Expiration handling
- ✅ Price updates (estimated and final)
- ✅ Deletion (returns boolean)
- ✅ Error handling

Run tests:

```bash
npm test -- quotations.spec.ts
```

## Related Modules

- **Services**: Service details for quotations
- **Bookings**: Convert accepted quotation to booking
- **Reviews**: Can review after COMPLETED status
- **Payments**: Process payment after acceptance

## Integration Points

### Creating a Booking from Quotation

```typescript
// After quotation is accepted, create booking
if (quotation.status === "ACCEPTED") {
  await addServiceBooking({
    serviceId: quotation.serviceId,
    clientId: quotation.clientId,
    providerId: quotation.providerId,
    scheduledDate: negotiatedDate,
    agreedPrice: quotation.finalPrice || quotation.estimatedPrice,
  });
}
```

---

For GraphQL query examples, see [queries.md](./queries.md).
