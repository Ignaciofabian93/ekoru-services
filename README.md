# Ekoru Services - NestJS GraphQL API

A comprehensive service management system built with NestJS, GraphQL Federation, and Prisma ORM. This service handles service listings, bookings, reviews, quotations, and service catalog management.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Development](#development)
- [Testing](#testing)
- [Documentation](#documentation)
- [API Reference](#api-reference)

## 🎯 Overview

Ekoru Services is a GraphQL subgraph that provides a complete service marketplace API. It enables:

- **Service Management**: Create, update, and manage service listings
- **Bookings**: Schedule and track service bookings
- **Reviews**: Rate and review services
- **Quotations**: Request and manage service quotations
- **Catalog**: Browse organized service categories and subcategories

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **PostgreSQL**: v14.x or higher (for Prisma)
- **Git**: For version control

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ekoru-services
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ekoru_services?schema=public"

# Server
PORT=4001
NODE_ENV=development

# GraphQL
GRAPHQL_PLAYGROUND=true
```

### 4. Set Up the Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed the database
npx prisma db seed
```

### 5. Start the Development Server

```bash
npm run start:dev
```

The GraphQL playground will be available at: `http://localhost:4001/graphql`

## 📁 Project Structure

```
ekoru-services/
├── docs/                       # Documentation files
│   ├── bookings.md            # Bookings module documentation
│   ├── quotations.md          # Quotations module documentation
│   ├── reviews.md             # Reviews module documentation
│   ├── services.md            # Services module documentation
│   └── queries.md             # GraphQL queries reference
├── prisma/                     # Prisma ORM files
│   └── schema.prisma          # Database schema
├── src/                        # Source code
│   ├── bookings/              # Bookings module
│   │   ├── dto/               # Data Transfer Objects
│   │   ├── entities/          # GraphQL entities
│   │   ├── bookings.module.ts
│   │   ├── bookings.resolver.ts
│   │   ├── bookings.service.ts
│   │   └── bookings.spec.ts   # Tests
│   ├── catalog/               # Service catalog module
│   ├── common/                # Shared utilities
│   │   ├── decorators/        # Custom decorators
│   │   ├── exceptions/        # Custom exceptions
│   │   └── utils/             # Helper functions
│   ├── config/                # Configuration files
│   ├── graphql/               # GraphQL types and enums
│   │   ├── enums/
│   │   └── scalars/
│   ├── prisma/                # Prisma service
│   ├── quotations/            # Quotations module
│   ├── reviews/               # Reviews module
│   ├── services/              # Services module
│   ├── app.module.ts          # Root module
│   └── main.ts                # Application entry point
├── test/                       # E2E tests
├── .env                        # Environment variables
├── nest-cli.json              # NestJS CLI configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## ✨ Key Features

### Service Management

- CRUD operations for service listings
- Filter by category, subcategory, seller, or pricing type
- Toggle active/inactive status
- Support for multiple pricing models (fixed, variable, hourly, custom)

### Booking System

- Create and manage service bookings
- Track booking status (pending, confirmed, completed, cancelled)
- Filter by client, provider, service, or status
- Payment status tracking

### Review System

- Leave ratings and comments for services
- Prevent duplicate reviews per user/service
- Calculate average ratings
- View reviews by service or reviewer

### Quotation Management

- Request custom quotes for services
- Status workflow (pending → accepted/declined → completed/cancelled)
- Attach files and notes
- Set expiration dates

### Service Catalog

- Hierarchical category structure
- Browse by category and subcategory
- Service count per subcategory

## 🛠 Technology Stack

- **Framework**: [NestJS](https://nestjs.com/) v11.x
- **API**: [GraphQL](https://graphql.org/) with Apollo Federation
- **ORM**: [Prisma](https://www.prisma.io/) v5.x
- **Database**: PostgreSQL
- **Language**: TypeScript v5.x
- **Testing**: Jest v30.x
- **Validation**: class-validator & class-transformer

## 💻 Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start in debug mode

# Building
npm run build              # Build for production
npm run start:prod         # Run production build

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format code with Prettier

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests
```

### Development Workflow

1. **Create a new feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following the existing patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Run tests**

   ```bash
   npm run test
   npm run test:e2e
   ```

4. **Lint and format**

   ```bash
   npm run lint
   npm run format
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- Use **TypeScript** for type safety
- Follow **NestJS** architectural patterns
- Write **unit tests** for services
- Use **descriptive variable names**
- Add **JSDoc comments** for complex functions
- Keep functions **small and focused**
- Use **dependency injection** for testability

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode (recommended during development)
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

### Test Structure

Each module has comprehensive test coverage:

- **Services**: Business logic and database operations
- **Resolvers**: GraphQL query/mutation handling
- **DTOs**: Input validation
- **Entities**: GraphQL schema types

Example test file: `src/services/services.spec.ts`

### Writing Tests

```typescript
describe("ServicesService", () => {
  let service: ServicesService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it("should create a service", async () => {
    // Test implementation
  });
});
```

## 📚 Documentation

Detailed documentation is available in the `/docs` folder:

- **[Bookings](./docs/bookings.md)**: Booking system logic and workflows
- **[Quotations](./docs/quotations.md)**: Quotation management and status lifecycle
- **[Reviews](./docs/reviews.md)**: Review system and rating calculations
- **[Services](./docs/services.md)**: Service management and filtering
- **[Queries](./docs/queries.md)**: Complete GraphQL API reference

## 🔌 API Reference

### GraphQL Endpoint

```
http://localhost:4001/graphql
```

### Quick Examples

**Fetch services:**

```graphql
query {
  getServices(page: 1, pageSize: 10, isActive: true) {
    edges {
      node {
        id
        name
        description
        basePrice
        averageRating
      }
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
```

**Create a booking:**

```graphql
mutation {
  addServiceBooking(
    input: {
      serviceId: 1
      clientId: "client-123"
      providerId: "provider-456"
      scheduledDate: "2025-12-25T10:00:00Z"
      scheduledTimeSlot: "10:00-11:00"
      agreedPrice: 100
    }
  ) {
    id
    status
    scheduledDate
  }
}
```

For complete API documentation, see [docs/queries.md](./docs/queries.md).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `chore:` Build/config changes

## 📄 License

This project is licensed under the UNLICENSED License.

## 🆘 Support

For questions or issues:

1. Check the [documentation](./docs/)
2. Review existing GitHub issues
3. Create a new issue with detailed information

## 🔗 Related Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [GraphQL Documentation](https://graphql.org/learn/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Apollo Federation](https://www.apollographql.com/docs/federation/)

---

**Happy Coding! 🚀**
