import { Module } from "@nestjs/common";
import { BookingsService } from "./bookings.service.js";
import { BookingsResolver } from "./bookings.resolver.js";

@Module({
  providers: [BookingsService, BookingsResolver],
  exports: [BookingsService],
})
export class BookingsModule {}
