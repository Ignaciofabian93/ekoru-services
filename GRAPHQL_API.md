# ekoru-services — GraphQL API Reference

> **Subgraph**: Services marketplace — service catalog, service listings, bookings, quotations, and reviews.

---

## Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | Some mutations | `Bearer <jwt_token>` |
| `x-seller-id` | Authenticated mutations | Seller UUID from auth |

---

## Enums

```graphql
enum ServicePricing {
  FIXED      # Fixed price
  QUOTATION  # Custom quote required
  HOURLY     # Price per hour
  PACKAGE    # Package deal
}

enum QuotationStatus {
  PENDING
  ACCEPTED
  DECLINED
  COMPLETED
  CANCELLED
  EXPIRED
}

# Booking status values (String field):
# PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED

# Booking payment status values (String field):
# PENDING | PARTIAL | PAID
```

---

## Fragments

```graphql
fragment PageInfoFields on PageInfo {
  totalCount
  totalPages
  currentPage
  pageSize
  hasNextPage
  hasPreviousPage
}

fragment ServiceCategoryFields on ServiceCategory {
  id
  translation {
    category
    slug
    href
  }
}

fragment ServiceSubCategoryFields on ServiceSubCategory {
  id
  translation {
    subCategory
    slug
    href
  }
}

fragment ServiceFields on Service {
  id
  name
  description
  sellerId
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
  viewCount
  isRemoteService
  serviceRadius
  serviceLocations
  availabilitySchedule
  isCurrentlyAvailable
  maxConcurrentBookings
  advanceBookingDays
  createdAt
  updatedAt
}

fragment ServiceReviewFields on ServiceReview {
  id
  serviceId
  reviewerId
  rating
  comment
  quotationId
  bookingId
  isVerifiedPurchase
  helpfulCount
  reportCount
  providerResponse
  providerResponseAt
  createdAt
}

fragment QuotationFields on Quotation {
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
  expiresAt
  acceptedAt
  completedAt
  depositAmount
  depositPaid
  estimatedStartDate
  estimatedCompletionDate
  actualStartDate
  actualCompletionDate
  declineReason
  cancellationReason
  createdAt
  updatedAt
}

fragment ServiceBookingFields on ServiceBooking {
  id
  serviceId
  clientId
  providerId
  bookingDate
  scheduledDate
  scheduledTimeSlot
  serviceLocation
  agreedPrice
  paymentStatus
  status
  clientNotes
  providerNotes
  completedAt
  cancellationReason
  cancelledBy
  createdAt
  updatedAt
}
```

---

## Queries

### getServiceCatalog

Returns the complete service catalog with sub-categories — ideal for top-level navigation. Accepts a `language` argument (defaults to `ES`) and resolves the matching translation directly into flat `name` / `slug` / `href` fields, mirroring the marketplace and stores subgraphs.

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

---

### getServiceCategories

Paginated list of service categories with translation resolution by language.

```graphql
query GetServiceCategories(
  $limit: Int = 20
  $offset: Int = 0
  $language: Language = ES
) {
  getServiceCategories(limit: $limit, offset: $offset, language: $language) {
    ...ServiceCategoryFields
    subcategories {
      ...ServiceSubCategoryFields
    }
  }
}
```

**Variables**
```json
{ "limit": 20, "offset": 0, "language": "ES" }
```

---

### getServiceCategoryBySlug

```graphql
query GetServiceCategoryBySlug($slug: String!, $language: Language!) {
  getServiceCategoryBySlug(slug: $slug, language: $language) {
    ...ServiceCategoryFields
    subcategories {
      ...ServiceSubCategoryFields
    }
  }
}
```

**Variables**
```json
{ "slug": "diseno-grafico", "language": "ES" }
```

---

### getServiceSubCategories

Paginated list of service sub-categories with translation resolution by language.

```graphql
query GetServiceSubCategories(
  $limit: Int = 20
  $offset: Int = 0
  $language: Language = ES
) {
  getServiceSubCategories(limit: $limit, offset: $offset, language: $language) {
    ...ServiceSubCategoryFields
  }
}
```

**Variables**
```json
{ "limit": 20, "offset": 0, "language": "ES" }
```

---

### getServiceSubCategoryBySlug

```graphql
query GetServiceSubCategoryBySlug($slug: String!, $language: Language) {
  getServiceSubCategoryBySlug(slug: $slug, language: $language) {
    ...ServiceSubCategoryFields
  }
}
```

**Variables**
```json
{ "slug": "fotografia-bodas", "language": "ES" }
```

---

### getService

```graphql
query GetService($id: ID!) {
  getService(id: $id) {
    ...ServiceFields
  }
}
```

**Variables**
```json
{ "id": "42" }
```

---

### getServices

```graphql
query GetServices(
  $page: Int = 1
  $pageSize: Int = 10
  $isActive: Boolean
) {
  getServices(page: $page, pageSize: $pageSize, isActive: $isActive) {
    nodes {
      ...ServiceFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "page": 1, "pageSize": 10, "isActive": true }
```

---

### getServicesBySeller

```graphql
query GetServicesBySeller(
  $sellerId: ID!
  $page: Int = 1
  $pageSize: Int = 10
  $isActive: Boolean
) {
  getServicesBySeller(
    sellerId: $sellerId
    page: $page
    pageSize: $pageSize
    isActive: $isActive
  ) {
    nodes {
      ...ServiceFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "sellerId": "seller-uuid-here", "page": 1, "pageSize": 10 }
```

---

### getServicesBySubCategory

```graphql
query GetServicesBySubCategory(
  $subcategoryId: ID!
  $page: Int = 1
  $pageSize: Int = 10
  $isActive: Boolean
) {
  getServicesBySubCategory(
    subcategoryId: $subcategoryId
    page: $page
    pageSize: $pageSize
    isActive: $isActive
  ) {
    nodes {
      ...ServiceFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

---

### getServicesByPricingType

```graphql
query GetServicesByPricingType(
  $pricingType: ServicePricing!
  $page: Int = 1
  $pageSize: Int = 10
  $isActive: Boolean
) {
  getServicesByPricingType(
    pricingType: $pricingType
    page: $page
    pageSize: $pageSize
    isActive: $isActive
  ) {
    nodes {
      ...ServiceFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "pricingType": "FIXED", "page": 1, "pageSize": 10 }
```

---

### getServiceReviews

```graphql
query GetServiceReviews(
  $serviceId: ID!
  $page: Int = 1
  $pageSize: Int = 10
) {
  getServiceReviews(
    serviceId: $serviceId
    page: $page
    pageSize: $pageSize
  ) {
    nodes {
      ...ServiceReviewFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "serviceId": "42", "page": 1, "pageSize": 10 }
```

---

### getServiceReviewsByReviewer

```graphql
query GetServiceReviewsByReviewer(
  $reviewerId: ID!
  $page: Int = 1
  $pageSize: Int = 10
) {
  getServiceReviewsByReviewer(
    reviewerId: $reviewerId
    page: $page
    pageSize: $pageSize
  ) {
    nodes {
      ...ServiceReviewFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "reviewerId": "seller-uuid-here", "page": 1, "pageSize": 10 }
```

---

### getQuotation

```graphql
query GetQuotation($id: ID!) {
  getQuotation(id: $id) {
    ...QuotationFields
  }
}
```

**Variables**
```json
{ "id": "15" }
```

---

### getQuotationsByClient

```graphql
query GetQuotationsByClient(
  $clientId: ID!
  $page: Int = 1
  $pageSize: Int = 10
) {
  getQuotationsByClient(
    clientId: $clientId
    page: $page
    pageSize: $pageSize
  ) {
    nodes {
      ...QuotationFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "clientId": "seller-uuid-here", "page": 1, "pageSize": 10 }
```

---

### getQuotationsByProvider

```graphql
query GetQuotationsByProvider(
  $providerId: ID!
  $page: Int = 1
  $pageSize: Int = 10
) {
  getQuotationsByProvider(
    providerId: $providerId
    page: $page
    pageSize: $pageSize
  ) {
    nodes {
      ...QuotationFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

---

### getQuotationsByService

```graphql
query GetQuotationsByService(
  $serviceId: ID!
  $page: Int = 1
  $pageSize: Int = 10
) {
  getQuotationsByService(
    serviceId: $serviceId
    page: $page
    pageSize: $pageSize
  ) {
    nodes {
      ...QuotationFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

---

### getQuotationsByStatus

```graphql
query GetQuotationsByStatus(
  $status: QuotationStatus!
  $page: Int = 1
  $pageSize: Int = 10
) {
  getQuotationsByStatus(
    status: $status
    page: $page
    pageSize: $pageSize
  ) {
    nodes {
      ...QuotationFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "status": "PENDING", "page": 1, "pageSize": 10 }
```

---

### getServiceBooking

```graphql
query GetServiceBooking($id: ID!) {
  getServiceBooking(id: $id) {
    ...ServiceBookingFields
  }
}
```

**Variables**
```json
{ "id": "25" }
```

---

### getServiceBookings

Returns all bookings with optional status filter.

```graphql
query GetServiceBookings(
  $page: Int = 1
  $pageSize: Int = 10
  $status: String
) {
  getServiceBookings(page: $page, pageSize: $pageSize, status: $status) {
    nodes {
      ...ServiceBookingFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "page": 1, "pageSize": 10, "status": "CONFIRMED" }
```

---

### getServiceBookingsByClient

```graphql
query GetServiceBookingsByClient(
  $clientId: ID!
  $page: Int = 1
  $pageSize: Int = 10
  $status: String
) {
  getServiceBookingsByClient(
    clientId: $clientId
    page: $page
    pageSize: $pageSize
    status: $status
  ) {
    nodes {
      ...ServiceBookingFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "clientId": "seller-uuid-here", "page": 1, "pageSize": 10 }
```

---

### getServiceBookingsByProvider

```graphql
query GetServiceBookingsByProvider(
  $providerId: ID!
  $page: Int = 1
  $pageSize: Int = 10
  $status: String
) {
  getServiceBookingsByProvider(
    providerId: $providerId
    page: $page
    pageSize: $pageSize
    status: $status
  ) {
    nodes {
      ...ServiceBookingFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "providerId": "seller-uuid-here", "page": 1, "pageSize": 10, "status": "PENDING" }
```

---

### getServiceBookingsByService

```graphql
query GetServiceBookingsByService(
  $serviceId: ID!
  $page: Int = 1
  $pageSize: Int = 10
) {
  getServiceBookingsByService(
    serviceId: $serviceId
    page: $page
    pageSize: $pageSize
  ) {
    nodes {
      ...ServiceBookingFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "serviceId": "42", "page": 1, "pageSize": 10 }
```

---

## Mutations

### addService

```graphql
mutation AddService($input: AddServiceInput!) {
  addService(input: $input) {
    ...ServiceFields
  }
}
```

**Variables**
```json
{
  "input": {
    "name": "Diseño de Logo Profesional",
    "description": "Diseño de identidad visual completa con revisiones incluidas",
    "subcategoryId": 12,
    "pricingType": "FIXED",
    "basePrice": 150000,
    "images": ["https://cdn.example.com/service1.jpg"],
    "tags": ["diseño", "logo", "branding"],
    "sellerId": "seller-uuid-here",
    "isActive": true,
    "isRemoteService": true,
    "duration": 240
  }
}
```

---

### updateService

```graphql
mutation UpdateService($input: UpdateServiceInput!) {
  updateService(input: $input) {
    ...ServiceFields
  }
}
```

**Variables**
```json
{
  "input": {
    "id": "42",
    "basePrice": 180000,
    "description": "Diseño actualizado con garantía de revisiones ilimitadas"
  }
}
```

---

### deleteService

```graphql
mutation DeleteService($id: ID!) {
  deleteService(id: $id) {
    id
    isActive
    deletedAt
  }
}
```

**Variables**
```json
{ "id": "42" }
```

---

### toggleServiceActive

```graphql
mutation ToggleServiceActive($id: ID!) {
  toggleServiceActive(id: $id) {
    id
    isActive
  }
}
```

**Variables**
```json
{ "id": "42" }
```

---

### addServiceReview

```graphql
mutation AddServiceReview($input: AddServiceReviewInput!) {
  addServiceReview(input: $input) {
    ...ServiceReviewFields
  }
}
```

**Variables**
```json
{
  "input": {
    "serviceId": 42,
    "reviewerId": "seller-uuid-here",
    "rating": 5,
    "comment": "Excelente trabajo, muy profesional y puntual"
  }
}
```

---

### deleteServiceReview

```graphql
mutation DeleteServiceReview($id: ID!) {
  deleteServiceReview(id: $id)
}
```

**Variables**
```json
{ "id": "7" }
```

---

### addQuotation

```graphql
mutation AddQuotation($input: AddQuotationInput!) {
  addQuotation(input: $input) {
    ...QuotationFields
  }
}
```

**Variables**
```json
{
  "input": {
    "serviceId": 42,
    "clientId": "client-uuid-here",
    "providerId": "provider-uuid-here",
    "title": "Diseño de logo para startup tecnológica",
    "description": "Necesito un logo moderno para mi empresa de IA",
    "estimatedPrice": 150000,
    "estimatedDuration": 7,
    "clientNotes": "Colores preferidos: azul oscuro y blanco",
    "attachments": ["https://cdn.example.com/brief.pdf"],
    "expiresAt": "2026-03-15T00:00:00Z"
  }
}
```

---

### updateQuotation

```graphql
mutation UpdateQuotation($input: UpdateQuotationInput!) {
  updateQuotation(input: $input) {
    ...QuotationFields
  }
}
```

**Variables**
```json
{
  "input": {
    "id": "15",
    "finalPrice": 130000,
    "providerNotes": "Incluyo 3 revisiones sin costo adicional"
  }
}
```

---

### acceptQuotation

```graphql
mutation AcceptQuotation($id: ID!) {
  acceptQuotation(id: $id) {
    id
    status
    acceptedAt
  }
}
```

**Variables**
```json
{ "id": "15" }
```

---

### declineQuotation

```graphql
mutation DeclineQuotation($id: ID!, $reason: String) {
  declineQuotation(id: $id, reason: $reason) {
    id
    status
    declineReason
  }
}
```

**Variables**
```json
{ "id": "15", "reason": "Presupuesto no se ajusta a mi proyecto" }
```

---

### completeQuotation

```graphql
mutation CompleteQuotation($id: ID!) {
  completeQuotation(id: $id) {
    id
    status
    completedAt
  }
}
```

**Variables**
```json
{ "id": "15" }
```

---

### cancelQuotation

```graphql
mutation CancelQuotation($id: ID!, $reason: String) {
  cancelQuotation(id: $id, reason: $reason) {
    id
    status
    cancellationReason
  }
}
```

**Variables**
```json
{ "id": "15", "reason": "Cambio de prioridades del proyecto" }
```

---

### deleteQuotation

```graphql
mutation DeleteQuotation($id: ID!) {
  deleteQuotation(id: $id)
}
```

**Variables**
```json
{ "id": "15" }
```

---

### addServiceBooking

Book a service on a specific date. Both client and provider IDs are required.

```graphql
mutation AddServiceBooking($input: AddServiceBookingInput!) {
  addServiceBooking(input: $input) {
    ...ServiceBookingFields
  }
}
```

**Variables**
```json
{
  "input": {
    "serviceId": 42,
    "clientId": "client-uuid-here",
    "providerId": "provider-uuid-here",
    "scheduledDate": "2026-03-20T10:00:00Z",
    "scheduledTimeSlot": "10:00-12:00",
    "agreedPrice": 150000,
    "clientNotes": "Favor confirmar con 24h de anticipación",
    "serviceLocation": {
      "address": "Av. Providencia 1234, Santiago",
      "lat": -33.4289,
      "lng": -70.6096,
      "notes": "Edificio azul, piso 3"
    }
  }
}
```

---

### updateServiceBooking

Update booking details (schedule, price, notes, status).

```graphql
mutation UpdateServiceBooking($input: UpdateServiceBookingInput!) {
  updateServiceBooking(input: $input) {
    ...ServiceBookingFields
  }
}
```

**Variables**
```json
{
  "input": {
    "id": "25",
    "status": "CONFIRMED",
    "providerNotes": "Confirmado. Estaré puntual.",
    "paymentStatus": "PAID"
  }
}
```

---

### cancelServiceBooking

Cancel a booking with a reason and the party requesting cancellation.

```graphql
mutation CancelServiceBooking(
  $id: ID!
  $cancelledBy: String!
  $reason: String!
) {
  cancelServiceBooking(id: $id, cancelledBy: $cancelledBy, reason: $reason) {
    id
    status
    cancellationReason
    cancelledBy
  }
}
```

**Variables**
```json
{
  "id": "25",
  "cancelledBy": "CLIENT",
  "reason": "Tuve un imprevisto y no podré asistir"
}
```

---

### completeServiceBooking

Mark a service booking as completed.

```graphql
mutation CompleteServiceBooking($id: ID!) {
  completeServiceBooking(id: $id) {
    id
    status
    completedAt
  }
}
```

**Variables**
```json
{ "id": "25" }
```

---

## Input Types

### AddServiceInput

```graphql
input AddServiceInput {
  name: String!
  description: String
  subcategoryId: Int!
  pricingType: ServicePricing!   # FIXED | QUOTATION | HOURLY | PACKAGE
  basePrice: Float
  priceRange: String             # e.g. "50000-150000 CLP"
  duration: Int                  # Duration in minutes
  images: [String!]!
  tags: [String!]
  sellerId: String!
  isActive: Boolean
  availabilitySchedule: JSON
  isCurrentlyAvailable: Boolean
  maxConcurrentBookings: Int
  advanceBookingDays: Int
  serviceRadius: Int             # km radius for on-site services
  serviceLocations: JSON
  isRemoteService: Boolean
}
```

### UpdateServiceInput

```graphql
input UpdateServiceInput {
  id: ID!
  name: String
  description: String
  subcategoryId: Int
  pricingType: ServicePricing
  basePrice: Float
  priceRange: String
  duration: Int
  images: [String!]
  tags: [String!]
  isActive: Boolean
  availabilitySchedule: JSON
  isCurrentlyAvailable: Boolean
  maxConcurrentBookings: Int
  advanceBookingDays: Int
  serviceRadius: Int
  serviceLocations: JSON
  isRemoteService: Boolean
}
```

### AddServiceReviewInput

```graphql
input AddServiceReviewInput {
  serviceId: Int!
  reviewerId: String!
  rating: Int!     # 1–5
  comment: String
}
```

### AddQuotationInput

```graphql
input AddQuotationInput {
  serviceId: Int!
  clientId: String!
  providerId: String!
  title: String!
  description: String!
  estimatedPrice: Float
  estimatedDuration: Int         # Duration in days
  clientNotes: String
  attachments: [String!]
  expiresAt: Date
  priceBreakdown: JSON
  depositAmount: Float
  estimatedStartDate: Date
  estimatedCompletionDate: Date
}
```

### UpdateQuotationInput

```graphql
input UpdateQuotationInput {
  id: ID!
  title: String
  description: String
  estimatedPrice: Float
  finalPrice: Float
  estimatedDuration: Int
  clientNotes: String
  providerNotes: String
  attachments: [String!]
  depositAmount: Float
  depositPaid: Boolean
  estimatedStartDate: Date
  estimatedCompletionDate: Date
  actualStartDate: Date
  actualCompletionDate: Date
  declineReason: String
  cancellationReason: String
  priceBreakdown: JSON
}
```

### AddServiceBookingInput

```graphql
input AddServiceBookingInput {
  serviceId: Int!
  clientId: String!
  providerId: String!
  scheduledDate: Date!
  scheduledTimeSlot: String      # e.g. "10:00-12:00"
  serviceLocation: JSON          # { address, lat, lng, notes }
  agreedPrice: Float!
  clientNotes: String
}
```

### UpdateServiceBookingInput

```graphql
input UpdateServiceBookingInput {
  id: ID!
  scheduledDate: Date
  scheduledTimeSlot: String
  serviceLocation: JSON
  agreedPrice: Float
  paymentStatus: String          # PENDING | PARTIAL | PAID
  status: String                 # PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED
  clientNotes: String
  providerNotes: String
  cancellationReason: String
  cancelledBy: String            # CLIENT | PROVIDER
}
```
