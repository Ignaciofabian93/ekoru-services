import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotFoundError,
  InternalServerError,
} from '../common/exceptions/index.js';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils/index.js';
import { AddQuotationInput, UpdateQuotationInput } from './dto/index.js';
import { QuotationStatus } from '../graphql/enums/index.js';
import { UsersClient, type NotificationType } from '../common/clients/index.js';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersClient,
    private readonly config: ConfigService,
  ) {}

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
        actionUrl: base ? `${base}/profile/quotations` : null,
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
    try {
      const quotation = await this.prisma.quotation.create({
        data: {
          serviceId: input.serviceId,
          clientId: input.clientId,
          providerId: input.providerId,
          title: input.title,
          description: input.description,
          estimatedPrice: input.estimatedPrice,
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

  async updateQuotation(input: UpdateQuotationInput) {
    try {
      const id = parseInt(input.id, 10);

      const quotation = await this.prisma.quotation.update({
        where: { id },
        data: {
          ...(input.estimatedPrice !== undefined && {
            estimatedPrice: input.estimatedPrice,
          }),
          ...(input.finalPrice !== undefined && {
            finalPrice: input.finalPrice,
          }),
          ...(input.estimatedDuration !== undefined && {
            estimatedDuration: input.estimatedDuration,
          }),
          ...(input.status && { status: input.status }),
          ...(input.clientNotes && { clientNotes: input.clientNotes }),
          ...(input.providerNotes && { providerNotes: input.providerNotes }),
          ...(input.attachments && { attachments: input.attachments }),
          ...(input.expiresAt && { expiresAt: input.expiresAt }),
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
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      // Provider-side pricing fields present means the provider answered,
      // so the client is the one who needs to hear about it. The resolver
      // carries no caller identity, so this is inferred from the payload.
      if (
        input.finalPrice !== undefined ||
        input.estimatedPrice !== undefined ||
        input.providerNotes !== undefined
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
          providerNotes: reason || undefined,
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
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      // Either party can decline and this layer has no caller identity, so
      // both are told the quotation is dead. Narrow this to the counterpart
      // once the resolver carries @CurrentSeller.
      this.notify(quotation, 'QUOTATION_DECLINED', quotation.clientId, {
        note: reason ?? '',
      });
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
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      // The provider marks the work done; the client is who hears about it.
      this.notify(quotation, 'QUOTATION_COMPLETED', quotation.clientId);
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

  async cancelQuotation({ id, reason }: { id: number; reason?: string }) {
    try {
      const quotation = await this.prisma.quotation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          providerNotes: reason || undefined,
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
          // Whole row: `Service` declares non-nullable scalars (images, tags…)
          // and a hand-picked subset makes any client selecting one of them
          // fail with "Cannot return null for non-nullable field".
          service: true,
        },
      });

      // Same reasoning as decline: no caller identity here.
      this.notify(quotation, 'QUOTATION_DECLINED', quotation.clientId, {
        note: reason ?? '',
      });
      this.notify(quotation, 'QUOTATION_DECLINED', quotation.providerId, {
        note: reason ?? '',
      });
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
