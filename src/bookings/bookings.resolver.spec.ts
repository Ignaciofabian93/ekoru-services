import { BookingsResolver } from './bookings.resolver.js';
import type { BookingsService } from './bookings.service.js';
import type { ServiceBooking } from './entities/index.js';
import { BookingPaymentMode } from '../graphql/enums/index.js';

describe('BookingsResolver fields', () => {
  const resolver = new BookingsResolver({} as BookingsService);
  const booking = {
    id: 1,
    clientId: 'client-1',
    providerId: 'provider-1',
  } as ServiceBooking;

  it('reports bookings as paid on site (SRV-5, D7)', () => {
    expect(resolver.paymentMode()).toBe(BookingPaymentMode.ON_SITE);
  });

  it('references both parties so users can resolve them', () => {
    expect(resolver.client(booking)).toEqual({ id: 'client-1' });
    expect(resolver.provider(booking)).toEqual({ id: 'provider-1' });
  });

  it('returns null rather than a reference with no id', () => {
    const orphan = { id: 2 } as ServiceBooking;
    expect(resolver.client(orphan)).toBeNull();
    expect(resolver.provider(orphan)).toBeNull();
  });

  describe('service', () => {
    const findBookedService = jest.fn();
    const withLookup = new BookingsResolver({
      findBookedService,
    } as unknown as BookingsService);
    const service = { id: 2, name: 'Asesoría medioambiental' };

    beforeEach(() => findBookedService.mockReset());

    it('uses the service a read loaded with the booking', () => {
      const loaded = { ...booking, serviceId: 2, service } as ServiceBooking;
      expect(withLookup.service(loaded)).toEqual(service);
      expect(findBookedService).not.toHaveBeenCalled();
    });

    it("reads it for a booking a mutation returned, so cards don't say 'Servicio no disponible'", async () => {
      findBookedService.mockResolvedValue(service);
      const bare = { ...booking, serviceId: 2 } as ServiceBooking;
      await expect(withLookup.service(bare)).resolves.toEqual(service);
      expect(findBookedService).toHaveBeenCalledWith(2);
    });
  });
});
