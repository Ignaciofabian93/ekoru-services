import { adminSellerScope, assertAdminCan, isAdminWith } from './admin-access';
import { assertInternal } from './internal';
import { PrismaService } from '../prisma/prisma.service';

type Row = {
  adminType: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  sellerId: string | null;
};

const prismaReturning = (rows: Row[]) =>
  ({
    $queryRaw: jest.fn().mockResolvedValue(rows),
  }) as unknown as PrismaService;

const admin = (over: Partial<Row> = {}): Row => ({
  adminType: 'PLATFORM',
  role: 'MODERATOR',
  permissions: [],
  isActive: true,
  sellerId: null,
  ...over,
});

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'OK';
  } catch (e) {
    return (e as { extensions?: { code?: string } }).extensions?.code;
  }
};

describe('assertAdminCan', () => {
  it('rejects a signed-out caller as UNAUTHORIZED', async () => {
    expect(
      await codeOf(
        assertAdminCan(prismaReturning([]), undefined, 'MANAGE_PRODUCTS'),
      ),
    ).toBe('UNAUTHORIZED');
  });

  it('rejects an unknown admin id as FORBIDDEN, so the panel keeps the session', async () => {
    expect(
      await codeOf(
        assertAdminCan(prismaReturning([]), 'a1', 'MANAGE_PRODUCTS'),
      ),
    ).toBe('FORBIDDEN');
  });

  it('rejects a BUSINESS admin even when it holds the permission', async () => {
    const prisma = prismaReturning([
      admin({
        adminType: 'BUSINESS',
        role: 'SUPER_ADMIN',
        permissions: ['MANAGE_PRODUCTS'],
      }),
    ]);
    expect(await codeOf(assertAdminCan(prisma, 'a1', 'MANAGE_PRODUCTS'))).toBe(
      'FORBIDDEN',
    );
  });

  it('rejects an inactive platform admin', async () => {
    const prisma = prismaReturning([
      admin({ isActive: false, role: 'SUPER_ADMIN' }),
    ]);
    expect(await codeOf(assertAdminCan(prisma, 'a1', 'MANAGE_ORDERS'))).toBe(
      'FORBIDDEN',
    );
  });

  it('rejects a platform admin without the permission', async () => {
    const prisma = prismaReturning([
      admin({ permissions: ['MANAGE_CATEGORIES'] }),
    ]);
    expect(await codeOf(assertAdminCan(prisma, 'a1', 'MANAGE_PRODUCTS'))).toBe(
      'FORBIDDEN',
    );
  });

  it('accepts the permission, any of several, or SUPER_ADMIN', async () => {
    expect(
      await codeOf(
        assertAdminCan(
          prismaReturning([admin({ permissions: ['MANAGE_ORDERS'] })]),
          'a1',
          'MANAGE_ORDERS',
        ),
      ),
    ).toBe('OK');
    expect(
      await codeOf(
        assertAdminCan(
          prismaReturning([admin({ permissions: ['VIEW_USER_DATA'] })]),
          'a1',
          ['MANAGE_PRODUCTS', 'VIEW_USER_DATA'],
        ),
      ),
    ).toBe('OK');
    expect(
      await codeOf(
        assertAdminCan(
          prismaReturning([admin({ role: 'SUPER_ADMIN' })]),
          'a1',
          'MANAGE_CATEGORIES',
        ),
      ),
    ).toBe('OK');
  });
});

describe('isAdminWith', () => {
  it('answers without throwing', async () => {
    await expect(
      isAdminWith(prismaReturning([]), undefined, 'MANAGE_ORDERS'),
    ).resolves.toBe(false);
    await expect(
      isAdminWith(
        prismaReturning([admin({ permissions: ['MANAGE_ORDERS'] })]),
        'a1',
        'MANAGE_ORDERS',
      ),
    ).resolves.toBe(true);
  });
});

describe('adminSellerScope', () => {
  it('gives a platform admin with the permission every row', async () => {
    await expect(
      adminSellerScope(
        prismaReturning([admin({ permissions: ['MANAGE_PRODUCTS'] })]),
        'a1',
        'MANAGE_PRODUCTS',
      ),
    ).resolves.toBeUndefined();
  });

  it("limits an active BUSINESS admin to their own seller's rows", async () => {
    await expect(
      adminSellerScope(
        prismaReturning([
          admin({ adminType: 'BUSINESS', sellerId: 'seller-9' }),
        ]),
        'a1',
        'MANAGE_PRODUCTS',
      ),
    ).resolves.toBe('seller-9');
  });

  it('refuses an inactive business admin and a platform admin without the permission', async () => {
    expect(
      await codeOf(
        adminSellerScope(
          prismaReturning([
            admin({
              adminType: 'BUSINESS',
              sellerId: 'seller-9',
              isActive: false,
            }),
          ]),
          'a1',
          'MANAGE_PRODUCTS',
        ),
      ),
    ).toBe('FORBIDDEN');
    expect(
      await codeOf(
        adminSellerScope(prismaReturning([admin()]), 'a1', 'MANAGE_PRODUCTS'),
      ),
    ).toBe('FORBIDDEN');
  });
});

describe('assertInternal', () => {
  const saved = process.env.INTERNAL_SERVICE_SECRET;
  afterEach(() => {
    process.env.INTERNAL_SERVICE_SECRET = saved;
  });

  it('accepts only the exact shared secret', () => {
    process.env.INTERNAL_SERVICE_SECRET = 'shh-123';
    expect(() => assertInternal('shh-123')).not.toThrow();
    expect(() => assertInternal('shh-124')).toThrow();
    expect(() => assertInternal('shh')).toThrow();
    expect(() => assertInternal(undefined)).toThrow();
  });

  it('fails closed when the secret is not configured', () => {
    delete process.env.INTERNAL_SERVICE_SECRET;
    expect(() => assertInternal('')).toThrow();
    expect(() => assertInternal(undefined)).toThrow();
  });
});
