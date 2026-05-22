# GraphQL API Reference

Complete reference for all GraphQL queries and mutations available in the Ekoru Services API.

## Table of Contents

- [Getting Started](#getting-started)
- [Service Catalog](#service-catalog)
- [Services](#services)
- [Bookings](#bookings)
- [Reviews](#reviews)
- [Quotations](#quotations)
- [Common Patterns](#common-patterns)
- [Error Handling](#error-handling)

## Getting Started

### GraphQL Endpoint

```
Development: http://localhost:4001/graphql
Production: https://api.ekoru.com/services/graphql
```

### Authentication

All requests require authentication via HTTP headers:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
X-User-ID: user-123
```

### GraphQL Playground

Access the interactive playground during development:

```
http://localhost:4001/graphql
```

---

## Service Catalog

### Get Complete Service Catalog

Retrieves all active categories with their active subcategories, ordered by `sortOrder`. The translation for the requested `language` (defaults to `ES`) is resolved directly into flat `name` / `slug` / `href` fields.

```graphql
query GetServiceCatalog($language: Language = ES) {
  getServiceCatalog(language: $language) {
    id
    name
    href
    slug
    subCategoryItems {
      id
      name
      href
      slug
    }
  }
}
```

**Response:**

```json
{
  "data": {
    "getServiceCatalog": [
      {
        "id": 1,
        "name": "Home Services",
        "href": "/home-services",
        "slug": "home-services",
        "subCategoryItems": [
          {
            "id": 1,
            "name": "Plumbing",
            "href": "/plumbing",
            "slug": "plumbing"
          }
        ]
      }
    ]
  }
}
```

### Get All Service Categories

```graphql
query GetServiceCategories {
  serviceCategories {
    id
    category
    href
    subcategories {
      id
      subCategory
      href
    }
  }
}
```

### Get Single Category

```graphql
query GetCategory($id: ID!) {
  getServiceCategory(id: $id) {
    id
    category
    href
    subcategories {
      id
      subCategory
      serviceCategoryId
      href
    }
  }
}
```

**Variables:**

```json
{
  "id": "1"
}
```

### Get Subcategories (Paginated)

```graphql
query GetSubcategories($categoryId: ID!, $page: Int, $pageSize: Int) {
  getServiceSubCategories(
    serviceCategoryId: $categoryId
    page: $page
    pageSize: $pageSize
  ) {
    edges {
      cursor
      node {
        id
        subCategory
        serviceCategoryId
        href
        serviceCount
      }
    }
    pageInfo {
      totalCount
      hasNextPage
      hasPreviousPage
      page
      pageSize
    }
  }
}
```

**Variables:**

```json
{
  "categoryId": "1",
  "page": 1,
  "pageSize": 10
}
```

### Get Single Subcategory

```graphql
query GetSubcategory($id: ID!) {
  getServiceSubCategory(id: $id) {
    id
    subCategory
    serviceCategoryId
    href
    serviceCount
    serviceCategory {
      id
      category
    }
  }
}
```

---

## Services

### Get Single Service

```graphql
query GetService($id: ID!) {
  getService(id: $id) {
    id
    name
    description
    seller {
      id
    }
    subcategoryId
    pricingType
    basePrice
    priceRange
    duration
    isActive
    images
    tags
    averageRating
    reviewCount
    createdAt
    updatedAt
    serviceCategory {
      id
      subCategory
      serviceCategoryId
      href
      serviceCategory {
        id
        category
      }
    }
  }
}
```

**Variables:**

```json
{
  "id": "1"
}
```

**Usage in Web App:**

```javascript
// React component example
import { useQuery } from "@apollo/client";
import { GET_SERVICE } from "./queries";

function ServiceDetail({ serviceId }) {
  const { loading, error, data } = useQuery(GET_SERVICE, {
    variables: { id: serviceId },
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  const service = data.getService;

  return (
    <div>
      <h1>{service.name}</h1>
      <p>{service.description}</p>
      <div>
        Rating: {service.averageRating} ⭐ ({service.reviewCount} reviews)
      </div>
      <div>Price: ${service.basePrice}</div>
    </div>
  );
}
```

### Get All Services

```graphql
query GetServices($page: Int, $pageSize: Int, $isActive: Boolean) {
  getServices(page: $page, pageSize: $pageSize, isActive: $isActive) {
    edges {
      cursor
      node {
        id
        name
        description
        basePrice
        pricingType
        averageRating
        reviewCount
        images
        isActive
      }
    }
    pageInfo {
      totalCount
      hasNextPage
      hasPreviousPage
      page
      pageSize
    }
  }
}
```

**Variables:**

```json
{
  "page": 1,
  "pageSize": 12,
  "isActive": true
}
```

**Web App Usage:**

```javascript
// Infinite scroll implementation
import { useInfiniteQuery } from "@apollo/client";

function ServiceList() {
  const { data, fetchMore, loading } = useInfiniteQuery(GET_SERVICES, {
    variables: { page: 1, pageSize: 12, isActive: true },
  });

  const loadMore = () => {
    fetchMore({
      variables: { page: data.getServices.pageInfo.page + 1 },
    });
  };

  return (
    <div>
      {data?.getServices.edges.map(({ node }) => (
        <ServiceCard key={node.id} service={node} />
      ))}
      {data?.getServices.pageInfo.hasNextPage && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

### Get Services by Seller

```graphql
query GetServicesBySeller(
  $sellerId: ID!
  $page: Int
  $pageSize: Int
  $isActive: Boolean
) {
  getServicesBySeller(
    sellerId: $sellerId
    page: $page
    pageSize: $pageSize
    isActive: $isActive
  ) {
    edges {
      node {
        id
        name
        description
        basePrice
        images
        averageRating
        reviewCount
      }
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
```

**Variables:**

```json
{
  "sellerId": "seller-123",
  "page": 1,
  "pageSize": 10,
  "isActive": true
}
```

### Get Services by Subcategory

```graphql
query GetServicesBySubcategory(
  $subcategoryId: ID!
  $page: Int
  $pageSize: Int
  $isActive: Boolean
) {
  getServicesBySubCategory(
    subcategoryId: $subcategoryId
    page: $page
    pageSize: $pageSize
    isActive: $isActive
  ) {
    edges {
      node {
        id
        name
        basePrice
        averageRating
        images
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

### Get Services by Pricing Type

```graphql
query GetServicesByPricing(
  $pricingType: ServicePricing!
  $page: Int
  $pageSize: Int
) {
  getServicesByPricingType(
    pricingType: $pricingType
    page: $page
    pageSize: $pageSize
    isActive: true
  ) {
    edges {
      node {
        id
        name
        pricingType
        basePrice
        priceRange
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

**Variables:**

```json
{
  "pricingType": "HOURLY",
  "page": 1,
  "pageSize": 10
}
```

**Pricing Types:**

- `FIXED` - Fixed price
- `VARIABLE` - Price range
- `HOURLY` - Per hour rate
- `CUSTOM` - Custom quote needed

### Create Service

```graphql
mutation CreateService($input: AddServiceInput!) {
  addService(input: $input) {
    id
    name
    description
    pricingType
    basePrice
    isActive
    createdAt
  }
}
```

**Variables:**

```json
{
  "input": {
    "name": "Professional Web Development",
    "description": "Full-stack web development services with React and Node.js",
    "sellerId": "seller-123",
    "subcategoryId": 5,
    "pricingType": "HOURLY",
    "basePrice": 75,
    "duration": 480,
    "images": ["portfolio-1.jpg", "portfolio-2.jpg"],
    "tags": ["web-dev", "full-stack", "react"],
    "isActive": true
  }
}
```

**Web App Usage:**

```javascript
import { useMutation } from "@apollo/client";

function CreateServiceForm() {
  const [createService, { loading, error }] = useMutation(CREATE_SERVICE);

  const handleSubmit = async (formData) => {
    try {
      const { data } = await createService({
        variables: { input: formData },
      });
      console.log("Service created:", data.addService);
      // Redirect to service page
    } catch (err) {
      console.error("Error creating service:", err);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Update Service

```graphql
mutation UpdateService($input: UpdateServiceInput!) {
  updateService(input: $input) {
    id
    name
    description
    basePrice
    isActive
    updatedAt
  }
}
```

**Variables:**

```json
{
  "input": {
    "id": "1",
    "name": "Updated Service Name",
    "basePrice": 85,
    "isActive": true
  }
}
```

### Delete Service

```graphql
mutation DeleteService($id: ID!) {
  deleteService(id: $id) {
    id
    name
  }
}
```

### Toggle Service Active Status

```graphql
mutation ToggleServiceActive($id: ID!) {
  toggleServiceActive(id: $id) {
    id
    isActive
    updatedAt
  }
}
```

---

## Bookings

### Get Single Booking

```graphql
query GetBooking($id: ID!) {
  getServiceBooking(id: $id) {
    id
    serviceId
    clientId
    providerId
    scheduledDate
    scheduledTimeSlot
    serviceLocation
    agreedPrice
    status
    paymentStatus
    clientNotes
    providerNotes
    cancellationReason
    cancelledBy
    completedAt
    createdAt
    updatedAt
    service {
      id
      name
      description
    }
    client {
      id
    }
    provider {
      id
    }
  }
}
```

### Get All Bookings

```graphql
query GetBookings($page: Int, $pageSize: Int, $status: String) {
  getServiceBookings(page: $page, pageSize: $pageSize, status: $status) {
    edges {
      node {
        id
        scheduledDate
        scheduledTimeSlot
        agreedPrice
        status
        paymentStatus
      }
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
```

**Variables:**

```json
{
  "page": 1,
  "pageSize": 10,
  "status": "CONFIRMED"
}
```

**Status Values:**

- `PENDING`
- `CONFIRMED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### Get Bookings by Client

```graphql
query GetClientBookings(
  $clientId: ID!
  $page: Int
  $pageSize: Int
  $status: String
) {
  getServiceBookingsByClient(
    clientId: $clientId
    page: $page
    pageSize: $pageSize
    status: $status
  ) {
    edges {
      node {
        id
        scheduledDate
        scheduledTimeSlot
        status
        service {
          name
          images
        }
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

**Web App Usage:**

```javascript
// User dashboard showing their bookings
function MyBookings({ userId }) {
  const { data, loading } = useQuery(GET_CLIENT_BOOKINGS, {
    variables: { clientId: userId, status: "CONFIRMED" },
  });

  return (
    <div>
      <h2>My Upcoming Bookings</h2>
      {data?.getServiceBookingsByClient.edges.map(({ node }) => (
        <BookingCard key={node.id} booking={node} />
      ))}
    </div>
  );
}
```

### Get Bookings by Provider

```graphql
query GetProviderBookings(
  $providerId: ID!
  $page: Int
  $pageSize: Int
  $status: String
) {
  getServiceBookingsByProvider(
    providerId: $providerId
    page: $page
    pageSize: $pageSize
    status: $status
  ) {
    edges {
      node {
        id
        scheduledDate
        scheduledTimeSlot
        status
        clientNotes
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

### Get Bookings by Service

```graphql
query GetServiceBookings($serviceId: ID!, $page: Int, $pageSize: Int) {
  getServiceBookingsByService(
    serviceId: $serviceId
    page: $page
    pageSize: $pageSize
  ) {
    edges {
      node {
        id
        scheduledDate
        status
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

### Create Booking

```graphql
mutation CreateBooking($input: AddServiceBookingInput!) {
  addServiceBooking(input: $input) {
    id
    serviceId
    scheduledDate
    scheduledTimeSlot
    agreedPrice
    status
    createdAt
  }
}
```

**Variables:**

```json
{
  "input": {
    "serviceId": 1,
    "clientId": "client-123",
    "providerId": "provider-456",
    "scheduledDate": "2025-12-25T10:00:00Z",
    "scheduledTimeSlot": "10:00-11:00",
    "serviceLocation": {
      "address": "123 Main St",
      "city": "Madrid",
      "postalCode": "28001"
    },
    "agreedPrice": 100,
    "clientNotes": "Please call before arriving"
  }
}
```

**Web App Usage:**

```javascript
function BookServiceForm({ serviceId }) {
  const [createBooking] = useMutation(CREATE_BOOKING);

  const handleBook = async (formData) => {
    try {
      const { data } = await createBooking({
        variables: {
          input: {
            serviceId,
            clientId: currentUser.id,
            providerId: service.sellerId,
            ...formData,
          },
        },
      });

      // Show success message
      toast.success("Booking created successfully!");

      // Redirect to booking details
      navigate(`/bookings/${data.addServiceBooking.id}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return <form onSubmit={handleBook}>...</form>;
}
```

### Update Booking

```graphql
mutation UpdateBooking($input: UpdateServiceBookingInput!) {
  updateServiceBooking(input: $input) {
    id
    scheduledDate
    scheduledTimeSlot
    status
    updatedAt
  }
}
```

**Variables:**

```json
{
  "input": {
    "id": "1",
    "scheduledDate": "2025-12-26T14:00:00Z",
    "status": "CONFIRMED",
    "providerNotes": "Confirmed for Dec 26"
  }
}
```

### Cancel Booking

```graphql
mutation CancelBooking($id: ID!, $cancelledBy: String!, $reason: String!) {
  cancelServiceBooking(id: $id, cancelledBy: $cancelledBy, reason: $reason) {
    id
    status
    cancellationReason
    cancelledBy
    updatedAt
  }
}
```

**Variables:**

```json
{
  "id": "1",
  "cancelledBy": "client-123",
  "reason": "Schedule conflict"
}
```

### Complete Booking

```graphql
mutation CompleteBooking($id: ID!) {
  completeServiceBooking(id: $id) {
    id
    status
    completedAt
  }
}
```

---

## Reviews

### Get Service Reviews

```graphql
query GetServiceReviews($serviceId: ID!, $page: Int, $pageSize: Int) {
  getServiceReviews(serviceId: $serviceId, page: $page, pageSize: $pageSize) {
    edges {
      node {
        id
        rating
        comment
        createdAt
        reviewer {
          id
        }
      }
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
```

**Variables:**

```json
{
  "serviceId": "1",
  "page": 1,
  "pageSize": 10
}
```

**Web App Usage:**

```javascript
function ServiceReviews({ serviceId }) {
  const { data, loading } = useQuery(GET_SERVICE_REVIEWS, {
    variables: { serviceId, page: 1, pageSize: 10 },
  });

  const reviews = data?.getServiceReviews.edges || [];

  return (
    <div className="reviews">
      <h3>Customer Reviews ({data?.getServiceReviews.pageInfo.totalCount})</h3>
      {reviews.map(({ node }) => (
        <ReviewCard key={node.id} review={node} />
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="review-card">
      <div className="rating">{"⭐".repeat(review.rating)}</div>
      <p>{review.comment}</p>
      <small>{new Date(review.createdAt).toLocaleDateString()}</small>
    </div>
  );
}
```

### Get Reviews by Reviewer

```graphql
query GetReviewerReviews($reviewerId: ID!, $page: Int, $pageSize: Int) {
  getServiceReviewsByReviewer(
    reviewerId: $reviewerId
    page: $page
    pageSize: $pageSize
  ) {
    edges {
      node {
        id
        rating
        comment
        createdAt
        serviceId
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

### Create Review

```graphql
mutation CreateReview($input: AddServiceReviewInput!) {
  addServiceReview(input: $input) {
    id
    rating
    comment
    createdAt
    service {
      id
      name
    }
  }
}
```

**Variables:**

```json
{
  "input": {
    "serviceId": 1,
    "reviewerId": "user-123",
    "rating": 5,
    "comment": "Excellent service! Very professional and on time."
  }
}
```

**Web App Usage:**

```javascript
function LeaveReviewForm({ serviceId, bookingId }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [createReview] = useMutation(CREATE_REVIEW);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createReview({
        variables: {
          input: {
            serviceId,
            reviewerId: currentUser.id,
            rating,
            comment,
          },
        },
        // Update service query cache
        refetchQueries: ["GetService"],
      });

      toast.success("Review submitted successfully!");
    } catch (error) {
      if (error.message.includes("Ya has reseñado")) {
        toast.error("You have already reviewed this service");
      } else {
        toast.error("Error submitting review");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience..."
      />
      <button type="submit">Submit Review</button>
    </form>
  );
}
```

### Delete Review

```graphql
mutation DeleteReview($id: ID!) {
  deleteServiceReview(id: $id)
}
```

**Returns:** `true` if successful, `false` if error occurred.

---

## Quotations

### Get Single Quotation

```graphql
query GetQuotation($id: ID!) {
  getQuotation(id: $id) {
    id
    serviceId
    clientId
    providerId
    title
    description
    estimatedPrice
    finalPrice
    estimatedDuration
    status
    clientNotes
    providerNotes
    attachments
    createdAt
    updatedAt
    expiresAt
    acceptedAt
    completedAt
    service {
      id
      name
      pricingType
    }
  }
}
```

### Get Quotations by Client

```graphql
query GetClientQuotations($clientId: ID!, $page: Int, $pageSize: Int) {
  getQuotationsByClient(clientId: $clientId, page: $page, pageSize: $pageSize) {
    edges {
      node {
        id
        title
        estimatedPrice
        status
        expiresAt
        createdAt
      }
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
```

**Web App Usage:**

```javascript
function MyQuotations({ userId }) {
  const { data } = useQuery(GET_CLIENT_QUOTATIONS, {
    variables: { clientId: userId, page: 1, pageSize: 10 },
  });

  return (
    <div>
      <h2>My Quotation Requests</h2>
      {data?.getQuotationsByClient.edges.map(({ node }) => (
        <QuotationCard key={node.id} quotation={node} />
      ))}
    </div>
  );
}
```

### Get Quotations by Provider

```graphql
query GetProviderQuotations($providerId: ID!, $page: Int, $pageSize: Int) {
  getQuotationsByProvider(
    providerId: $providerId
    page: $page
    pageSize: $pageSize
  ) {
    edges {
      node {
        id
        title
        estimatedPrice
        status
        clientNotes
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

### Get Quotations by Service

```graphql
query GetServiceQuotations($serviceId: ID!, $page: Int, $pageSize: Int) {
  getQuotationsByService(
    serviceId: $serviceId
    page: $page
    pageSize: $pageSize
  ) {
    edges {
      node {
        id
        title
        estimatedPrice
        status
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

### Get Quotations by Status

```graphql
query GetQuotationsByStatus(
  $status: QuotationStatus!
  $page: Int
  $pageSize: Int
) {
  getQuotationsByStatus(status: $status, page: $page, pageSize: $pageSize) {
    edges {
      node {
        id
        title
        estimatedPrice
        status
        expiresAt
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

**Status Values:**

- `PENDING`
- `ACCEPTED`
- `DECLINED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### Create Quotation

```graphql
mutation CreateQuotation($input: AddQuotationInput!) {
  addQuotation(input: $input) {
    id
    title
    description
    estimatedPrice
    estimatedDuration
    status
    expiresAt
    createdAt
  }
}
```

**Variables:**

```json
{
  "input": {
    "serviceId": 1,
    "clientId": "client-123",
    "providerId": "provider-456",
    "title": "Custom Website Development",
    "description": "Need a custom e-commerce website with payment integration",
    "estimatedPrice": 5000,
    "estimatedDuration": 14400,
    "clientNotes": "Need it completed within 2 months",
    "attachments": ["requirements.pdf"],
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

**Web App Usage:**

```javascript
function RequestQuotationForm({ serviceId, providerId }) {
  const [createQuotation] = useMutation(CREATE_QUOTATION);

  const handleSubmit = async (formData) => {
    try {
      const { data } = await createQuotation({
        variables: {
          input: {
            serviceId,
            clientId: currentUser.id,
            providerId,
            ...formData,
          },
        },
      });

      toast.success("Quotation request sent!");
      navigate(`/quotations/${data.addQuotation.id}`);
    } catch (error) {
      toast.error("Error sending quotation request");
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Update Quotation

```graphql
mutation UpdateQuotation($input: UpdateQuotationInput!) {
  updateQuotation(input: $input) {
    id
    estimatedPrice
    finalPrice
    status
    providerNotes
    updatedAt
  }
}
```

**Variables:**

```json
{
  "input": {
    "id": "1",
    "estimatedPrice": 4500,
    "finalPrice": 4500,
    "providerNotes": "Reduced price for simplified scope"
  }
}
```

### Accept Quotation

```graphql
mutation AcceptQuotation($id: ID!) {
  acceptQuotation(id: $id) {
    id
    status
    acceptedAt
    updatedAt
  }
}
```

**Web App Usage:**

```javascript
function QuotationActions({ quotation }) {
  const [acceptQuotation] = useMutation(ACCEPT_QUOTATION);

  const handleAccept = async () => {
    if (confirm("Accept this quotation?")) {
      try {
        await acceptQuotation({
          variables: { id: quotation.id },
        });
        toast.success("Quotation accepted!");
      } catch (error) {
        toast.error("Error accepting quotation");
      }
    }
  };

  return <button onClick={handleAccept}>Accept Quotation</button>;
}
```

### Decline Quotation

```graphql
mutation DeclineQuotation($id: ID!, $reason: String) {
  declineQuotation(id: $id, reason: $reason) {
    id
    status
    providerNotes
    updatedAt
  }
}
```

**Variables:**

```json
{
  "id": "1",
  "reason": "Timeline conflicts with current projects"
}
```

### Complete Quotation

```graphql
mutation CompleteQuotation($id: ID!) {
  completeQuotation(id: $id) {
    id
    status
    completedAt
    updatedAt
  }
}
```

### Cancel Quotation

```graphql
mutation CancelQuotation($id: ID!, $reason: String) {
  cancelQuotation(id: $id, reason: $reason) {
    id
    status
    providerNotes
    updatedAt
  }
}
```

### Delete Quotation

```graphql
mutation DeleteQuotation($id: ID!) {
  deleteQuotation(id: $id)
}
```

**Returns:** `true` if successful, `false` if error occurred.

---

## Common Patterns

### Pagination

All paginated queries follow the same pattern:

```graphql
query PaginatedQuery($page: Int, $pageSize: Int) {
  someQuery(page: $page, pageSize: $pageSize) {
    edges {
      cursor
      node {
        # Entity fields
      }
    }
    pageInfo {
      totalCount
      hasNextPage
      hasPreviousPage
      page
      pageSize
    }
  }
}
```

**Implementing Pagination in React:**

```javascript
function PaginatedList({ queryHook, variables }) {
  const [page, setPage] = useState(1);
  const { data, loading } = queryHook({
    variables: { ...variables, page, pageSize: 10 },
  });

  const { edges, pageInfo } = data?.result || { edges: [], pageInfo: {} };

  return (
    <div>
      {edges.map(({ node }) => (
        <Item key={node.id} data={node} />
      ))}

      <Pagination
        current={page}
        total={pageInfo.totalCount}
        pageSize={pageInfo.pageSize}
        onChange={setPage}
      />
    </div>
  );
}
```

### Error Handling

```javascript
import { ApolloError } from "@apollo/client";

function handleGraphQLError(error) {
  if (error.graphQLErrors) {
    error.graphQLErrors.forEach(({ message, extensions }) => {
      switch (extensions.code) {
        case "NOT_FOUND":
          toast.error("Item not found");
          break;
        case "BAD_REQUEST":
          toast.error(message);
          break;
        case "INTERNAL_SERVER_ERROR":
          toast.error("Server error. Please try again.");
          break;
        default:
          toast.error("An error occurred");
      }
    });
  }

  if (error.networkError) {
    toast.error("Network error. Check your connection.");
  }
}

// Usage
const [mutation] = useMutation(SOME_MUTATION, {
  onError: handleGraphQLError,
});
```

### Optimistic Updates

```javascript
const [updateBooking] = useMutation(UPDATE_BOOKING, {
  optimisticResponse: {
    updateServiceBooking: {
      __typename: "ServiceBooking",
      id: bookingId,
      status: "CONFIRMED",
      updatedAt: new Date().toISOString(),
    },
  },
  update: (cache, { data }) => {
    // Update cache immediately
    cache.modify({
      id: cache.identify(data.updateServiceBooking),
      fields: {
        status: () => data.updateServiceBooking.status,
      },
    });
  },
});
```

### Cache Management

```javascript
// Refetch queries after mutation
const [createBooking] = useMutation(CREATE_BOOKING, {
  refetchQueries: [
    { query: GET_CLIENT_BOOKINGS, variables: { clientId } },
    { query: GET_SERVICE_BOOKINGS, variables: { serviceId } },
  ],
});

// Update cache manually
const [deleteService] = useMutation(DELETE_SERVICE, {
  update(cache, { data: { deleteService } }) {
    cache.evict({ id: cache.identify(deleteService) });
    cache.gc();
  },
});
```

### Real-time Updates with Polling

```javascript
const { data, startPolling, stopPolling } = useQuery(GET_BOOKINGS, {
  variables: { clientId, status: "PENDING" },
  pollInterval: 30000, // Poll every 30 seconds
});

useEffect(() => {
  startPolling(30000);
  return () => stopPolling();
}, [startPolling, stopPolling]);
```

---

## Error Handling

### Error Codes

| Code                    | HTTP Status | Meaning                                  |
| ----------------------- | ----------- | ---------------------------------------- |
| `NOT_FOUND`             | 404         | Resource not found                       |
| `BAD_REQUEST`           | 400         | Invalid input or business rule violation |
| `INTERNAL_SERVER_ERROR` | 500         | Server error                             |

### Example Error Response

```json
{
  "errors": [
    {
      "message": "Servicio no disponible",
      "extensions": {
        "code": "BAD_REQUEST"
      },
      "path": ["addServiceBooking"]
    }
  ],
  "data": null
}
```

### Handling Errors in Web App

```javascript
function ErrorBoundary({ error }) {
  if (!error) return null;

  const errorCode = error.graphQLErrors?.[0]?.extensions?.code;
  const errorMessage = error.message;

  return (
    <div className="error-alert">
      {errorCode === "NOT_FOUND" && <p>The requested item was not found.</p>}
      {errorCode === "BAD_REQUEST" && <p>{errorMessage}</p>}
      {errorCode === "INTERNAL_SERVER_ERROR" && (
        <p>Something went wrong. Please try again later.</p>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Always Use Variables

❌ **Don't:**

```graphql
query {
  getService(id: "1") {
    name
  }
}
```

✅ **Do:**

```graphql
query GetService($id: ID!) {
  getService(id: $id) {
    name
  }
}
```

### 2. Request Only Needed Fields

❌ **Don't:**

```graphql
query {
  getServices {
    edges {
      node {
        # All fields even if not needed
        id
        name
        description
        seller { id }
        ...50 more fields
      }
    }
  }
}
```

✅ **Do:**

```graphql
query {
  getServices {
    edges {
      node {
        id
        name
        basePrice
        images
      }
    }
  }
}
```

### 3. Use Fragments for Repeated Fields

```graphql
fragment ServiceCardFields on Service {
  id
  name
  basePrice
  averageRating
  reviewCount
  images
}

query GetServices {
  getServices {
    edges {
      node {
        ...ServiceCardFields
      }
    }
  }
}

query GetServicesByCategory {
  getServicesBySubCategory {
    edges {
      node {
        ...ServiceCardFields
      }
    }
  }
}
```

### 4. Implement Proper Loading States

```javascript
function ServiceList() {
  const { data, loading, error } = useQuery(GET_SERVICES);

  if (loading) return <Skeleton count={10} />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.getServices.edges.length) {
    return <EmptyState message="No services found" />;
  }

  return (
    <div>
      {data.getServices.edges.map(({ node }) => (
        <ServiceCard key={node.id} service={node} />
      ))}
    </div>
  );
}
```

### 5. Use TypeScript for Type Safety

```typescript
// Generate types from schema
import { GetServicesQuery, Service } from './generated/graphql';

interface ServiceCardProps {
  service: Service;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  // TypeScript knows all service fields
  return (
    <div>
      <h3>{service.name}</h3>
      <p>${service.basePrice}</p>
    </div>
  );
};
```

---

For detailed business logic, see the module documentation:

- [Bookings Module](./bookings.md)
- [Quotations Module](./quotations.md)
- [Reviews Module](./reviews.md)
- [Services Module](./services.md)
