import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { BookingsService } from './bookings.service.js';
import { ServiceBooking, ServiceBookingConnection } from './entities/index.js';
import {
  AddServiceBookingInput,
  UpdateServiceBookingInput,
} from './dto/index.js';
import { CurrentAdmin, CurrentSeller } from '../common/decorators/index.js';
import {
  assertBookingCompletable,
  assertBookingOpen,
  bookingRole,
} from './booking-rules.js';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../common/exceptions/index.js';

@Resolver(() => ServiceBooking)
export class BookingsResolver {
  constructor(private readonly bookingsService: BookingsService) {}

  /** The booking's client or provider, or a platform admin with MANAGE_ORDERS. */
  @Query(() => ServiceBooking, { name: 'getServiceBooking', nullable: true })
  async getServiceBooking(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId?: string,
    @CurrentAdmin() adminId?: string,
  ) {
    if (!sellerId && !adminId) {
      throw new UnauthorizedError('Debes iniciar sesión');
    }
    const booking = await this.bookingsService.getServiceBooking(
      parseInt(id, 10),
    );
    if (bookingRole(booking, sellerId)) return booking;
    if (await this.bookingsService.isOrdersAdmin(adminId)) return booking;
    throw new ForbiddenError('No tienes acceso a esta reserva');
  }

  // The four lists below take an arbitrary client, provider or service, so
  // they are for the panel only (MANAGE_ORDERS). Clients use `my*`.

  @Query(() => ServiceBookingConnection, { name: 'getServiceBookings' })
  async getServiceBookings(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
    @CurrentAdmin() adminId?: string,
  ) {
    await this.bookingsService.assertOrdersAdmin(adminId);
    return this.bookingsService.getServiceBookings({ page, pageSize, status });
  }

  @Query(() => ServiceBookingConnection, { name: 'getServiceBookingsByClient' })
  async getServiceBookingsByClient(
    @Args('clientId', { type: () => ID }) clientId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
    @CurrentAdmin() adminId?: string,
  ) {
    await this.bookingsService.assertOrdersAdmin(adminId);
    return this.bookingsService.getServiceBookingsByClient({
      clientId,
      page,
      pageSize,
      status,
    });
  }

  @Query(() => ServiceBookingConnection, {
    name: 'getServiceBookingsByProvider',
  })
  async getServiceBookingsByProvider(
    @Args('providerId', { type: () => ID }) providerId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
    @CurrentAdmin() adminId?: string,
  ) {
    await this.bookingsService.assertOrdersAdmin(adminId);
    return this.bookingsService.getServiceBookingsByProvider({
      providerId,
      page,
      pageSize,
      status,
    });
  }

  @Query(() => ServiceBookingConnection, {
    name: 'getServiceBookingsByService',
  })
  async getServiceBookingsByService(
    @Args('serviceId', { type: () => ID }) serviceId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @CurrentAdmin() adminId?: string,
  ) {
    await this.bookingsService.assertOrdersAdmin(adminId);
    return this.bookingsService.getServiceBookingsByService({
      serviceId: parseInt(serviceId, 10),
      page,
      pageSize,
    });
  }

  // ─── Session-scoped views ───────────────────────────────────────────────────
  // The `…ByClient` / `…ByProvider` queries above take an id as an argument,
  // which means they can only be trusted with an admin caller. These two answer
  // for whoever is signed in, and are what the buyer- and provider-facing UIs
  // use.

  @Query(() => ServiceBookingConnection, { name: 'myServiceBookings' })
  async myServiceBookings(
    @CurrentSeller() clientId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
  ) {
    this.assertSignedIn(clientId);
    return this.bookingsService.getServiceBookingsByClient({
      clientId,
      page,
      pageSize,
      status,
    });
  }

  @Query(() => ServiceBookingConnection, { name: 'myProviderBookings' })
  async myProviderBookings(
    @CurrentSeller() providerId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
  ) {
    this.assertSignedIn(providerId);
    return this.bookingsService.getServiceBookingsByProvider({
      providerId,
      page,
      pageSize,
      status,
    });
  }

  /**
   * The client is taken from the session, never from the input: a booking that
   * could name its own client would let anyone book in someone else's name.
   */
  @Mutation(() => ServiceBooking)
  async addServiceBooking(
    @Args('input') input: AddServiceBookingInput,
    @CurrentSeller() clientId: string,
  ) {
    this.assertSignedIn(clientId);
    return this.bookingsService.addServiceBooking({ ...input, clientId });
  }

  /** Each side edits only its own fields; see booking-rules.ts. */
  @Mutation(() => ServiceBooking)
  async updateServiceBooking(
    @Args('input') input: UpdateServiceBookingInput,
    @CurrentSeller() sellerId: string,
  ) {
    const booking = await this.assertParticipant(input.id, sellerId);
    return this.bookingsService.updateServiceBooking({
      input,
      role: bookingRole(booking, sellerId)!,
      current: booking,
    });
  }

  /**
   * The client or the provider cancels; so may an operator with
   * MANAGE_ORDERS when the two disagree (ADM-5), in which case both are told.
   */
  @Mutation(() => ServiceBooking)
  async cancelServiceBooking(
    @Args('id', { type: () => ID }) id: string,
    @Args('reason', { type: () => String }) reason: string,
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId?: string,
  ) {
    if (!sellerId && adminId) {
      await this.bookingsService.assertOrdersAdmin(adminId);
      const booking = await this.bookingsService.getServiceBooking(
        parseInt(id, 10),
      );
      assertBookingOpen(booking.status);
      return this.bookingsService.cancelServiceBooking({
        id: parseInt(id, 10),
        cancelledBy: 'ADMIN',
        reason,
      });
    }
    const booking = await this.assertParticipant(id, sellerId);
    assertBookingOpen(booking.status);
    return this.bookingsService.cancelServiceBooking({
      id: parseInt(id, 10),
      // Who cancelled is a fact about the session, not a claim the caller makes.
      cancelledBy: sellerId,
      reason,
    });
  }

  @Mutation(() => ServiceBooking)
  async completeServiceBooking(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
  ) {
    const booking = await this.assertParticipant(id, sellerId);
    // Only the provider marks work done; a client confirming their own booking
    // complete would let them close it before the provider agrees.
    if (booking.providerId !== sellerId) {
      throw new ForbiddenError('Solo el proveedor puede completar la reserva');
    }
    assertBookingCompletable(booking.status);
    return this.bookingsService.completeServiceBooking(parseInt(id, 10));
  }

  // ─── guards ────────────────────────────────────────────────────────────────

  private assertSignedIn(sellerId: string) {
    if (!sellerId) {
      throw new UnauthorizedError('Debes iniciar sesión');
    }
  }

  /** Loads the booking and confirms the caller is its client or its provider. */
  private async assertParticipant(id: string, sellerId: string) {
    this.assertSignedIn(sellerId);
    const booking = await this.bookingsService.getServiceBooking(
      parseInt(id, 10),
    );
    if (!booking) {
      throw new NotFoundError('Reserva no encontrada');
    }
    if (booking.clientId !== sellerId && booking.providerId !== sellerId) {
      throw new ForbiddenError('No tienes acceso a esta reserva');
    }
    return booking;
  }
}
