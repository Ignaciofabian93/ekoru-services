import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  Context,
  Directive,
} from '@nestjs/graphql';
import { QuotationsService } from './quotations.service.js';
import {
  Quotation,
  QuotationCharge,
  QuotationConnection,
} from './entities/index.js';
import { AddQuotationInput, UpdateQuotationInput } from './dto/index.js';
import { QuotationStatus } from '../graphql/enums/index.js';
import { CurrentAdmin, CurrentSeller } from '../common/decorators/index.js';
import { assertInternal } from '../common/internal.js';
import {
  assertQuotationAcceptable,
  assertQuotationCancellable,
  assertQuotationCompletable,
  assertQuotationDeclinable,
  assertQuotationDeletable,
  quotationRole,
} from './quotation-rules.js';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../common/exceptions/index.js';

@Resolver(() => Quotation)
export class QuotationsResolver {
  constructor(private readonly quotationsService: QuotationsService) {}

  /** The quotation's client or provider, or a platform admin with MANAGE_ORDERS. */
  @Query(() => Quotation, { name: 'getQuotation', nullable: true })
  async getQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId?: string,
    @CurrentAdmin() adminId?: string,
  ) {
    if (!sellerId && !adminId) {
      throw new UnauthorizedError('Debes iniciar sesión');
    }
    const quotation = await this.quotationsService.getQuotation(
      parseInt(id, 10),
    );
    if (quotationRole(quotation, sellerId)) return quotation;
    if (await this.quotationsService.isOrdersAdmin(adminId)) return quotation;
    throw new ForbiddenError('No tienes acceso a esta cotización');
  }

  // The four lists below take an arbitrary client, provider, service or
  // status, so they are for the panel only (MANAGE_ORDERS). Clients use `my*`.

  @Query(() => QuotationConnection, { name: 'getQuotationsByClient' })
  async getQuotationsByClient(
    @Args('clientId', { type: () => ID }) clientId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @CurrentAdmin() adminId?: string,
  ) {
    await this.quotationsService.assertOrdersAdmin(adminId);
    return this.quotationsService.getQuotationsByClient({
      clientId,
      page,
      pageSize,
    });
  }

  @Query(() => QuotationConnection, { name: 'getQuotationsByProvider' })
  async getQuotationsByProvider(
    @Args('providerId', { type: () => ID }) providerId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @CurrentAdmin() adminId?: string,
  ) {
    await this.quotationsService.assertOrdersAdmin(adminId);
    return this.quotationsService.getQuotationsByProvider({
      providerId,
      page,
      pageSize,
    });
  }

  @Query(() => QuotationConnection, { name: 'getQuotationsByService' })
  async getQuotationsByService(
    @Args('serviceId', { type: () => ID }) serviceId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @CurrentAdmin() adminId?: string,
  ) {
    await this.quotationsService.assertOrdersAdmin(adminId);
    return this.quotationsService.getQuotationsByService({
      serviceId: parseInt(serviceId, 10),
      page,
      pageSize,
    });
  }

  @Query(() => QuotationConnection, { name: 'getQuotationsByStatus' })
  async getQuotationsByStatus(
    @Args('status', { type: () => QuotationStatus }) status: QuotationStatus,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
    @CurrentAdmin() adminId?: string,
  ) {
    await this.quotationsService.assertOrdersAdmin(adminId);
    return this.quotationsService.getQuotationsByStatus({
      status,
      page,
      pageSize,
    });
  }

  // ─── Session-scoped views ───────────────────────────────────────────────────
  // `getQuotationsByClient` / `…ByProvider` take an id as an argument and are
  // only safe for admin callers. These answer for whoever is signed in, and are
  // what the buyer inbox and the provider desk query.

  @Query(() => QuotationConnection, { name: 'myQuotations' })
  async myQuotations(
    @CurrentSeller() clientId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
  ) {
    this.assertSignedIn(clientId);
    return this.quotationsService.getQuotationsByClient({
      clientId,
      page,
      pageSize,
    });
  }

  @Query(() => QuotationConnection, { name: 'myProviderQuotations' })
  async myProviderQuotations(
    @CurrentSeller() providerId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
  ) {
    this.assertSignedIn(providerId);
    return this.quotationsService.getQuotationsByProvider({
      providerId,
      page,
      pageSize,
    });
  }

  /**
   * The client is taken from the session, never from the input: a request that
   * could name its own client would let anyone raise quotes in someone's name.
   */
  @Mutation(() => Quotation)
  async addQuotation(
    @Args('input') input: AddQuotationInput,
    @CurrentSeller() clientId: string,
  ) {
    this.assertSignedIn(clientId);
    return this.quotationsService.addQuotation({ ...input, clientId });
  }

  /** The provider's reply: price, terms, notes. Only they may write it. */
  @Mutation(() => Quotation)
  async updateQuotation(
    @Args('input') input: UpdateQuotationInput,
    @CurrentSeller() sellerId: string,
  ) {
    const quotation = await this.loadForParticipant(input.id, sellerId);
    if (quotation.providerId !== sellerId) {
      throw new ForbiddenError(
        'Solo el proveedor puede responder la cotización',
      );
    }
    return this.quotationsService.updateQuotation({
      input,
      current: quotation,
    });
  }

  @Mutation(() => Quotation)
  async acceptQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
  ) {
    const quotation = await this.assertClient(id, sellerId);
    assertQuotationAcceptable(quotation);
    return this.quotationsService.acceptQuotation(parseInt(id, 10));
  }

  @Mutation(() => Quotation)
  async declineQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
    @Args('reason', { type: () => String, nullable: true }) reason?: string,
  ) {
    const quotation = await this.assertClient(id, sellerId);
    assertQuotationDeclinable(quotation);
    return this.quotationsService.declineQuotation({
      id: parseInt(id, 10),
      reason,
    });
  }

  @Mutation(() => Quotation)
  async completeQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
  ) {
    const quotation = await this.loadForParticipant(id, sellerId);
    if (quotation.providerId !== sellerId) {
      throw new ForbiddenError(
        'Solo el proveedor puede completar la cotización',
      );
    }
    assertQuotationCompletable(quotation);
    return this.quotationsService.completeQuotation(parseInt(id, 10));
  }

  @Mutation(() => Quotation)
  async cancelQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
    @Args('reason', { type: () => String, nullable: true }) reason?: string,
    @CurrentAdmin() adminId?: string,
  ) {
    // An operator with MANAGE_ORDERS may cancel when the parties disagree
    // (ADM-5); both are told.
    if (!sellerId && adminId) {
      await this.quotationsService.assertOrdersAdmin(adminId);
      const quotation = await this.quotationsService.getQuotation(
        parseInt(id, 10),
      );
      assertQuotationCancellable(quotation);
      return this.quotationsService.cancelQuotation({
        id: parseInt(id, 10),
        reason,
        cancelledBy: 'ADMIN',
      });
    }
    const quotation = await this.loadForParticipant(id, sellerId);
    assertQuotationCancellable(quotation);
    return this.quotationsService.cancelQuotation({
      id: parseInt(id, 10),
      reason,
      cancelledBy: sellerId,
    });
  }

  @Mutation(() => Boolean)
  async deleteQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
  ) {
    const quotation = await this.assertClient(id, sellerId);
    assertQuotationDeletable(quotation);
    return this.quotationsService.deleteQuotation(parseInt(id, 10));
  }

  // ─── Internal: quotation payments (SRV-3) ────────────────────────────────
  // ekoru-transactions prices and settles a quotation payment through these.
  // They need the `x-internal-secret` header, which the gateway never sends.

  // Internal: hidden from the public supergraph (GW-2); sibling services call it on this subgraph directly.
  @Directive('@inaccessible')
  @Query(() => QuotationCharge, {
    name: 'quotationCharge',
    description:
      'Internal (ekoru-transactions): amount, parties and paid state of a quotation.',
  })
  async quotationCharge(
    @Args('id', { type: () => ID }) id: string,
    @Context() ctx: { internalSecret?: string },
  ) {
    assertInternal(ctx.internalSecret);
    return await this.quotationsService.getQuotationCharge(parseInt(id, 10));
  }

  // Internal: hidden from the public supergraph (GW-2); sibling services call it on this subgraph directly.
  @Directive('@inaccessible')
  @Mutation(() => QuotationCharge, {
    name: 'markQuotationPaid',
    description:
      'Internal (ekoru-transactions): stamps an accepted quotation paid. Idempotent per payment.',
  })
  async markQuotationPaid(
    @Args('id', { type: () => ID }) id: string,
    @Args('paymentId', { type: () => Int }) paymentId: number,
    @Context() ctx: { internalSecret?: string },
  ) {
    assertInternal(ctx.internalSecret);
    return await this.quotationsService.markQuotationPaid({
      id: parseInt(id, 10),
      paymentId,
    });
  }

  // ─── guards ────────────────────────────────────────────────────────────────

  private assertSignedIn(sellerId: string) {
    if (!sellerId) {
      throw new UnauthorizedError('Debes iniciar sesión');
    }
  }

  /** Loads the quotation and confirms the caller is its client or its provider. */
  private async loadForParticipant(id: string, sellerId: string) {
    this.assertSignedIn(sellerId);
    const quotation = await this.quotationsService.getQuotation(
      parseInt(id, 10),
    );
    if (!quotation) {
      throw new NotFoundError('Cotización no encontrada');
    }
    if (quotation.clientId !== sellerId && quotation.providerId !== sellerId) {
      throw new ForbiddenError('No tienes acceso a esta cotización');
    }
    return quotation;
  }

  /** Accepting, declining and deleting are the client's calls alone. */
  private async assertClient(id: string, sellerId: string) {
    const quotation = await this.loadForParticipant(id, sellerId);
    if (quotation.clientId !== sellerId) {
      throw new ForbiddenError(
        'Solo el cliente puede responder esta cotización',
      );
    }
    return quotation;
  }
}
