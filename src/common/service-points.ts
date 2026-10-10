import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersClient } from './clients/index.js';

/**
 * Which points activity a completed service earns its client, by service
 * department (ekoru-users docs/POINTS.md). Keyed by the department's Spanish
 * slug (catalogs/services). Anything not listed is SERVICE.
 */
export const SERVICE_DEPARTMENT_KIND: Record<string, string> = {
  // Learning a sustainable skill.
  'clases-y-talleres': 'ATTENDTOWORKSHOP',
  'charlas-y-capacitaciones': 'ATTENDTOWORKSHOP',
  // Keeping things in use.
  reparacion: 'REPAIR',
  'reparacion-de-electrodomesticos': 'REPAIR',
  'reparacion-de-electronica-y-tecnologia': 'REPAIR',
  'oficios-y-mantencion-del-hogar': 'REPAIR',
  'vehiculos-y-mecanica': 'REPAIR',
  'bicicletas-y-micromovilidad': 'REPAIR',
  // Waste kept out of landfill.
  'gestion-de-residuos': 'RECYCLE',
};

const logger = new Logger('ServicePoints');

/** The client's activity kind for a service, from its department. */
export async function serviceActivityKind(
  prisma: PrismaService,
  serviceId: number | null | undefined,
): Promise<string> {
  if (!serviceId) return 'SERVICE';
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      serviceCategory: {
        select: {
          serviceCategory: {
            select: {
              translations: {
                where: { language: 'ES' },
                select: { slug: true },
              },
            },
          },
        },
      },
    },
  });
  const slug = service?.serviceCategory?.serviceCategory?.translations[0]?.slug;
  return (slug && SERVICE_DEPARTMENT_KIND[slug]) || 'SERVICE';
}

/**
 * Points for a completed booking or quotation: the client earns the kind for
 * the service's department (REPAIR, RECYCLE, ATTENDTOWORKSHOP or SERVICE) and
 * the provider earns PROVIDESERVICE. Each is paid once per `reference` by the
 * users engine. Nothing is paid when a provider books their own service.
 * Best-effort: never throws.
 */
export async function awardServicePoints(
  prisma: PrismaService,
  users: UsersClient,
  {
    serviceId,
    clientId,
    providerId,
    reference,
  }: {
    serviceId: number | null | undefined;
    clientId: string;
    providerId: string;
    reference: string;
  },
): Promise<void> {
  if (!clientId || !providerId || clientId === providerId) return;
  try {
    const clientKind = await serviceActivityKind(prisma, serviceId);
    await Promise.all([
      users.awardActivityPoints({
        sellerId: clientId,
        kind: clientKind,
        reference,
      }),
      users.awardActivityPoints({
        sellerId: providerId,
        kind: 'PROVIDESERVICE',
        reference,
      }),
    ]);
  } catch (error) {
    logger.error(`Points for ${reference} failed`, error);
  }
}
