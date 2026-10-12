import { BadRequestError, ForbiddenError } from '../common/exceptions/index';
import {
  assertBookingCompletable,
  assertBookingOpen,
  bookingRole,
  bookingUpdateData,
} from './booking-rules';

describe('booking rules', () => {
  const booking = { clientId: 'client-1', providerId: 'provider-1' };

  describe('bookingRole', () => {
    it('names the side the caller is on, or nobody', () => {
      expect(bookingRole(booking, 'provider-1')).toBe('provider');
      expect(bookingRole(booking, 'client-1')).toBe('client');
      expect(bookingRole(booking, 'someone-else')).toBeNull();
      expect(bookingRole(booking, undefined)).toBeNull();
    });
  });

  describe('state checks', () => {
    it.each(['COMPLETED', 'CANCELLED', 'NO_SHOW'])(
      'treats %s as closed',
      (status) => {
        expect(() => assertBookingOpen(status)).toThrow(BadRequestError);
      },
    );

    it('completes only confirmed or in-progress work', () => {
      expect(() => assertBookingCompletable('CONFIRMED')).not.toThrow();
      expect(() => assertBookingCompletable('IN_PROGRESS')).not.toThrow();
      expect(() => assertBookingCompletable('PENDING')).toThrow(
        BadRequestError,
      );
    });
  });

  describe('bookingUpdateData', () => {
    const pending = { status: 'PENDING' };

    it('lets the provider confirm, price and annotate', () => {
      const data = bookingUpdateData('provider', pending, {
        id: '1',
        status: 'CONFIRMED',
        agreedPrice: 25000,
        providerNotes: 'Llevo herramientas',
      });
      expect(data).toMatchObject({
        status: 'CONFIRMED',
        agreedPrice: 25000,
        providerNotes: 'Llevo herramientas',
      });
      expect(data).not.toHaveProperty('completedAt');
    });

    it('stamps completedAt when the provider completes', () => {
      const data = bookingUpdateData(
        'provider',
        { status: 'IN_PROGRESS' },
        { id: '1', status: 'COMPLETED' },
      );
      expect(data.completedAt).toBeInstanceOf(Date);
    });

    it.each([
      ['PENDING', 'COMPLETED'],
      ['PENDING', 'IN_PROGRESS'],
      ['PENDING', 'NO_SHOW'],
      ['IN_PROGRESS', 'CONFIRMED'],
      ['CONFIRMED', 'PENDING'],
    ])('refuses the move %s → %s', (from, to) => {
      expect(() =>
        bookingUpdateData(
          'provider',
          { status: from },
          { id: '1', status: to },
        ),
      ).toThrow(BadRequestError);
    });

    it("keeps each side out of the other's fields", () => {
      expect(() =>
        bookingUpdateData('client', pending, { id: '1', status: 'CONFIRMED' }),
      ).toThrow(ForbiddenError);
      expect(() =>
        bookingUpdateData('client', pending, { id: '1', agreedPrice: 0 }),
      ).toThrow(ForbiddenError);
      expect(() =>
        bookingUpdateData('provider', pending, {
          id: '1',
          clientNotes: 'escrito por el proveedor',
        }),
      ).toThrow(ForbiddenError);
    });

    it('lets the client reschedule only before confirmation', () => {
      const when = new Date('2026-11-01T12:00:00Z');
      expect(
        bookingUpdateData('client', pending, { id: '1', scheduledDate: when }),
      ).toMatchObject({ scheduledDate: when });
      expect(() =>
        bookingUpdateData(
          'client',
          { status: 'CONFIRMED' },
          { id: '1', scheduledDate: when },
        ),
      ).toThrow(ForbiddenError);
      // The provider may still move a confirmed booking.
      expect(
        bookingUpdateData(
          'provider',
          { status: 'CONFIRMED' },
          { id: '1', scheduledDate: when },
        ),
      ).toMatchObject({ scheduledDate: when });
    });

    it('sends cancelling and payment state elsewhere', () => {
      expect(() =>
        bookingUpdateData('client', pending, { id: '1', status: 'CANCELLED' }),
      ).toThrow(BadRequestError);
      expect(() =>
        bookingUpdateData('provider', pending, {
          id: '1',
          cancellationReason: 'x',
        }),
      ).toThrow(BadRequestError);
    });

    it('refuses any change to a closed booking', () => {
      expect(() =>
        bookingUpdateData(
          'provider',
          { status: 'CANCELLED' },
          { id: '1', providerNotes: 'x' },
        ),
      ).toThrow(BadRequestError);
    });
  });
});
