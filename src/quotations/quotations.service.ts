import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions/index.js';
import { assertAdminCan, isAdminWith } from '../common/admin-access.js';
import { hiddenProviderIds } from '../common/seller-visibility.js';
import { quotationUpdateData, quotedPrice } from './quotation-rules.js';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils/index.js';
import { AddQuotationInput, UpdateQuotationInput } from './dto/index.js';
import { QuotationStatus } from '../graphql/enums/index.js';
import { UsersClient, type NotificationType } from '../common/clients/index.js';
import { awardServicePoints } from '../common/service-points.js';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersClient,
    private readonly config: ConfigService,
  ) {}

  /** Quotations oversight is the panel's MANAGE_ORDERS screen (SEC-8). */
  assertOrdersAdmin(adminId: string | undefined): Promise<string> {
    return assertAdminCan(this.prisma, adminId, 'MANAGE_ORDERS');
  }

  isOrdersAdmin(adminId: string | undefined): Promise<boolean> {
    return isAdminWith(this.prisma, adminId, 'MANAGE_ORDERS');
  }

  /**
   * Tells the other party what just happened to a quotation.
   *
   * Best-effort and never awaited by the caller's result: a quotation that was
   * accepted must stay accepted even if nobody could be notified.
   */
  private notify(
    quotation: QuotationForNotify,
    type: NotificationType,
    recipientId: string,
    extra: Record<string, unknown> = {},
  ): void {
    const base = this.config.get<string>('webAppBaseUrl');
    // `.catch` rather than bare `void`: an unguarded rejected promise takes the
    // process down, and a quotation must not fail because of a notice.
    void this.users
      .notify({
        sellerId: recipientId,
        type,
        relatedId: quotation.id,
        actionUrl: base ? `${base}/profile/quotes` : null,
        data: {
          // The actor is whoever is NOT being notified — users resolves this to
          // a display name for the copy.
          actorSellerId:
            recipientId === quotation.clientId
              ? quotation.providerId
              : quotation.clientId,
          serviceName: quotation.service?.name ?? quotation.title,
          quotationTitle: quotation.title,
          ...extra,
        },
      })
      .catch((error) =>
        this.logger.error(
          `Quotation ${quotation.id} notification failed:`,
          error,
        ),
      );
  }

  async getQuotation(id: number) {
    try {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id },
        select: {
          id: true,
          serviceId: true,
          clientId: true,
          providerId: true,
          title: true,
          description: true,
          estimatedPrice: true,
          finalPrice: true,
          estimatedDuration: true,
          status: true,
          clientNotes: true,
          providerNotes: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          acceptedAt: true,
          completedAt: true,
          declineReason: true,
          cancellationReason: true,
          paidAt: true,
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      if (!quotation) {
        throw new NotFoundError('Cotización no encontrada');
      }

      return {
        ...quotation,
        client: { id: quotation.clientId },
        provider: { id: quotation.providerId },
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Error al obtener la cotización:', error);
      throw new InternalServerError('Error al obtener la cotización');
    }
  }

  async getQuotationsByClient({
    clientId,
    page,
    pageSize,
  }: {
    clientId: string;
    page: number;
    pageSize: number;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const count = await this.prisma.quotation.count({ where: { clientId } });
      const quotations = await this.prisma.quotation.findMany({
        where: { clientId },
        skip,
        take,
      });

      const mappedQuotations = quotations.map((q) => ({
        ...q,
        client: { id: q.clientId },
        provider: { id: q.providerId },
      }));

      return createPaginatedResponse(mappedQuotations, count, page, pageSize);
    } catch (error) {
      this.logger.error(
        'Error al obtener las cotizaciones del cliente:',
        error,
      );
      throw new InternalServerError(
        'Error al obtener las cotizaciones del cliente',
      );
    }
  }

  async getQuotationsByProvider({
    providerId,
    page,
    pageSize,
  }: {
    providerId: string;
    page: number;
    pageSize: number;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const count = await this.prisma.quotation.count({
        where: { providerId },
      });
      const quotations = await this.prisma.quotation.findMany({
        where: { providerId },
        skip,
        take,
      });

      const mappedQuotations = quotations.map((q) => ({
        ...q,
        client: { id: q.clientId },
        provider: { id: q.providerId },
      }));

      return createPaginatedResponse(mappedQuotations, count, page, pageSize);
    } catch (error) {
      this.logger.error(
        'Error al obtener las cotizaciones del proveedor:',
        error,
      );
      throw new InternalServerError(
        'Error al obtener las cotizaciones del proveedor',
      );
    }
  }

  async getQuotationsByService({
    serviceId,
    page,
    pageSize,
  }: {
    serviceId: number;
    page: number;
    pageSize: number;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const count = await this.prisma.quotation.count({ where: { serviceId } });
      const quotations = await this.prisma.quotation.findMany({
        where: { serviceId },
        skip,
        take,
      });

      const mappedQuotations = quotations.map((q) => ({
        ...q,
        client: { id: q.clientId },
        provider: { id: q.providerId },
      }));

      return createPaginatedResponse(mappedQuotations, count, page, pageSize);
    } catch (error) {
      this.logger.error(
        'Error al obtener las cotizaciones del servicio:',
        error,
      );
      throw new InternalServerError(
        'Error al obtener las cotizaciones del servicio',
      );
    }
  }

  async getQuotationsByStatus({
    status,
    page,
    pageSize,
  }: {
    status: QuotationStatus;
    page: number;
    pageSize: number;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const count = await this.prisma.quotation.count({ where: { status } });
      const quotations = await this.prisma.quotation.findMany({
        where: { status },
        skip,
        take,
      });

      const mappedQuotations = quotations.map((q) => ({
        ...q,
        client: { id: q.clientId },
        provider: { id: q.providerId },
      }));

      return createPaginatedResponse(mappedQuotations, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener las cotizaciones por estado:', error);
      throw new InternalServerError(
        'Error al obtener las cotizaciones por estado',
      );
    }
  }

  async addQuotation(input: AddQuotationInput & { clientId: string }) {
    const service = await this.prisma.service.findUnique({
      where: { id: input.serviceId },
      select: { sellerId: true, isActive: true },
    });
    if (
      !service?.isActive ||
      (await hiddenProviderIds(this.prisma)).includes(service.sellerId)
    ) {
      throw new BadRequestError('Servicio no disponible');
    }
    if (service.sellerId === input.clientId) {
      throw new BadRequestError('No puedes cotizar tu propio servicio');
    }
    try {
      // The provider is the service's seller, whatever the client sent, and
      // the price is the provider's to give (updateQuotation): a client who
      // could set it could accept their own price.
      const quotation = await this.prisma.quotation.create({
        data: {
          serviceId: input.serviceId,
          clientId: input.clientId,
          providerId: service.sellerId,
          title: input.title,
          description: input.description,
          estimatedDuration: input.estimatedDuration,
          clientNotes: input.clientNotes,
          attachments: input.attachments || [],
          expiresAt: input.expiresAt,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          serviceId: true,
          clientId: true,
          providerId: true,
          title: true,
          description: true,
          estimatedPrice: true,
          finalPrice: true,
          estimatedDuration: true,
          status: true,
          clientNotes: true,
          providerNotes: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          acceptedAt: true,
          completedAt: true,
          declineReason: true,
          cancellationReason: true,
          paidAt: true,
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      this.notify(quotation, 'QUOTATION_REQUEST', quotation.providerId);

      return {
        ...quotation,
        client: { id: quotation.clientId },
        provider: { id: quotation.providerId },
      };
    } catch (error) {
      this.logger.error('Error al crear la cotización:', error);
      throw new InternalServerError('Error al crear la cotización');
    }
  }

  /**
   * The provider's reply. `current` comes from the resolver's provider check;
   * quotation-rules.ts decides what may change (prices only while PENDING).
   */
  async updateQuotation({
    input,
    current,
  }: {
    input: UpdateQuotationInput;
    current: { status: string; paidAt?: Date | null };
  }) {
    const data = quotationUpdateData(current, input);
    try {
      const id = parseInt(input.id, 10);

      const quotation = await this.prisma.quotation.update({
        where: { id },
        data,
        select: {
          id: true,
          serviceId: true,
          clientId: true,
          providerId: true,
          title: true,
          description: true,
          estimatedPrice: true,
          finalPrice: true,
          estimatedDuration: true,
          status: true,
          clientNotes: true,
          providerNotes: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          acceptedAt: true,
          completedAt: true,
          declineReason: true,
          cancellationReason: true,
          paidAt: true,
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      // Only the provider replies (resolver), so the client hears about a
      // new price or note. Status moves have their own mutations.
      if (
        input.finalPrice != null ||
        input.estimatedPrice != null ||
        input.providerNotes != null
      ) {
        this.notify(quotation, 'QUOTATION_RECEIVED', quotation.clientId);
      }
      return {
        ...quotation,
        client: { id: quotation.clientId },
        provider: { id: quotation.providerId },
      };
    } catch (error) {
      this.logger.error('Error al actualizar la cotización:', error);
      throw new InternalServerError('Error al actualizar la cotización');
    }
  }

  async acceptQuotation(id: number) {
    try {
      const quotation = await this.prisma.quotation.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          serviceId: true,
          clientId: true,
          providerId: true,
          title: true,
          description: true,
          estimatedPrice: true,
          finalPrice: true,
          estimatedDuration: true,
          status: true,
          clientNotes: true,
          providerNotes: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          acceptedAt: true,
          completedAt: true,
          declineReason: true,
          cancellationReason: true,
          paidAt: true,
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      // The client accepts a quote, so the provider is who needs telling.
      this.notify(quotation, 'QUOTATION_ACCEPTED', quotation.providerId);
      return {
        ...quotation,
        client: { id: quotation.clientId },
        provider: { id: quotation.providerId },
      };
    } catch (error) {
      this.logger.error('Error al aceptar la cotización:', error);
      throw new InternalServerError('Error al aceptar la cotización');
    }
  }

  async declineQuotation({ id, reason }: { id: number; reason?: string }) {
    try {
      const quotation = await this.prisma.quotation.update({
        where: { id },
        data: {
          status: 'DECLINED',
          declineReason: reason || undefined,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          serviceId: true,
          clientId: true,
          providerId: true,
          title: true,
          description: true,
          estimatedPrice: true,
          finalPrice: true,
          estimatedDuration: true,
          status: true,
          clientNotes: true,
          providerNotes: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          acceptedAt: true,
          completedAt: true,
          declineReason: true,
          cancellationReason: true,
          paidAt: true,
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      // Only the client declines (resolver), so the provider is told.
      this.notify(quotation, 'QUOTATION_DECLINED', quotation.providerId, {
        note: reason ?? '',
      });
      return {
        ...quotation,
        client: { id: quotation.clientId },
        provider: { id: quotation.providerId },
      };
    } catch (error) {
      this.logger.error('Error al rechazar la cotización:', error);
      throw new InternalServerError('Error al rechazar la cotización');
    }
  }

  async completeQuotation(id: number) {
    try {
      const quotation = await this.prisma.quotation.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          serviceId: true,
          clientId: true,
          providerId: true,
          title: true,
          description: true,
          estimatedPrice: true,
          finalPrice: true,
          estimatedDuration: true,
          status: true,
          clientNotes: true,
          providerNotes: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          acceptedAt: true,
          completedAt: true,
          declineReason: true,
          cancellationReason: true,
          paidAt: true,
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      // The provider marks the work done; the client is who hears about it.
      this.notify(quotation, 'QUOTATION_COMPLETED', quotation.clientId);
      void awardServicePoints(this.prisma, this.users, {
        serviceId: quotation.serviceId,
        clientId: quotation.clientId,
        providerId: quotation.providerId,
        reference: `quotation:${quotation.id}`,
      });
      return {
        ...quotation,
        client: { id: quotation.clientId },
        provider: { id: quotation.providerId },
      };
    } catch (error) {
      this.logger.error('Error al completar la cotización:', error);
      throw new InternalServerError('Error al completar la cotización');
    }
  }

  async cancelQuotation({
    id,
    reason,
    cancelledBy,
  }: {
    id: number;
    reason?: string;
    cancelledBy: string;
  }) {
    try {
      const quotation = await this.prisma.quotation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason || undefined,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          serviceId: true,
          clientId: true,
          providerId: true,
          title: true,
          description: true,
          estimatedPrice: true,
          finalPrice: true,
          estimatedDuration: true,
          status: true,
          clientNotes: true,
          providerNotes: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          acceptedAt: true,
          completedAt: true,
          declineReason: true,
          cancellationReason: true,
          paidAt: true,
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      // The side that did not cancel is the one to tell; when an operator
      // cancelled, both are.
      const recipients =
        cancelledBy === quotation.clientId
          ? [quotation.providerId]
          : cancelledBy === quotation.providerId
            ? [quotation.clientId]
            : [quotation.clientId, quotation.providerId];
      for (const recipient of recipients) {
        this.notify(quotation, 'QUOTATION_DECLINED', recipient, {
          note: reason ?? '',
        });
      }
      return {
        ...quotation,
        client: { id: quotation.clientId },
        provider: { id: quotation.providerId },
      };
    } catch (error) {
      this.logger.error('Error al cancelar la cotización:', error);
      throw new InternalServerError('Error al cancelar la cotización');
    }
  }

  // ─── Payments (SRV-3) ──────────────────────────────────────────────────────
  // Called by ekoru-transactions only, behind INTERNAL_SERVICE_SECRET.

  /** What to charge for a quotation, and whether it can be charged. */
  async getQuotationCharge(id: number) {
    const q = await this.prisma.quotation.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        clientId: true,
        providerId: true,
        estimatedPrice: true,
        finalPrice: true,
        paidAt: true,
        paidPaymentId: true,
      },
    });
    if (!q) throw new NotFoundError('Cotización no encontrada');
    return {
      id: q.id,
      title: q.title,
      status: q.status,
      clientId: q.clientId,
      providerId: q.providerId,
      amount: quotedPrice(q),
      currency: 'CLP',
      paid: q.paidAt != null,
      paidAt: q.paidAt,
      paidPaymentId: q.paidPaymentId,
    };
  }

  /**
   * Stamps a quotation paid. Idempotent for the same payment, so a retried
   * webhook is harmless; a second, different payment is refused so
   * ekoru-transactions refunds it instead of charging twice.
   */
  async markQuotationPaid({
    id,
    paymentId,
  }: {
    id: number;
    paymentId: number;
  }) {
    const charge = await this.getQuotationCharge(id);
    if (charge.paid) {
      if (charge.paidPaymentId === paymentId) return charge;
      throw new BadRequestError(
        `La cotización ${id} ya fue pagada con el pago ${charge.paidPaymentId}`,
      );
    }
    if (!['ACCEPTED', 'COMPLETED'].includes(charge.status)) {
      throw new BadRequestError(
        `La cotización ${id} está ${charge.status}; solo se paga una cotización aceptada`,
      );
    }
    // Conditional on "still unpaid", so two concurrent calls cannot both win.
    const { count } = await this.prisma.quotation.updateMany({
      where: { id, paidAt: null },
      data: { paidAt: new Date(), paidPaymentId: paymentId },
    });
    if (count === 0) return this.markQuotationPaid({ id, paymentId });
    return this.getQuotationCharge(id);
  }

  async deleteQuotation(id: number): Promise<boolean> {
    try {
      await this.prisma.quotation.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      this.logger.error('Error al eliminar la cotización:', error);
      return false;
    }
  }
}

/** The quotation fields `notify` reads — a subset of every mutation's select. */
interface QuotationForNotify {
  id: number;
  clientId: string;
  providerId: string;
  title: string;
  service?: { name: string } | null;
}
