import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * The seller the gateway authenticated, or undefined for an anonymous caller.
 *
 * Read off the **GraphQL context**, which is where `createGraphQLContext`
 * (`src/graphql/context.ts`) puts it after parsing the gateway's `x-seller-id`
 * header. Reading `context.req.sellerId` instead returns undefined forever:
 * nothing ever assigns that property, and the mistake hides for a long time
 * because most callers treat "no seller" as a valid anonymous view. Matches the
 * stores, marketplace and blog-community subgraphs.
 */
export const CurrentSeller = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | undefined => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ sellerId?: string }>().sellerId;
  },
);

/** Same, for the admin the gateway authenticated (`x-admin-id`). */
export const CurrentAdmin = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | undefined => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ adminId?: string }>().adminId;
  },
);
