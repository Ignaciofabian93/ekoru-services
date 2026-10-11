import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenError, UnauthorizedError } from './exceptions/index.js';

/** The admin permissions this subgraph checks (subset of the AdminPermission enum). */
export type AdminPermissionName =
  | 'MANAGE_CATEGORIES'
  | 'MANAGE_PRODUCTS'
  | 'MANAGE_ORDERS'
  | 'MODERATE_CONTENT'
  | 'VIEW_USER_DATA';

interface AdminRow {
  adminType: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  sellerId: string | null;
}

/**
 * The Admin table belongs to ekoru-users, so it is read with raw SQL (the
 * cross-subgraph convention). Reading it per request means a deactivated admin
 * or a revoked permission takes effect at once.
 */
async function loadAdmin(
  prisma: PrismaService,
  adminId: string,
): Promise<AdminRow | undefined> {
  const rows = await prisma.$queryRaw<AdminRow[]>`
    SELECT "adminType"::text     AS "adminType",
           "role"::text          AS "role",
           "permissions"::text[] AS "permissions",
           "isActive",
           "sellerId"
    FROM "Admin"
    WHERE "id" = ${adminId}
    LIMIT 1`;
  return rows[0];
}

function asList(
  permission: AdminPermissionName | readonly AdminPermissionName[],
): readonly AdminPermissionName[] {
  return Array.isArray(permission)
    ? permission
    : [permission as AdminPermissionName];
}

function isPlatformAdminWith(
  admin: AdminRow | undefined,
  accepted: readonly AdminPermissionName[],
): boolean {
  return (
    !!admin &&
    admin.isActive &&
    admin.adminType === 'PLATFORM' &&
    (admin.role === 'SUPER_ADMIN' ||
      accepted.some((p) => (admin.permissions ?? []).includes(p)))
  );
}

function forbidden(accepted: readonly AdminPermissionName[]): ForbiddenError {
  return new ForbiddenError(
    accepted.length === 1
      ? `This action requires the ${accepted[0]} permission`
      : `This action requires one of these permissions: ${accepted.join(', ')}`,
  );
}

/**
 * Ensures the caller is an active PLATFORM admin who is SUPER_ADMIN or holds
 * `permission` — the same rule ekoru-users applies (SEC-8). Returns the admin id.
 * Pass several permissions when any one of them is enough, for a read that
 * more than one panel screen needs.
 *
 * A token only proves *who* the admin is. Before this check, any admin token,
 * including a BUSINESS admin's, could rewrite the services catalog, every
 * provider's services and packages, and read provider credentials. Refusal is
 * FORBIDDEN, not UNAUTHORIZED, so the panel keeps the session.
 */
export async function assertAdminCan(
  prisma: PrismaService,
  adminId: string | undefined,
  permission: AdminPermissionName | readonly AdminPermissionName[],
): Promise<string> {
  const accepted = asList(permission);
  if (!adminId) throw new UnauthorizedError('Admin authentication required');
  if (!isPlatformAdminWith(await loadAdmin(prisma, adminId), accepted)) {
    throw forbidden(accepted);
  }
  return adminId;
}

/**
 * Whether the caller is a platform admin with any of `permission`, without
 * throwing. For reads that participants may also make: a participant gets
 * through on their own id, and only a non-participant pays for this lookup.
 */
export async function isAdminWith(
  prisma: PrismaService,
  adminId: string | undefined,
  permission: AdminPermissionName | readonly AdminPermissionName[],
): Promise<boolean> {
  if (!adminId) return false;
  return isPlatformAdminWith(
    await loadAdmin(prisma, adminId),
    asList(permission),
  );
}

/**
 * Read access for a list the panel's read-only `my-business` screen also uses.
 * A platform admin with `permission` reads every row, so the result is
 * `undefined` (no scope). An active BUSINESS admin reads only their own
 * seller's rows, so the result is that seller id, and the caller must filter
 * by it whatever seller the request named. Anyone else is refused.
 */
export async function adminSellerScope(
  prisma: PrismaService,
  adminId: string | undefined,
  permission: AdminPermissionName | readonly AdminPermissionName[],
): Promise<string | undefined> {
  const accepted = asList(permission);
  if (!adminId) throw new UnauthorizedError('Admin authentication required');
  const admin = await loadAdmin(prisma, adminId);
  if (isPlatformAdminWith(admin, accepted)) return undefined;
  if (admin?.isActive && admin.adminType === 'BUSINESS' && admin.sellerId) {
    return admin.sellerId;
  }
  throw forbidden(accepted);
}
