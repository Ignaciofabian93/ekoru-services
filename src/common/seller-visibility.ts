import { PrismaService } from '../prisma/prisma.service.js';

/** How long the hidden-provider list is reused before it is read again. */
const TTL_MS = 30_000;
let cache: { at: number; ids: string[] } | undefined;

/**
 * Providers whose services must not be shown, booked or quoted: inactive
 * accounts (a ban or a deactivation sets `Seller.isActive` false) and anyone
 * who is not a business EKORU approved. The same rule ekoru-stores applies to
 * store products and ekoru-search to the index.
 *
 * Seller and BusinessProfile belong to ekoru-users, so this is raw SQL, limited
 * to sellers who have services, which keeps the list short. Cached for 30
 * seconds: every listing needs it, and a ban taking half a minute to reach the
 * catalog is acceptable.
 */
export async function hiddenProviderIds(
  prisma: PrismaService,
): Promise<string[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.ids;
  const rows = await prisma.$queryRaw<{ sellerId: string }[]>`
    SELECT DISTINCT sv."sellerId"
      FROM "Service" sv
      JOIN "Seller" s ON s."id" = sv."sellerId"
      LEFT JOIN "BusinessProfile" bp ON bp."sellerId" = s."id"
     WHERE s."isActive" = false
        OR bp."approvalStatus" IS DISTINCT FROM 'APPROVED'`;
  cache = { at: now, ids: rows.map((r) => r.sellerId) };
  return cache.ids;
}

/** Forget the cached list (tests). */
export function resetHiddenProviderCache(): void {
  cache = undefined;
}
