import { BookingsResolver } from './bookings.resolver.js';
import type { BookingsService } from './bookings.service.js';
import { QuotationsResolver } from '../quotations/quotations.resolver.js';
import type { QuotationsService } from '../quotations/quotations.service.js';

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'OK';
  } catch (e) {
    return (e as { extensions?: { code?: string } }).extensions?.code;
  }
};

/**
 * USR-15: a store's panel team (MANAGE_BUSINESS_ORDERS) works the bookings
 * and quotes the store provides, as the store, and nothing else.
 */
describe("a store's panel team on its services", () => {
  const booking = {
    id: 7,
    clientId: 'client-1',
    providerId: 'store-1',
    status: 'CONFIRMED',
  };

  const bookings = (store: string | null) => {
    const service = {
      businessProvider: jest.fn().mockResolvedValue(store),
      getServiceBooking: jest.fn().mockResolvedValue(booking),
      getServiceBookingsByProvider: jest.fn().mockResolvedValue({ nodes: [] }),
      completeServiceBooking: jest.fn().mockResolvedValue(booking),
      cancelServiceBooking: jest.fn().mockResolvedValue(booking),
      assertOrdersAdmin: jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('no'), { extensions: { code: 'FORBIDDEN' } }),
        ),
    };
    return {
      service,
      resolver: new BookingsResolver(service as unknown as BookingsService),
    };
  };

  it("lists the store's bookings for its team", async () => {
    const { service, resolver } = bookings('store-1');
    await resolver.myProviderBookings('', 1, 10, undefined, 'admin-1');
    expect(service.getServiceBookingsByProvider).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'store-1' }),
    );
  });

  it('refuses an admin without the permission', async () => {
    const { resolver } = bookings(null);
    expect(
      await codeOf(
        resolver.myProviderBookings('', 1, 10, undefined, 'admin-1'),
      ),
    ).toBe('UNAUTHORIZED');
  });

  it('completes and cancels as the store, on its own bookings only', async () => {
    const own = bookings('store-1');
    expect(
      await codeOf(own.resolver.completeServiceBooking('7', '', 'admin-1')),
    ).toBe('OK');
    await own.resolver.cancelServiceBooking('7', 'Sin cupo', '', 'admin-1');
    expect(own.service.cancelServiceBooking).toHaveBeenCalledWith({
      id: 7,
      cancelledBy: 'store-1',
      reason: 'Sin cupo',
    });

    // A booking where the store is the client is not the team's to work.
    const asClient = bookings('client-1');
    expect(
      await codeOf(
        asClient.resolver.completeServiceBooking('7', '', 'admin-1'),
      ),
    ).toBe('FORBIDDEN');
    expect(
      await codeOf(
        asClient.resolver.cancelServiceBooking('7', 'x', '', 'admin-1'),
      ),
    ).toBe('FORBIDDEN');
    expect(asClient.service.cancelServiceBooking).not.toHaveBeenCalled();
  });

  it('leaves the platform path to platform admins', async () => {
    const { service, resolver } = bookings(null);
    expect(
      await codeOf(resolver.cancelServiceBooking('7', 'x', '', 'admin-1')),
    ).toBe('FORBIDDEN');
    expect(service.assertOrdersAdmin).toHaveBeenCalledWith('admin-1');
  });

  it('replies to and completes the store’s quotes, never as the client', async () => {
    const quotation = {
      id: 3,
      clientId: 'client-1',
      providerId: 'store-1',
      status: 'PENDING',
    };
    const service = {
      businessProvider: jest.fn().mockResolvedValue('store-1'),
      getQuotation: jest.fn().mockResolvedValue(quotation),
      getQuotationsByProvider: jest.fn().mockResolvedValue({ nodes: [] }),
      updateQuotation: jest.fn().mockResolvedValue(quotation),
    };
    const resolver = new QuotationsResolver(
      service as unknown as QuotationsService,
    );

    await resolver.myProviderQuotations('', 1, 10, 'admin-1');
    expect(service.getQuotationsByProvider).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'store-1' }),
    );
    expect(
      await codeOf(
        resolver.updateQuotation(
          { id: '3', estimatedPrice: 30000 },
          '',
          'admin-1',
        ),
      ),
    ).toBe('OK');

    service.businessProvider.mockResolvedValue('client-1');
    expect(
      await codeOf(
        resolver.updateQuotation({ id: '3', estimatedPrice: 1 }, '', 'admin-1'),
      ),
    ).toBe('FORBIDDEN');
  });
});
