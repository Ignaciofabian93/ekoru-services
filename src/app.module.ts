import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Request, Response } from 'express';
import { PrismaModule } from './prisma/prisma.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { ServicesModule } from './services/services.module.js';
import { QuotationsModule } from './quotations/quotations.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { DateTimeScalar, JSONScalar } from './graphql/scalars/index.js';
import configuration from './config/configuration.js';

// Import to register enums
import './graphql/enums/index.js';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // GraphQL Federation
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
        sellerId: req.headers['x-seller-id'] as string | undefined,
        token: req.headers.authorization?.replace('Bearer ', ''),
      }),
      formatError: (error) => {
        if (process.env.NODE_ENV === 'production') {
          delete error.extensions?.exception;
        }
        return error;
      },
    }),

    // Database
    PrismaModule,

    // Feature modules
    CatalogModule,
    ServicesModule,
    QuotationsModule,
    ReviewsModule,
  ],
  providers: [DateTimeScalar, JSONScalar],
})
export class AppModule {}
