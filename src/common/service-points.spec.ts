import { awardServicePoints, serviceActivityKind } from './service-points';
import { PrismaService } from '../prisma/prisma.service';
import { UsersClient } from './clients/index';

const prismaWithSlug = (slug: string | null) =>
  ({
    service: {
      findUnique: jest.fn().mockResolvedValue(
        slug === null
          ? null
          : {
              serviceCategory: {
                serviceCategory: { translations: [{ slug }] },
              },
            },
      ),
    },
  }) as unknown as PrismaService;

describe('serviceActivityKind', () => {
  it.each([
    ['reparacion', 'REPAIR'],
    ['bicicletas-y-micromovilidad', 'REPAIR'],
    ['gestion-de-residuos', 'RECYCLE'],
    ['clases-y-talleres', 'ATTENDTOWORKSHOP'],
    ['charlas-y-capacitaciones', 'ATTENDTOWORKSHOP'],
    ['asesorias', 'SERVICE'],
    ['arriendo-y-economia-colaborativa', 'SERVICE'],
  ])('maps the %s department to %s', async (slug, kind) => {
    await expect(serviceActivityKind(prismaWithSlug(slug), 1)).resolves.toBe(
      kind,
    );
  });

  it('falls back to SERVICE when the service is gone or missing', async () => {
    await expect(serviceActivityKind(prismaWithSlug(null), 1)).resolves.toBe(
      'SERVICE',
    );
    await expect(serviceActivityKind(prismaWithSlug('x'), null)).resolves.toBe(
      'SERVICE',
    );
  });
});

describe('awardServicePoints', () => {
  const users = () => ({
    awardActivityPoints: jest.fn().mockResolvedValue(10),
  });

  it('pays the client by department and the provider PROVIDESERVICE', async () => {
    const client = users();
    await awardServicePoints(
      prismaWithSlug('reparacion'),
      client as unknown as UsersClient,
      { serviceId: 3, clientId: 'c', providerId: 'p', reference: 'booking:9' },
    );
    expect(client.awardActivityPoints).toHaveBeenCalledWith({
      sellerId: 'c',
      kind: 'REPAIR',
      reference: 'booking:9',
    });
    expect(client.awardActivityPoints).toHaveBeenCalledWith({
      sellerId: 'p',
      kind: 'PROVIDESERVICE',
      reference: 'booking:9',
    });
  });

  it('pays nothing when a provider books their own service', async () => {
    const client = users();
    await awardServicePoints(
      prismaWithSlug('reparacion'),
      client as unknown as UsersClient,
      { serviceId: 3, clientId: 'p', providerId: 'p', reference: 'booking:9' },
    );
    expect(client.awardActivityPoints).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    const prisma = {
      service: { findUnique: jest.fn().mockRejectedValue(new Error('db')) },
    } as unknown as PrismaService;
    await expect(
      awardServicePoints(prisma, users() as unknown as UsersClient, {
        serviceId: 3,
        clientId: 'c',
        providerId: 'p',
        reference: 'quotation:1',
      }),
    ).resolves.toBeUndefined();
  });
});
