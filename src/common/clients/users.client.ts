import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Notification types this subgraph emits. A subset of the users subgraph's
 * `NotificationType`, kept as a string union rather than imported so the two
 * services stay independently deployable.
 */
export type NotificationType =
  | 'QUOTATION_REQUEST'
  | 'QUOTATION_RECEIVED'
  | 'QUOTATION_ACCEPTED'
  | 'QUOTATION_DECLINED'
  | 'QUOTATION_COMPLETED'
  | 'BOOKING_REQUEST'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED';

export interface NotifyInput {
  /** Who is being notified — the counterpart, never the person who acted. */
  sellerId: string;
  type: NotificationType;
  /** Quotation/booking id, for deep-linking from the in-app feed. */
  relatedId?: string | number | null;
  actionUrl?: string | null;
  /**
   * Fills `{{placeholders}}` in the admin-editable copy. `actorSellerId` is
   * resolved to a display name by users, so this subgraph never fetches a
   * profile just to address a notification.
   */
  data?: Record<string, unknown>;
}

/**
 * Reports service events to the users subgraph, which owns notification
 * delivery.
 *
 * This subgraph holds no templates and makes no delivery decisions: whether a
 * notification reaches someone — and through which channel — depends on
 * `SellerPreferences` and `NotificationTemplate`, both of which live in the
 * users database. So it reports *what happened* and users decides the rest.
 *
 * Called directly service-to-service (not through the gateway). The internal
 * secret travels only as the `x-internal-secret` header — the users resolver
 * accepts nothing else, since the former mutation argument put the credential
 * in the public schema.
 */
@Injectable()
export class UsersClient {
  private readonly logger = new Logger(UsersClient.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Records a notification. Best-effort: a booking that was confirmed must
   * stay confirmed even if nobody could be told, so this never throws.
   * Returns whether the notification was recorded.
   */
  async notify(input: NotifyInput): Promise<boolean> {
    const url = this.config.get<string>('subgraphs.users');
    const secret = this.config.get<string>('internalSecret');

    // Misconfiguration is silent otherwise: the notification simply never
    // happens, which is exactly the failure that is hardest to notice.
    if (!url) {
      this.logger.error(`USERS_URL not configured — ${input.type} not sent`);
      return false;
    }
    if (!secret) {
      this.logger.error(
        `INTERNAL_SERVICE_SECRET not configured — ${input.type} not sent`,
      );
      return false;
    }

    const mutation = /* GraphQL */ `
      mutation EmitNotification($input: EmitNotificationInput!) {
        emitNotification(input: $input)
      }
    `;

    const variables = {
      input: {
        sellerId: input.sellerId,
        type: input.type,
        relatedId: input.relatedId == null ? null : String(input.relatedId),
        actionUrl: input.actionUrl ?? null,
        data: input.data ?? {},
      },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': secret,
        },
        body: JSON.stringify({ query: mutation, variables }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(
          `Users returned ${res.status} for ${input.type}: ${body || '(no body)'}`,
        );
        return false;
      }

      const body = (await res.json()) as {
        data?: { emitNotification: number | null };
        errors?: Array<{ message: string }>;
      };
      if (body.errors?.length) {
        // Every message on one line, so a single grep explains the failure.
        const messages = body.errors.map((e) => e.message).join(' | ');
        this.logger.error(`${input.type} rejected by users: ${messages}`);
        return false;
      }
      return body.data?.emitNotification != null;
    } catch (err) {
      this.logger.error(
        `${input.type} for seller ${input.sellerId} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }
}
