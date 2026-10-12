import type { Prisma } from '@prisma/client';
import { BadRequestError, ForbiddenError } from '../common/exceptions/index.js';
import type { UpdateServiceBookingInput } from './dto/index.js';

/**
 * Who may move a booking where, and which fields each side owns.
 *
 * The client asks for a date, a place and leaves notes. The provider confirms,
 * prices, starts, completes or marks a no-show. Cancelling has its own mutation
 * so the session, not the payload, records who cancelled. There is no payment
 * state: bookings are paid to the provider on site (decision D7, SRV-5).
 *
 * Kept free of Nest and Prisma calls so every rule is unit-tested directly.
 */
export type BookingRole = 'client' | 'provider';

/** States a booking never leaves. */
export const FINAL_BOOKING_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

/** Where the provider may move a booking from each open state. */
const PROVIDER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED'],
  CONFIRMED: ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'NO_SHOW'],
};

export function bookingRole(
  booking: { clientId: string; providerId: string },
  sellerId: string | undefined,
): BookingRole | null {
  if (!sellerId) return null;
  if (booking.providerId === sellerId) return 'provider';
  if (booking.clientId === sellerId) return 'client';
  return null;
}

export function assertBookingOpen(status: string): void {
  if (FINAL_BOOKING_STATUSES.includes(status)) {
    throw new BadRequestError('La reserva ya está cerrada');
  }
}

/** Work can be completed once the provider confirmed it, not before. */
export function assertBookingCompletable(status: string): void {
  if (!['CONFIRMED', 'IN_PROGRESS'].includes(status)) {
    throw new BadRequestError(
      'Solo se puede completar una reserva confirmada o en curso',
    );
  }
}

/**
 * Validates an update for the caller's role and returns the columns it may
 * write. Throws FORBIDDEN for a field the other side owns and BAD_REQUEST for
 * a move the booking's state does not allow.
 */
export function bookingUpdateData(
  role: BookingRole,
  current: { status: string },
  input: UpdateServiceBookingInput,
): Prisma.ServiceBookingUpdateInput {
  assertBookingOpen(current.status);

  if (
    input.status === 'CANCELLED' ||
    input.cancelledBy != null ||
    input.cancellationReason != null
  ) {
    throw new BadRequestError('Usa cancelServiceBooking para cancelar');
  }
  const providerOnly: (keyof UpdateServiceBookingInput)[] = [
    'status',
    'agreedPrice',
    'providerNotes',
  ];
  const clientOnly: (keyof UpdateServiceBookingInput)[] = [
    'serviceLocation',
    'clientNotes',
  ];
  const owned = role === 'provider' ? clientOnly : providerOnly;
  const intruding = owned.filter((f) => input[f] != null);
  if (intruding.length) {
    throw new ForbiddenError(
      role === 'provider'
        ? `Solo el cliente puede cambiar: ${intruding.join(', ')}`
        : `Solo el proveedor puede cambiar: ${intruding.join(', ')}`,
    );
  }

  // Once the provider confirmed, the client cannot move the date alone.
  const reschedules =
    input.scheduledDate != null || input.scheduledTimeSlot != null;
  if (role === 'client' && reschedules && current.status !== 'PENDING') {
    throw new ForbiddenError(
      'La reserva ya fue confirmada; pide al proveedor que la reprograme',
    );
  }

  if (input.status != null && input.status !== current.status) {
    const allowed = PROVIDER_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new BadRequestError(
        `Una reserva ${current.status} no puede pasar a ${input.status}`,
      );
    }
  }

  return {
    ...(input.scheduledDate != null && { scheduledDate: input.scheduledDate }),
    ...(input.scheduledTimeSlot != null && {
      scheduledTimeSlot: input.scheduledTimeSlot,
    }),
    ...(input.serviceLocation != null && {
      serviceLocation: input.serviceLocation as Prisma.InputJsonValue,
    }),
    ...(input.agreedPrice != null && { agreedPrice: input.agreedPrice }),
    ...(input.status != null && {
      status: input.status as Prisma.ServiceBookingUpdateInput['status'],
    }),
    ...(input.clientNotes != null && { clientNotes: input.clientNotes }),
    ...(input.providerNotes != null && { providerNotes: input.providerNotes }),
    ...(input.status === 'COMPLETED' && { completedAt: new Date() }),
    updatedAt: new Date(),
  };
}
