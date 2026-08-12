import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { QuotationsService } from './quotations.service.js';
import { Quotation, QuotationConnection } from './entities/index.js';
import { AddQuotationInput, UpdateQuotationInput } from './dto/index.js';
import { QuotationStatus } from '../graphql/enums/index.js';
import { CurrentSeller } from '../common/decorators/index.js';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../common/exceptions/index.js';

@Resolver(() => Quotation)
export class QuotationsResolver {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Query(() => Quotation, { name: 'getQuotation', nullable: true })
  async getQuotation(@Args('id', { type: () => ID }) id: string) {
    return this.quotationsService.getQuotation(parseInt(id, 10));
  }

  @Query(() => QuotationConnection, { name: 'getQuotationsByClient' })
  async getQuotationsByClient(
    @Args('clientId', { type: () => ID }) clientId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
  ) {
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
  ) {
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
  ) {
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
  ) {
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
    return this.quotationsService.updateQuotation(input);
  }

  @Mutation(() => Quotation)
  async acceptQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
  ) {
    await this.assertClient(id, sellerId);
    return this.quotationsService.acceptQuotation(parseInt(id, 10));
  }

  @Mutation(() => Quotation)
  async declineQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
    @Args('reason', { type: () => String, nullable: true }) reason?: string,
  ) {
    await this.assertClient(id, sellerId);
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
    return this.quotationsService.completeQuotation(parseInt(id, 10));
  }

  @Mutation(() => Quotation)
  async cancelQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
    @Args('reason', { type: () => String, nullable: true }) reason?: string,
  ) {
    await this.loadForParticipant(id, sellerId);
    return this.quotationsService.cancelQuotation({
      id: parseInt(id, 10),
      reason,
    });
  }

  @Mutation(() => Boolean)
  async deleteQuotation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() sellerId: string,
  ) {
    await this.assertClient(id, sellerId);
    return this.quotationsService.deleteQuotation(parseInt(id, 10));
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
