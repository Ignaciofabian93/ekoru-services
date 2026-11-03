import { BusinessServicesService } from './business-services.service';
import { ServicesService } from '../services/services.service';
import { PrismaService } from '../prisma/prisma.service';

const OWNER = {
  adminType: 'BUSINESS',
  role: 'BUSINESS_OWNER',
  permissions: [],
  isActive: true,
  sellerId: 'shop-1',
};
const APPROVED_SERVICES = {
  isActive: true,
  approvalStatus: 'APPROVED',
  businessType: 'SERVICES',
};

const newRow = {
  name: 'Calibración de guitarra',
  subcategoryId: 20,
  pricingType: 'FIXED' as never,
  basePrice: 25000,
};

function setup({
  admin = OWNER,
  seller = APPROVED_SERVICES,
}: { admin?: object; seller?: object } = {}) {
  const prisma = {
    // The admin row (businessAdminSellerId), then the seller (assertCanPublish).
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([admin])
      .mockResolvedValueOnce([seller]),
    serviceSubCategory: {
      findMany: jest.fn().mockResolvedValue([{ id: 20 }]),
    },
    service: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 301 }),
      update: jest.fn().mockResolvedValue({ id: 9 }),
    },
  };
  const db = prisma as unknown as PrismaService;
  const service = new BusinessServicesService(db, new ServicesService(db));
  return { prisma, service };
}

describe('BusinessServicesService (ADM-16)', () => {
  it('publishes a service for the caller, never another provider', async () => {
    const { prisma, service } = setup();

    const result = await service.publishMyServices({
      adminId: 'owner',
      rows: [{ ...newRow, ...({ sellerId: 'shop-2' } as object) }],
    });

    expect(result).toMatchObject({ created: 1, failed: 0, createdIds: [301] });
    expect(prisma.service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sellerId: 'shop-1', images: [] }),
      }),
    );
  });

  it('lets a quoted service go without a price, and refuses others', async () => {
    const { service } = setup();

    const result = await service.publishMyServices({
      adminId: 'owner',
      rows: [
        { ...newRow, pricingType: 'QUOTATION' as never, basePrice: null },
        { ...newRow, basePrice: 0 },
        { ...newRow, subcategoryId: 99 },
        { ...newRow, name: '' },
      ],
    });

    expect(result.created).toBe(1);
    expect(result.errors.map((e) => [e.index, e.message])).toEqual([
      [
        1,
        'Indica un precio mayor que 0, salvo en los servicios por cotización',
      ],
      [2, 'La subcategoría 99 no existe'],
      [3, 'Faltan datos obligatorios: name'],
    ]);
  });

  it('updates only its own services', async () => {
    const { prisma, service } = setup();
    prisma.service.findUnique.mockResolvedValue({
      sellerId: 'shop-2',
      pricingType: 'FIXED',
      basePrice: 1000,
    });

    const result = await service.publishMyServices({
      adminId: 'owner',
      rows: [{ id: 9, basePrice: 2000 }],
    });
    expect(result.errors[0].message).toBe(
      'El servicio 9 no existe entre los tuyos',
    );
    expect(prisma.service.update).not.toHaveBeenCalled();
  });

  it('refuses a business that does not offer services', async () => {
    const { service } = setup({
      seller: { ...APPROVED_SERVICES, businessType: 'RETAIL' },
    });

    await expect(
      service.publishMyServices({ adminId: 'owner', rows: [newRow] }),
    ).rejects.toThrow('Solo las empresas de servicios aprobadas');
  });

  it('refuses a platform admin and an account without the permission', async () => {
    for (const admin of [
      { ...OWNER, adminType: 'PLATFORM', role: 'SUPER_ADMIN' },
      { ...OWNER, role: 'BUSINESS_SUPPORT', permissions: [] },
    ]) {
      const { service } = setup({ admin });
      await expect(
        service.publishMyServices({ adminId: 'a', rows: [newRow] }),
      ).rejects.toThrow('MANAGE_BUSINESS_PRODUCTS');
    }
  });
});
