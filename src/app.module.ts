import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { ModuleRef } from '@nestjs/core';
import { GraphQLJSON } from 'graphql-scalars';
import { PrismaModule } from './prisma/prisma.module.js';
import { CatalogV2Module as ServiceCatalogModule } from './catalog-v2/catalog-v2.module.js';
import { ServicesModule } from './services/services.module.js';
import { QuotationsModule } from './quotations/quotations.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { HealthController } from './health/health.controller.js';
import configuration from './config/configuration.js';
import { createContextFactory } from './graphql/context.js';

// Import to register enums
import './graphql/enums/index.js';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    // Metrics
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),

    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // GraphQL Federation
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (moduleRef: ModuleRef) => ({
        autoSchemaFile: {
          federation: 2,
        },
        sortSchema: true,
        playground: process.env.NODE_ENV !== 'production',
        resolvers: {
          JSON: GraphQLJSON,
        },
        // Fresh context per request — resolves language from Accept-Language header
        // and creates new DataLoaders to prevent stale cache between requests
        context: createContextFactory(moduleRef),
        formatError: (error) => {
          if (process.env.NODE_ENV === 'production') {
            delete error.extensions?.exception;
          }
          return error;
        },
      }),
      inject: [ModuleRef],
    }),

    // Database
    PrismaModule,

    // Feature modules
    ServiceCatalogModule,
    ServicesModule,
    QuotationsModule,
    ReviewsModule,
    BookingsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  controllers: [HealthController],
})
export class AppModule {}
