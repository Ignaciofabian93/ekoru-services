# Bookings Module Documentation

## Overview

The Bookings module manages service reservations between clients and service providers. It handles scheduling, status tracking, payment status, and provides comprehensive booking management capabilities.

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
bookings/
├── dto/
│   ├── add-service-booking.input.ts      # Create booking input
│   ├── update-service-booking.input.ts   # Update booking input
│   └── index.ts
├── entities/
│   ├── service-booking.entity.ts         # GraphQL entity
│   ├── service-booking-connection.entity.ts  # Paginated response
│   └── index.ts
├── bookings.module.ts                     # Module definition
├── bookings.resolver.ts                   # GraphQL resolver
├── bookings.service.ts                    # Business logic
└── bookings.spec.ts                       # Unit tests
```

### Dependencies

- **PrismaService**: Database operations
- **Common Utilities**: Pagination, error handling
- **GraphQL**: Query/mutation resolvers

## Business Logic

### Booking Creation Flow

1. **Validation**: Verify service exists and is active
2. **Data Preparation**: Collect booking details (date, time, location, price)
3. **Creation**: Insert booking record with `PENDING` status
4. **Response**: Return booking with all related data

```typescript
async addServiceBooking(input: AddServiceBookingInput) {
  // 1. Verify service exists and is active
  const service = await this.prisma.service.findUnique({
    where: { id: input.serviceId }
  });

  if (!service || !service.isActive) {
    throw new BadRequestError('Servicio no disponible');
  }

  // 2. Create booking with default PENDING status
  const booking = await this.prisma.serviceBooking.create({
    data: { /* booking data */ }
  });

  return booking;
}
```

### Booking Update Flow

1. **Parse ID**: Convert string ID to integer
2. **Partial Update**: Only update provided fields
3. **Status Changes**: Handle special cases (e.g., COMPLETED sets completedAt)
4. **Timestamp**: Always update `updatedAt`

### Status Management

The module provides specialized methods for status transitions:

- **Cancel**: Sets status to CANCELLED with reason and cancelledBy
- **Complete**: Sets status to COMPLETED with completedAt timestamp
- **Update**: Generic update supporting any status change

## Status Workflow

### Booking Statuses

```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
   ↓
CANCELLED (at any point)
```

### Status Descriptions

| Status        | Description                          | Transitions From | Can Transition To      |
| ------------- | ------------------------------------ | ---------------- | ---------------------- |
| `PENDING`     | Initial state, awaiting confirmation | -                | CONFIRMED, CANCELLED   |
| `CONFIRMED`   | Provider confirmed the booking       | PENDING          | IN_PROGRESS, CANCELLED |
| `IN_PROGRESS` | Service is currently being provided  | CONFIRMED        | COMPLETED, CANCELLED   |
| `COMPLETED`   | Service successfully completed       | IN_PROGRESS      | -                      |
| `CANCELLED`   | Booking was cancelled                | Any              | -                      |

### Payment Statuses

- `PENDING`: Payment not yet processed
- `COMPLETED`: Payment successful
- `FAILED`: Payment failed
- `REFUNDED`: Payment was refunded

## Key Features

### 1. Service Validation

Before creating a booking, the system validates:

- ✅ Service exists in the database
- ✅ Service is marked as active (`isActive = true`)
- ❌ Throws `BadRequestError` if validation fails

### 2. Flexible Filtering

Query bookings by multiple criteria:

- **Client**: All bookings for a specific client
- **Provider**: All bookings for a specific provider
- **Service**: All bookings for a specific service
- **Status**: Filter by booking status (e.g., only CONFIRMED)

### 3. Pagination Support

All list queries support pagination:

```typescript
getServiceBookings(page: 1, pageSize: 10, status?: string)
```

Returns:

- `edges`: Array of booking nodes
- `pageInfo`: Metadata (totalCount, hasNextPage, hasPreviousPage)

### 4. Location Tracking

Bookings support flexible location data:

```typescript
serviceLocation: {
  address: "123 Main St",
  city: "Madrid",
  coordinates: { lat: 40.4168, lng: -3.7038 }
}
```

### 5. Notes System

Two-way communication through notes:

- **clientNotes**: Client's requirements, special requests
- **providerNotes**: Provider's observations, instructions

## Data Model

### ServiceBooking Entity

```typescript
{
  id: number; // Primary key
  serviceId: number; // Foreign key to Service
  clientId: string; // Client user ID
  providerId: string; // Provider user ID

  // Scheduling
  scheduledDate: DateTime; // Service date
  scheduledTimeSlot: string; // Time slot (e.g., "10:00-11:00")

  // Location
  serviceLocation: JSON; // Flexible location object

  // Pricing
  agreedPrice: float; // Agreed upon price

  // Status
  status: string; // Current booking status
  paymentStatus: string; // Payment status

  // Communication
  clientNotes: string; // Client notes (optional)
  providerNotes: string; // Provider notes (optional)

  // Cancellation
  cancellationReason: string; // Reason if cancelled
  cancelledBy: string; // Who cancelled (client/provider)

  // Timestamps
  completedAt: DateTime; // When completed (optional)
  createdAt: DateTime; // Creation timestamp
  updatedAt: DateTime; // Last update timestamp

  // Relations
  service: Service; // Related service
  client: User; // Client details
  provider: User; // Provider details
}
```

### Input DTOs

**AddServiceBookingInput:**

```typescript
{
  serviceId: number;               // Required
  clientId: string;                // Required
  providerId: string;              // Required
  scheduledDate: DateTime;         // Required
  scheduledTimeSlot: string;       // Required
  serviceLocation?: JSON;          // Optional
  agreedPrice: float;              // Required
  clientNotes?: string;            // Optional
}
```

**UpdateServiceBookingInput:**

```typescript
{
  id: string;                      // Required
  scheduledDate?: DateTime;        // Optional
  scheduledTimeSlot?: string;      // Optional
  serviceLocation?: JSON;          // Optional
  agreedPrice?: float;             // Optional
  paymentStatus?: string;          // Optional
  status?: string;                 // Optional
  clientNotes?: string;            // Optional
  providerNotes?: string;          // Optional
  cancellationReason?: string;     // Optional
  cancelledBy?: string;            // Optional
}
```

## API Operations

### Queries

#### 1. Get Single Booking

```typescript
getServiceBooking(id: ID!): ServiceBooking
```

Fetches a single booking with all related data (service, client, provider).

#### 2. Get All Bookings

```typescript
getServiceBookings(
  page: Int = 1,
  pageSize: Int = 10,
  status?: String
): ServiceBookingConnection
```

List all bookings with optional status filter.

#### 3. Get Bookings by Client

```typescript
getServiceBookingsByClient(
  clientId: ID!,
  page: Int = 1,
  pageSize: Int = 10,
  status?: String
): ServiceBookingConnection
```

List all bookings for a specific client.

#### 4. Get Bookings by Provider

```typescript
getServiceBookingsByProvider(
  providerId: ID!,
  page: Int = 1,
  pageSize: Int = 10,
  status?: String
): ServiceBookingConnection
```

List all bookings for a specific provider.

#### 5. Get Bookings by Service

```typescript
getServiceBookingsByService(
  serviceId: ID!,
  page: Int = 1,
  pageSize: Int = 10
): ServiceBookingConnection
```

List all bookings for a specific service.

### Mutations

#### 1. Create Booking

```typescript
addServiceBooking(input: AddServiceBookingInput!): ServiceBooking
```

Creates a new booking after validating service availability.

#### 2. Update Booking

```typescript
updateServiceBooking(input: UpdateServiceBookingInput!): ServiceBooking
```

Updates booking details. Only provided fields are updated.

#### 3. Cancel Booking

```typescript
cancelServiceBooking(
  id: ID!,
  cancelledBy: String!,
  reason: String!
): ServiceBooking
```

Cancels a booking with reason tracking.

#### 4. Complete Booking

```typescript
completeServiceBooking(id: ID!): ServiceBooking
```

Marks a booking as completed with automatic timestamp.

## Error Handling

### Common Errors

| Error Type            | When Thrown              | HTTP Status | Message                           |
| --------------------- | ------------------------ | ----------- | --------------------------------- |
| `NotFoundError`       | Booking not found        | 404         | "Reserva no encontrada"           |
| `BadRequestError`     | Service inactive/missing | 400         | "Servicio no disponible"          |
| `InternalServerError` | Database/system error    | 500         | "Error al [operation] la reserva" |

### Error Examples

```typescript
// Service not active
{
  "errors": [{
    "message": "Servicio no disponible",
    "extensions": { "code": "BAD_REQUEST" }
  }]
}

// Booking not found
{
  "errors": [{
    "message": "Reserva no encontrada",
    "extensions": { "code": "NOT_FOUND" }
  }]
}
```

## Best Practices

### For Developers

1. **Always validate service status** before creating bookings
2. **Use transactions** for operations affecting multiple tables
3. **Handle timezone** conversions for scheduledDate
4. **Log important actions** (cancellations, completions)
5. **Test edge cases** (past dates, invalid services)

### For API Consumers

1. **Check service availability** before allowing booking creation
2. **Handle all possible statuses** in UI
3. **Display clear cancellation** policies
4. **Implement confirmation dialogs** for status changes
5. **Show loading states** during mutations

### Security Considerations

1. **Authorization**: Verify user can access/modify booking
2. **Validation**: Validate dates are in the future
3. **Rate Limiting**: Prevent booking spam
4. **Audit Trail**: Log who made changes and when

### Performance Tips

1. **Use pagination** for large result sets
2. **Index frequently queried fields** (clientId, providerId, status)
3. **Cache static data** (service details)
4. **Batch database queries** when possible

## Example Workflows

### Complete Booking Flow

```typescript
// 1. Create booking
const booking = await addServiceBooking({
  serviceId: 1,
  clientId: "client-123",
  providerId: "provider-456",
  scheduledDate: "2025-12-25T10:00:00Z",
  scheduledTimeSlot: "10:00-11:00",
  agreedPrice: 100,
  clientNotes: "Please call before arriving",
});

// 2. Provider confirms
await updateServiceBooking({
  id: booking.id,
  status: "CONFIRMED",
  providerNotes: "Confirmed for Dec 25",
});

// 3. Service in progress
await updateServiceBooking({
  id: booking.id,
  status: "IN_PROGRESS",
});

// 4. Complete
await completeServiceBooking(booking.id);
```

### Cancellation Flow

```typescript
// Client cancels with reason
await cancelServiceBooking(bookingId, "client-123", "Schedule conflict");
```

## Testing

The module includes comprehensive tests covering:

- ✅ Booking creation with valid service
- ✅ Booking creation with inactive service (should fail)
- ✅ Filtering by client, provider, service, status
- ✅ Partial updates (only updating provided fields)
- ✅ Status transitions (cancel, complete)
- ✅ Pagination functionality
- ✅ Error handling for all scenarios

Run tests:

```bash
npm test -- bookings.spec.ts
```

## Related Modules

- **Services**: Service availability validation
- **Reviews**: Can leave review after COMPLETED status
- **Quotations**: Can convert quotation to booking
- **Payments**: Payment processing integration

---

For GraphQL query examples, see [queries.md](./queries.md).
