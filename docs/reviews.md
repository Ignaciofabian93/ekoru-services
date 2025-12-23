# Reviews Module Documentation

## Overview

The Reviews module manages service ratings and feedback from clients. It enables users to rate services, leave comments, and helps build trust through transparent reviews. The system prevents duplicate reviews and calculates average ratings automatically.

## Table of Contents

- [Architecture](#architecture)
- [Business Logic](#business-logic)
- [Key Features](#key-features)
- [Data Model](#data-model)
- [API Operations](#api-operations)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Architecture

### Module Structure

```
reviews/
├── dto/
│   ├── add-service-review.input.ts     # Create review input
│   └── index.ts
├── entities/
│   ├── service-review.entity.ts        # GraphQL entity
│   ├── service-review-connection.entity.ts  # Paginated response
│   └── index.ts
├── reviews.module.ts                    # Module definition
├── reviews.resolver.ts                  # GraphQL resolver
├── reviews.service.ts                   # Business logic
└── reviews.spec.ts                      # Unit tests
```

### Dependencies

- **PrismaService**: Database operations
- **Common Utilities**: Pagination, error handling
- **GraphQL**: Query/mutation resolvers

## Business Logic

### Review Creation Flow

1. **Duplicate Check**: Verify user hasn't already reviewed this service
2. **Validation**: Ensure rating is between 1-5
3. **Creation**: Insert review record
4. **Response**: Return review with service details

```typescript
async addServiceReview(input: AddServiceReviewInput) {
  // 1. Check for existing review
  const existingReview = await this.prisma.serviceReview.findFirst({
    where: {
      serviceId: input.serviceId,
      reviewerId: input.reviewerId
    }
  });

  if (existingReview) {
    throw new BadRequestError('Ya has reseñado este servicio');
  }

  // 2. Create review
  const review = await this.prisma.serviceReview.create({
    data: input
  });

  return review;
}
```

### Average Rating Calculation

Average ratings are calculated in the Services module when fetching services:

```typescript
const averageRating =
  service.serviceReview.length > 0
    ? service.serviceReview.reduce((sum, review) => sum + review.rating, 0) /
      service.serviceReview.length
    : 0;
```

### Deletion Flow

Reviews can be permanently deleted:

```typescript
async deleteServiceReview(id: number): Promise<boolean> {
  try {
    await this.prisma.serviceReview.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
```

**Returns:**

- `true`: Successfully deleted
- `false`: Error occurred (review not found, database error)

## Key Features

### 1. Duplicate Prevention

The system prevents users from reviewing the same service multiple times:

- ✅ One review per user per service
- ❌ Throws `BadRequestError` if duplicate detected
- 🔄 Users must delete old review before creating new one

```typescript
// Duplicate check uses composite key
{
  serviceId: 1,
  reviewerId: "user-123"
}
```

### 2. Rating System

Simple 5-star rating system:

- **Minimum**: 1 star
- **Maximum**: 5 stars
- **Type**: Integer (whole stars only)

### 3. Optional Comments

Reviews can include text comments:

```typescript
{
  rating: 5,
  comment: "Excellent service! Very professional." // Optional
}
```

### 4. Filtering Capabilities

Query reviews by:

- **Service ID**: All reviews for a specific service
- **Reviewer ID**: All reviews written by a user

### 5. Pagination Support

All list queries support pagination:

```typescript
getServiceReviews(
  serviceId: 1,
  page: 1,
  pageSize: 10
)
```

### 6. Immutable Reviews

Once created, reviews cannot be edited:

- ❌ No update operation
- ✅ Can only delete and recreate
- 📌 Ensures review authenticity

## Data Model

### ServiceReview Entity

```typescript
{
  id: number; // Primary key
  serviceId: number; // Foreign key to Service
  reviewerId: string; // User ID who wrote review

  // Content
  rating: number; // 1-5 star rating
  comment: string; // Text review (optional)

  // Timestamps
  createdAt: DateTime; // When review was created

  // Relations
  service: Service; // Related service
  reviewer: User; // Reviewer details
}
```

### Input DTOs

**AddServiceReviewInput:**

```typescript
{
  serviceId: number; // Required
  reviewerId: string; // Required
  rating: number; // Required (1-5)
  comment: string; // Optional
}
```

## API Operations

### Queries

#### 1. Get Reviews by Service

```typescript
getServiceReviews(
  serviceId: ID!,
  page: Int = 1,
  pageSize: Int = 10
): ServiceReviewConnection
```

Lists all reviews for a specific service with pagination.

**Use cases:**

- Display reviews on service detail page
- Calculate average rating
- Show recent reviews

**Returns:**

```typescript
{
  edges: [
    {
      cursor: "cursor-string",
      node: {
        id: 1,
        rating: 5,
        comment: "Great service!",
        createdAt: "2025-12-23T10:00:00Z",
        reviewer: { id: "user-123" }
      }
    }
  ],
  pageInfo: {
    totalCount: 25,
    hasNextPage: true,
    hasPreviousPage: false,
    page: 1,
    pageSize: 10
  }
}
```

#### 2. Get Reviews by Reviewer

```typescript
getServiceReviewsByReviewer(
  reviewerId: ID!,
  page: Int = 1,
  pageSize: Int = 10
): ServiceReviewConnection
```

Lists all reviews written by a specific user.

**Use cases:**

- User profile page
- Review history
- User activity tracking

### Mutations

#### 1. Create Review

```typescript
addServiceReview(input: AddServiceReviewInput!): ServiceReview
```

Creates a new service review.

**Validation:**

- ✅ Service must exist
- ✅ User must not have existing review for this service
- ✅ Rating must be 1-5

**Side effects:**

- Updates service's average rating (calculated on read)
- Increments service's review count

**Returns:**

```typescript
{
  id: 1,
  serviceId: 1,
  rating: 5,
  comment: "Excellent service!",
  createdAt: "2025-12-23T10:00:00Z",
  reviewer: { id: "user-123" },
  service: {
    id: 1,
    name: "Service Name",
    description: "Service description"
  }
}
```

#### 2. Delete Review

```typescript
deleteServiceReview(id: ID!): Boolean
```

Permanently deletes a review.

**Returns:**

- `true`: Successfully deleted
- `false`: Error occurred

**Use cases:**

- User removes their review
- Admin removes inappropriate review
- Compliance with data deletion requests

## Error Handling

### Common Errors

| Error Type            | When Thrown      | HTTP Status | Message                                 |
| --------------------- | ---------------- | ----------- | --------------------------------------- |
| `BadRequestError`     | Duplicate review | 400         | "Ya has reseñado este servicio"         |
| `InternalServerError` | Database error   | 500         | "Error al crear la reseña del servicio" |

### Error Examples

```typescript
// Duplicate review attempt
{
  "errors": [{
    "message": "Ya has reseñado este servicio",
    "extensions": { "code": "BAD_REQUEST" }
  }]
}

// Database error
{
  "errors": [{
    "message": "Error al obtener las reseñas del servicio",
    "extensions": { "code": "INTERNAL_SERVER_ERROR" }
  }]
}
```

## Best Practices

### For Developers

1. **Duplicate Prevention**: Always check for existing reviews
2. **Rating Validation**: Ensure rating is 1-5
3. **Soft Delete**: Consider soft delete instead of permanent deletion
4. **Audit Trail**: Log review creation and deletion
5. **Moderation**: Implement review moderation workflow

### For API Consumers

1. **Verification**: Only allow reviews from verified users
2. **Service Completion**: Require completed booking before review
3. **Edit Simulation**: Allow "edit" by deleting and recreating
4. **Rating Display**: Show stars visually, not just numbers
5. **Comment Guidelines**: Display character limits and guidelines

### Security Considerations

1. **Authorization**: Verify user identity before creation
2. **Rate Limiting**: Prevent review spam
3. **Content Moderation**: Filter inappropriate content
4. **Ownership**: Only allow users to delete their own reviews
5. **Validation**: Sanitize comment text

### Performance Tips

1. **Indexing**: Index serviceId and reviewerId
2. **Pagination**: Always paginate review lists
3. **Caching**: Cache average ratings
4. **Aggregation**: Pre-calculate review statistics

## Example Workflows

### Complete Review Flow

```typescript
// 1. User completes service booking
await completeServiceBooking(bookingId);

// 2. User leaves review
const review = await addServiceReview({
  serviceId: 1,
  reviewerId: "user-123",
  rating: 5,
  comment: "Excellent service! Very professional and on time.",
});

// 3. Service now shows updated rating
const service = await getService(1);
console.log(service.averageRating); // Updated average
console.log(service.reviewCount); // Incremented count
```

### Edit Review Flow

Since reviews are immutable, simulate editing:

```typescript
// 1. Delete existing review
await deleteServiceReview(oldReviewId);

// 2. Create new review with updated content
await addServiceReview({
  serviceId: 1,
  reviewerId: "user-123",
  rating: 4, // Changed from 5
  comment: "Good service, minor delay in delivery",
});
```

### Display Reviews Flow

```typescript
// Fetch paginated reviews for a service
const reviews = await getServiceReviews(
  serviceId: 1,
  page: 1,
  pageSize: 10
);

// Display in UI
reviews.edges.forEach(({ node }) => {
  console.log(`Rating: ${'⭐'.repeat(node.rating)}`);
  console.log(`Comment: ${node.comment}`);
  console.log(`Date: ${formatDate(node.createdAt)}`);
});
```

## Business Rules

### Review Eligibility

Before allowing review creation, verify:

1. ✅ User has completed booking for this service
2. ✅ Booking status is COMPLETED
3. ✅ User hasn't already reviewed this service
4. ✅ Service still exists and is not deleted

### Rating Guidelines

- **1 Star**: Very poor
- **2 Stars**: Poor
- **3 Stars**: Average
- **4 Stars**: Good
- **5 Stars**: Excellent

### Content Moderation

Reviews should be moderated for:

- Profanity and inappropriate language
- Personal information (phone, email, address)
- Spam and promotional content
- Off-topic comments
- Harassment or threats

## Testing

The module includes comprehensive tests covering:

- ✅ Review creation with valid data
- ✅ Duplicate review prevention
- ✅ Rating validation (1-5)
- ✅ Optional comment handling
- ✅ Filtering by service and reviewer
- ✅ Pagination functionality
- ✅ Deletion (returns boolean)
- ✅ Error handling for all scenarios

Run tests:

```bash
npm test -- reviews.spec.ts
```

## Integration with Services Module

### Average Rating Calculation

When fetching a service:

```typescript
const service = await getService(1);

// Returns:
{
  id: 1,
  name: "Service Name",
  averageRating: 4.5,    // Calculated from all reviews
  reviewCount: 10,        // Total number of reviews
  serviceReview: [...]    // Array of review objects
}
```

### Review Display

Services should display:

1. **Average Rating**: e.g., 4.5 ⭐
2. **Review Count**: e.g., "Based on 10 reviews"
3. **Recent Reviews**: Show 3-5 most recent
4. **Rating Distribution**: Histogram of 1-5 star counts

## Related Modules

- **Services**: Average rating calculation
- **Bookings**: Review eligibility (must complete booking)
- **Users**: Reviewer information
- **Moderation**: Content filtering (if implemented)

## Future Enhancements

Potential improvements:

1. **Helpful Votes**: Users can mark reviews as helpful
2. **Review Responses**: Service providers can respond
3. **Verified Reviews**: Badge for verified bookings
4. **Review Photos**: Attach images to reviews
5. **Edit History**: Track review changes
6. **Flagging**: Users can report inappropriate reviews

---

For GraphQL query examples, see [queries.md](./queries.md).
