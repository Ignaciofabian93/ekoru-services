import { Module } from '@nestjs/common';
import { UsersClient } from '../common/clients/index.js';
import { QuotationsService } from './quotations.service.js';
import { QuotationsResolver } from './quotations.resolver.js';

@Module({
  providers: [QuotationsService, QuotationsResolver, UsersClient],
  exports: [QuotationsService],
})
export class QuotationsModule {}
