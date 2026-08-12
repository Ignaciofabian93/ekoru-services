import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { ReviewsService } from './reviews.service.js';
import { ServiceReview, ServiceReviewConnection } from './entities/index.js';
import { AddServiceReviewInput } from './dto/index.js';
import { CurrentSeller } from '../common/decorators/index.js';
import { UnauthorizedError } from '../common/exceptions/index.js';

@Resolver(() => ServiceReview)
export class ReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

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
