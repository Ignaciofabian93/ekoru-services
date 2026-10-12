import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersClient, type NotificationType } from '../common/clients/index.js';
import { awardServicePoints } from '../common/service-points.js';
import { assertAdminCan, isAdminWith } from '../common/admin-access.js';
import { hiddenProviderIds } from '../common/seller-visibility.js';
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions/index.js';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils/index.js';
import {
  AddServiceBookingInput,
  UpdateServiceBookingInput,
} from './dto/index.js';
import { bookingUpdateData, type BookingRole } from './booking-rules.js';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersClient,
    private readonly config: ConfigService,
  ) {}

  /** Bookings oversight is the panel's MANAGE_ORDERS screen (SEC-8). */
  assertOrdersAdmin(adminId: string | undefined): Promise<string> {
    return assertAdminCan(this.prisma, adminId, 'MANAGE_ORDERS');
  }

  isOrdersAdmin(adminId: string | undefined): Promise<boolean> {
    return isAdminWith(this.prisma, adminId, 'MANAGE_ORDERS');
  }

  /**
   * Tells one party what just happened to a booking.
   *
   * Best-effort and never awaited: a booking that was confirmed must stay
   * confirmed even if nobody could be notified. `serviceName` is looked up only
   * when the caller doesn't already have it, so the common paths stay at one
   * query.
   */
  private async notify(
    booking: BookingForNotify,
    type: NotificationType,
    recipientId: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      const base = this.config.get<string>('webAppBaseUrl');
      const serviceName =
        extra.serviceName ?? (await this.serviceName(booking.serviceId));

      await this.users.notify({
        sellerId: recipientId,
        type,
        relatedId: booking.id,
        actionUrl: base ? `${base}/profile/bookings` : null,
        data: {
          // The actor is whoever is not being notified.
          actorSellerId:
            recipientId === booking.clientId
              ? booking.providerId
              : booking.clientId,
          scheduledFor: booking.scheduledDate?.toISOString() ?? null,
          // Paid to the provider at the place of service (SRV-5, D7); the
          // copy says so. The price is for templates that want to show it.
          paymentMode: 'ON_SITE',
          price:
            booking.agreedPrice != null && booking.agreedPrice > 0
              ? formatClp(booking.agreedPrice)
              : null,
          ...extra,
          serviceName,
        },
      });
    } catch (error) {
      // Contains its own failures so the `void` call sites can never raise an
      // unhandled rejection — a booking must not fail because of a notice.
      this.logger.error(`Booking ${booking.id} notification failed:`, error);
    }
  }

  /**
   * Notifies the party who did NOT cancel. `cancelledBy` carries the actor, so
   * unlike the quotation flow this can address exactly one person; when it is
   * missing both sides are told, since a cancelled booking matters to both.
   */
  private async notifyCancelled(
    booking: BookingForNotify,
    cancelledBy: string | null,
    reason?: string | null,
  ): Promise<void> {
    const extra = { note: reason ?? '' };
    const recipients =
      cancelledBy === booking.clientId
        ? [booking.providerId]
        : cancelledBy === booking.providerId
          ? [booking.clientId]
          : [booking.clientId, booking.providerId];

    for (const recipient of recipients) {
      await this.notify(booking, 'BOOKING_CANCELLED', recipient, extra);
    }
  }

  /** Name for the notification copy; never fails the surrounding mutation. */
  private async serviceName(serviceId: number): Promise<string> {
    try {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
        select: { name: true },
      });
      return service?.name ?? 'el servicio';
    } catch {
      return 'el servicio';
    }
  }

  async getServiceBooking(id: number) {
    try {
      const booking = await this.prisma.serviceBooking.findUnique({
        where: { id },
        include: {
          service: true,
        },
      });

      if (!booking) {
        throw new NotFoundError('Reserva no encontrada');
      }

      return booking;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Error al obtener la reserva:', error);
      throw new InternalServerError('Error al obtener la reserva');
    }
  }

  async getServiceBookings({
    page,
    pageSize,
    status,
  }: {
    page: number;
    pageSize: number;
    status?: string;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = status ? { status: status as BookingStatus } : {};
      const count = await this.prisma.serviceBooking.count({ where });
      const bookings = await this.prisma.serviceBooking.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledDate: 'asc' },
      });

      return createPaginatedResponse(bookings, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener las reservas:', error);
      throw new InternalServerError('Error al obtener las reservas');
    }
  }

  async getServiceBookingsByClient({
    clientId,
    page,
    pageSize,
    status,
  }: {
    clientId: string;
    page: number;
    pageSize: number;
    status?: string;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = {
        clientId,
        ...(status && { status: status as BookingStatus }),
      };
      const count = await this.prisma.serviceBooking.count({ where });
      const bookings = await this.prisma.serviceBooking.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledDate: 'asc' },
      });

      return createPaginatedResponse(bookings, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener las reservas del cliente:', error);
      throw new InternalServerError(
        'Error al obtener las reservas del cliente',
      );
    }
  }

  async getServiceBookingsByProvider({
    providerId,
    page,
    pageSize,
    status,
  }: {
    providerId: string;
    page: number;
    pageSize: number;
    status?: string;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = {
        providerId,
        ...(status && { status: status as BookingStatus }),
      };
      const count = await this.prisma.serviceBooking.count({ where });
      const bookings = await this.prisma.serviceBooking.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledDate: 'asc' },
      });

      return createPaginatedResponse(bookings, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener las reservas del proveedor:', error);
      throw new InternalServerError(
        'Error al obtener las reservas del proveedor',
      );
    }
  }

  async getServiceBookingsByService({
    serviceId,
    page,
    pageSize,
  }: {
    serviceId: number;
    page: number;
    pageSize: number;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const count = await this.prisma.serviceBooking.count({
        where: { serviceId },
      });
      const bookings = await this.prisma.serviceBooking.findMany({
        where: { serviceId },
        skip,
        take,
        orderBy: { scheduledDate: 'asc' },
      });

      return createPaginatedResponse(bookings, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener las reservas del servicio:', error);
      throw new InternalServerError(
        'Error al obtener las reservas del servicio',
      );
    }
  }

  async addServiceBooking(
    input: AddServiceBookingInput & { clientId: string },
  ) {
    try {
      // Verify service exists and is active
      const service = await this.prisma.service.findUnique({
        where: { id: input.serviceId },
      });

      if (
        !service ||
        !service.isActive ||
        (await hiddenProviderIds(this.prisma)).includes(service.sellerId)
      ) {
        throw new BadRequestError('Servicio no disponible');
      }
      if (service.sellerId === input.clientId) {
        throw new BadRequestError('No puedes reservar tu propio servicio');
      }

      // The provider is the service's seller and the price starts at its base
      // price, whatever the client sent: a booking that named its provider
      // could send requests (and eco-points) to anyone, and one that named its
      // price could set it to zero. The provider adjusts the price before
      // confirming.
      const booking = await this.prisma.serviceBooking.create({
        data: {
          serviceId: input.serviceId,
          clientId: input.clientId,
          providerId: service.sellerId,
          scheduledDate: input.scheduledDate,
          scheduledTimeSlot: input.scheduledTimeSlot,
          serviceLocation: input.serviceLocation || {},
          agreedPrice: service.basePrice ?? 0,
          clientNotes: input.clientNotes,
        },
      });

      void this.notify(booking, 'BOOKING_REQUEST', booking.providerId, {
        serviceName: service.name,
      });

      return booking;
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      this.logger.error('Error al crear la reserva:', error);
      throw new InternalServerError('Error al crear la reserva');
    }
  }

  /**
   * A participant's edit. `role` and `current` come from the resolver's
   * participant check; booking-rules.ts decides which fields that side owns
   * and which status moves are allowed, before anything is written.
   */
  async updateServiceBooking({
    input,
    role,
    current,
  }: {
    input: UpdateServiceBookingInput;
    role: BookingRole;
    current: { status: string };
  }) {
    const data = bookingUpdateData(role, current, input);
    const changedStatus =
      input.status != null && input.status !== current.status
        ? input.status
        : null;
    try {
      const id = parseInt(input.id, 10);

      const booking = await this.prisma.serviceBooking.update({
        where: { id },
        data,
      });

      // Only a status change is worth telling someone about; rescheduling
      // and note edits are not. The client is the one who cares that their
      // booking was confirmed or closed out.
      if (changedStatus === 'CONFIRMED') {
        void this.notify(booking, 'BOOKING_CONFIRMED', booking.clientId);
      } else if (changedStatus === 'COMPLETED') {
        void this.notify(booking, 'BOOKING_COMPLETED', booking.clientId);
        void this.awardPoints(booking);
      }

      return booking;
    } catch (error) {
      this.logger.error('Error al actualizar la reserva:', error);
      throw new InternalServerError('Error al actualizar la reserva');
    }
  }

  /** Eco-points for a completed booking, once per booking (POINTS.md). */
  private awardPoints(booking: {
    id: number;
    serviceId: number;
    clientId: string;
    providerId: string;
  }): Promise<void> {
    return awardServicePoints(this.prisma, this.users, {
      serviceId: booking.serviceId,
      clientId: booking.clientId,
      providerId: booking.providerId,
      reference: `booking:${booking.id}`,
    });
  }

  async cancelServiceBooking({
    id,
    cancelledBy,
    reason,
  }: {
    id: number;
    cancelledBy: string;
    reason: string;
  }) {
    try {
      const booking = await this.prisma.serviceBooking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledBy,
          cancellationReason: reason,
          updatedAt: new Date(),
        },
      });

      void this.notifyCancelled(booking, cancelledBy, reason);

      return booking;
    } catch (error) {
      this.logger.error('Error al cancelar la reserva:', error);
      throw new InternalServerError('Error al cancelar la reserva');
    }
  }

  async completeServiceBooking(id: number) {
    try {
      const booking = await this.prisma.serviceBooking.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      void this.notify(booking, 'BOOKING_COMPLETED', booking.clientId);
      void this.awardPoints(booking);

      return booking;
    } catch (error) {
      this.logger.error('Error al completar la reserva:', error);
      throw new InternalServerError('Error al completar la reserva');
    }
  }
}

/** The booking fields `notify` reads. */
interface BookingForNotify {
  id: number;
  serviceId: number;
  clientId: string;
  providerId: string;
  scheduledDate?: Date | null;
  agreedPrice?: number | null;
}

/** "$15.000": how prices read in Chile, whatever the recipient's language. */
function formatClp(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}
