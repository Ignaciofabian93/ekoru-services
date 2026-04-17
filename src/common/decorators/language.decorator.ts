import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const Language = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext();
    const req = gqlContext.req;

    // Try to get language from:
    // 1. Query parameter
    // 2. Accept-Language header
    // 3. Default to 'es'
    const queryLang = req?.query?.lang;
    if (queryLang && ['es', 'en', 'fr'].includes(queryLang)) {
      return queryLang;
    }

    const acceptLanguage = req?.headers?.['accept-language'];
    if (acceptLanguage) {
      const primaryLang = acceptLanguage.split(',')[0].split('-')[0];
      if (['es', 'en', 'fr'].includes(primaryLang)) {
        return primaryLang;
      }
    }

    return 'es'; // Default language
  },
);
