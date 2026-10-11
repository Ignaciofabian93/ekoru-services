import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { ReviewsService } from './reviews.service.js';
import { ServiceReview, ServiceReviewConnection } from './entities/index.js';
import { AddServiceReviewInput } from './dto/index.js';
import { CurrentAdmin, CurrentSeller } from '../common/decorators/index.js';
import { UnauthorizedError } from '../common/exceptions/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { assertAdminCan } from '../common/admin-access.js';

@Resolver(() => ServiceReview)
export class ReviewsResolver {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Moderation list (ADM-4): platform admins with MODERATE_CONTENT. */
  @Query(() => ServiceReviewConnection, { name: 'adminServiceReviews' })
  async adminServiceReviews(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
    @Args('serviceId', { type: () => Int, nullable: true }) serviceId?: number,
    @Args('providerId', { type: () => ID, nullable: true }) providerId?: string,
    @Args('reviewerId', { type: () => ID, nullable: true }) reviewerId?: string,
    @Args('rating', { type: () => Int, nullable: true }) rating?: number,
    @CurrentAdmin() adminId?: string,
  ) {
    await assertAdminCan(this.prisma, adminId, 'MODERATE_CONTENT');
    return this.reviewsService.getReviewsForModeration({
      page,
      pageSize,
      serviceId,
      providerId,
      reviewerId,
      rating,
    });
  }

  /** A moderator removes any review; the rating is recomputed (ADM-4). */
  @Mutation(() => Boolean, { name: 'deleteServiceReviewByAdmin' })
  async deleteServiceReviewByAdmin(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    await assertAdminCan(this.prisma, adminId, 'MODERATE_CONTENT');
    return this.reviewsService.deleteReviewAsModerator(id);
  }

  @Query(() => ServiceReviewConnection, { name: 'getServiceReviews' })
  async getServiceReviews(
    @Args('serviceId', { type: () => ID }) serviceId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
  ) {
    return this.reviewsService.getServiceReviews({
      serviceId: parseInt(serviceId, 10),
      page,
      pageSize,
    });
  }

  @Query(() => ServiceReviewConnection, { name: 'getServiceReviewsByReviewer' })
  async getServiceReviewsByReviewer(
    @Args('reviewerId', { type: () => ID }) reviewerId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
  ) {
    return this.reviewsService.getServiceReviewsByReviewer({
      reviewerId,
      page,
      pageSize,
    });
  }

  /**
   * The reviewer is the session, never the input, and the service must have
   * been used: a review nobody had to earn is worth nothing to the next buyer.
   */
  @Mutation(() => ServiceReview)
  async addServiceReview(
    @Args('input') input: AddServiceReviewInput,
    @CurrentSeller() reviewerId: string,
  ) {
    if (!reviewerId) throw new UnauthorizedError('Debes iniciar sesión');
    return this.reviewsService.addServiceReview({ ...input, reviewerId });
  }

  @Mutation(() => Boolean)
  async deleteServiceReview(
    @Args('id', { type: () => ID }) id: string,
    @CurrentSeller() reviewerId: string,
  ) {
    if (!reviewerId) throw new UnauthorizedError('Debes iniciar sesión');
    return this.reviewsService.deleteServiceReview({
      id: parseInt(id, 10),
      reviewerId,
    });
  }
}
