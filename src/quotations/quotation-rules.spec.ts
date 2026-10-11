import { BadRequestError, ForbiddenError } from '../common/exceptions/index';
import { QuotationStatus } from '../graphql/enums/index';
import {
  assertQuotationAcceptable,
  assertQuotationCancellable,
  assertQuotationCompletable,
  assertQuotationDeclinable,
  assertQuotationDeletable,
  quotationRole,
  quotationUpdateData,
  quotedPrice,
} from './quotation-rules';

describe('quotation rules', () => {
  const now = new Date('2026-10-10T12:00:00Z');

  it('charges the final price when set, else the estimate', () => {
    expect(quotedPrice({ status: 'PENDING', estimatedPrice: 500 })).toBe(500);
    expect(
      quotedPrice({ status: 'PENDING', estimatedPrice: 500, finalPrice: 450 }),
    ).toBe(450);
    expect(quotedPrice({ status: 'PENDING' })).toBeNull();
  });

  it('names the side the caller is on, or nobody', () => {
    const q = { clientId: 'c', providerId: 'p' };
    expect(quotationRole(q, 'p')).toBe('provider');
    expect(quotationRole(q, 'c')).toBe('client');
    expect(quotationRole(q, 'x')).toBeNull();
  });

  describe('accepting', () => {
    it('accepts a priced, pending, unexpired quote (a free one included)', () => {
      expect(() =>
        assertQuotationAcceptable(
          { status: 'PENDING', estimatedPrice: 500 },
          now,
        ),
      ).not.toThrow();
      expect(() =>
        assertQuotationAcceptable({ status: 'PENDING', finalPrice: 0 }, now),
      ).not.toThrow();
    });

    it('refuses a quote the provider has not priced', () => {
      expect(() =>
        assertQuotationAcceptable({ status: 'PENDING' }, now),
      ).toThrow(BadRequestError);
    });

    it('refuses an expired quote', () => {
      expect(() =>
        assertQuotationAcceptable(
          {
            status: 'PENDING',
            estimatedPrice: 500,
            expiresAt: new Date('2026-10-09T00:00:00Z'),
          },
          now,
        ),
      ).toThrow(BadRequestError);
    });

    it('refuses anything but PENDING', () => {
      expect(() =>
        assertQuotationAcceptable(
          { status: 'DECLINED', estimatedPrice: 500 },
          now,
        ),
      ).toThrow(BadRequestError);
    });
  });

  it('declines only a pending quote', () => {
    expect(() =>
      assertQuotationDeclinable({ status: 'PENDING' }),
    ).not.toThrow();
    expect(() => assertQuotationDeclinable({ status: 'ACCEPTED' })).toThrow(
      BadRequestError,
    );
  });

  it('completes only an accepted quote', () => {
    expect(() =>
      assertQuotationCompletable({ status: 'ACCEPTED' }),
    ).not.toThrow();
    expect(() => assertQuotationCompletable({ status: 'PENDING' })).toThrow(
      BadRequestError,
    );
  });

  it('cancels an open, unpaid quote only', () => {
    expect(() =>
      assertQuotationCancellable({ status: 'ACCEPTED' }),
    ).not.toThrow();
    expect(() =>
      assertQuotationCancellable({ status: 'ACCEPTED', paidAt: now }),
    ).toThrow(BadRequestError);
    expect(() => assertQuotationCancellable({ status: 'COMPLETED' })).toThrow(
      BadRequestError,
    );
  });

  it('deletes only a quote nobody is working on and nobody paid', () => {
    expect(() =>
      assertQuotationDeletable({ status: 'DECLINED' }),
    ).not.toThrow();
    expect(() => assertQuotationDeletable({ status: 'ACCEPTED' })).toThrow(
      BadRequestError,
    );
    expect(() =>
      assertQuotationDeletable({ status: 'CANCELLED', paidAt: now }),
    ).toThrow(BadRequestError);
  });

  describe('quotationUpdateData (the provider reply)', () => {
    it('writes prices and notes while pending', () => {
      expect(
        quotationUpdateData(
          { status: 'PENDING' },
          { id: '1', estimatedPrice: 700, providerNotes: 'Incluye materiales' },
        ),
      ).toMatchObject({
        estimatedPrice: 700,
        providerNotes: 'Incluye materiales',
      });
    });

    it.each([
      ['status', { status: QuotationStatus.COMPLETED }],
      ['clientNotes', { clientNotes: 'x' }],
      ['depositPaid', { depositPaid: true }],
      ['declineReason', { declineReason: 'x' }],
      ['cancellationReason', { cancellationReason: 'x' }],
    ])('refuses %s', (_field, extra) => {
      expect(() =>
        quotationUpdateData({ status: 'PENDING' }, { id: '1', ...extra }),
      ).toThrow(ForbiddenError);
    });

    it('freezes prices after acceptance but still takes notes', () => {
      expect(() =>
        quotationUpdateData({ status: 'ACCEPTED' }, { id: '1', finalPrice: 1 }),
      ).toThrow(BadRequestError);
      expect(
        quotationUpdateData(
          { status: 'ACCEPTED' },
          { id: '1', providerNotes: 'Voy el lunes' },
        ),
      ).toMatchObject({ providerNotes: 'Voy el lunes' });
    });

    it('refuses negative prices and closed quotes', () => {
      expect(() =>
        quotationUpdateData({ status: 'PENDING' }, { id: '1', finalPrice: -5 }),
      ).toThrow(BadRequestError);
      expect(() =>
        quotationUpdateData(
          { status: 'COMPLETED' },
          { id: '1', providerNotes: 'x' },
        ),
      ).toThrow(BadRequestError);
    });
  });
});
