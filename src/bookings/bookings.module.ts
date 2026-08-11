import { Module } from '@nestjs/common';
import { UsersClient } from '../common/clients/index.js';
import { BookingsService } from './bookings.service.js';
import { BookingsResolver } from './bookings.resolver.js';

@Module({
  providers: [BookingsService, BookingsResolver, UsersClient],
  exports: [BookingsService],
})
export class BookingsModule {}
