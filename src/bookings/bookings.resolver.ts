import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { BookingsService } from './bookings.service.js';
import { ServiceBooking, ServiceBookingConnection } from './entities/index.js';
import {
  AddServiceBookingInput,
  UpdateServiceBookingInput,
} from './dto/index.js';

@Resolver(() => ServiceBooking)
export class BookingsResolver {
  constructor(private readonly bookingsService: BookingsService) {}

  @Query(() => ServiceBooking, { name: 'getServiceBooking', nullable: true })
  async getServiceBooking(@Args('id', { type: () => ID }) id: string) {
    return this.bookingsService.getServiceBooking(parseInt(id, 10));
  }

  @Query(() => ServiceBookingConnection, { name: 'getServiceBookings' })
  async getServiceBookings(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
  ) {
    return this.bookingsService.getServiceBookings(page, pageSize, status);
  }

  @Query(() => ServiceBookingConnection, { name: 'getServiceBookingsByClient' })
  async getServiceBookingsByClient(
    @Args('clientId', { type: () => ID }) clientId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
  ) {
    return this.bookingsService.getServiceBookingsByClient(
      clientId,
      page,
      pageSize,
      status,
    );
  }

  @Query(() => ServiceBookingConnection, {
    name: 'getServiceBookingsByProvider',
  })
  async getServiceBookingsByProvider(
    @Args('providerId', { type: () => ID }) providerId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
  ) {
    return this.bookingsService.getServiceBookingsByProvider(
      providerId,
      page,
      pageSize,
      status,
    );
  }

  @Query(() => ServiceBookingConnection, {
    name: 'getServiceBookingsByService',
  })
  async getServiceBookingsByService(
    @Args('serviceId', { type: () => ID }) serviceId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
  ) {
    return this.bookingsService.getServiceBookingsByService(
      parseInt(serviceId, 10),
      page,
      pageSize,
    );
  }

  @Mutation(() => ServiceBooking)
  async addServiceBooking(@Args('input') input: AddServiceBookingInput) {
    return this.bookingsService.addServiceBooking(input);
  }

  @Mutation(() => ServiceBooking)
  async updateServiceBooking(@Args('input') input: UpdateServiceBookingInput) {
    return this.bookingsService.updateServiceBooking(input);
  }

  @Mutation(() => ServiceBooking)
  async cancelServiceBooking(
    @Args('id', { type: () => ID }) id: string,
    @Args('cancelledBy', { type: () => String }) cancelledBy: string,
    @Args('reason', { type: () => String }) reason: string,
  ) {
    return this.bookingsService.cancelServiceBooking(
      parseInt(id, 10),
      cancelledBy,
      reason,
    );
  }

  @Mutation(() => ServiceBooking)
  async completeServiceBooking(@Args('id', { type: () => ID }) id: string) {
    return this.bookingsService.completeServiceBooking(parseInt(id, 10));
  }
}
