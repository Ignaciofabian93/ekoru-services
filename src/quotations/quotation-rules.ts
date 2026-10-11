import type { Prisma } from '@prisma/client';
import { BadRequestError, ForbiddenError } from '../common/exceptions/index.js';
import type { UpdateQuotationInput } from './dto/index.js';

/**
 * The quotation lifecycle and who drives each step.
 *
 *   PENDING ──client accepts──▶ ACCEPTED ──provider completes──▶ COMPLETED
 *      │  └─client declines──▶ DECLINED
 *      └──either cancels (PENDING or unpaid ACCEPTED)──▶ CANCELLED
 *
 * The provider prices the request while it is PENDING; accepting freezes the
 * price, because ekoru-transactions charges `finalPrice ?? estimatedPrice`
 * (SRV-3) and the client must pay what they accepted. Once paid, cancelling is
 * a refund, which is an admin action, not this flow.
 *
 * Kept free of Nest and Prisma calls so every rule is unit-tested directly.
 */
export type QuotationRole = 'client' | 'provider';

interface QuotationState {
  status: string;
  estimatedPrice?: number | null;
  finalPrice?: number | null;
  expiresAt?: Date | null;
  paidAt?: Date | null;
}

/** What the client is charged: the final price once set, else the estimate. */
export function quotedPrice(q: QuotationState): number | null {
  return q.finalPrice ?? q.estimatedPrice ?? null;
}

export function quotationRole(
  q: { clientId: string; providerId: string },
  sellerId: string | undefined,
): QuotationRole | null {
  if (!sellerId) return null;
  if (q.providerId === sellerId) return 'provider';
  if (q.clientId === sellerId) return 'client';
  return null;
}

export function assertQuotationAcceptable(
  q: QuotationState,
  now: Date = new Date(),
): void {
  if (q.status !== 'PENDING') {
    throw new BadRequestError('Esta cotización ya no se puede aceptar');
  }
  // Zero is a valid (free) quote; what cannot be accepted is no price at all.
  const price = quotedPrice(q);
  if (price == null || price < 0) {
    throw new BadRequestError(
      'El proveedor todavía no ha enviado un precio para esta cotización',
    );
  }
  if (q.expiresAt && q.expiresAt.getTime() < now.getTime()) {
    throw new BadRequestError('Esta cotización expiró');
  }
}

export function assertQuotationDeclinable(q: QuotationState): void {
  if (q.status !== 'PENDING') {
    throw new BadRequestError('Esta cotización ya no se puede rechazar');
  }
}

/** The work is done once the client accepted the price, not before. */
export function assertQuotationCompletable(q: QuotationState): void {
  if (q.status !== 'ACCEPTED') {
    throw new BadRequestError(
      'Solo se puede completar una cotización aceptada',
    );
  }
}

export function assertQuotationCancellable(q: QuotationState): void {
  if (!['PENDING', 'ACCEPTED'].includes(q.status)) {
    throw new BadRequestError('Esta cotización ya está cerrada');
  }
  if (q.paidAt) {
    throw new BadRequestError(
      'Esta cotización ya fue pagada; contacta a soporte para un reembolso',
    );
  }
}

/** The client removes a request nobody is working on. */
export function assertQuotationDeletable(q: QuotationState): void {
  if (!['PENDING', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(q.status)) {
    throw new BadRequestError(
      'Solo se puede eliminar una cotización pendiente o cerrada sin trabajo',
    );
  }
  if (q.paidAt) {
    throw new BadRequestError('Una cotización pagada no se puede eliminar');
  }
}

/**
 * Validates the provider's reply and returns the columns it may write. Status
 * moves have their own mutations (accept, decline, complete, cancel); payment
 * state belongs to ekoru-transactions; the client's notes are the client's.
 */
export function quotationUpdateData(
  current: QuotationState,
  input: UpdateQuotationInput,
): Prisma.QuotationUpdateInput {
  const notHere: (keyof UpdateQuotationInput)[] = [
    'status',
    'clientNotes',
    'depositPaid',
    'declineReason',
    'cancellationReason',
  ];
  const sent = notHere.filter((f) => input[f] != null);
  if (sent.length) {
    throw new ForbiddenError(
      `Estos campos no se cambian al responder una cotización: ${sent.join(', ')}`,
    );
  }
  if (!['PENDING', 'ACCEPTED'].includes(current.status)) {
    throw new BadRequestError('Esta cotización ya está cerrada');
  }

  const repricing =
    input.estimatedPrice != null ||
    input.finalPrice != null ||
    input.estimatedDuration != null ||
    input.expiresAt != null;
  if (repricing && current.status !== 'PENDING') {
    throw new BadRequestError(
      'El cliente ya aceptó este precio; no se puede cambiar',
    );
  }
  for (const price of [input.estimatedPrice, input.finalPrice]) {
    if (price != null && price < 0) {
      throw new BadRequestError('El precio no puede ser negativo');
    }
  }

  return {
    ...(input.estimatedPrice != null && {
      estimatedPrice: input.estimatedPrice,
    }),
    ...(input.finalPrice != null && { finalPrice: input.finalPrice }),
    ...(input.estimatedDuration != null && {
      estimatedDuration: input.estimatedDuration,
    }),
    ...(input.providerNotes != null && { providerNotes: input.providerNotes }),
    ...(input.attachments != null && { attachments: input.attachments }),
    ...(input.expiresAt != null && { expiresAt: input.expiresAt }),
    updatedAt: new Date(),
  };
}
