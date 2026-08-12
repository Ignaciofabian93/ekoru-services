import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from '../common/exceptions/index.js';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils/index.js';
import { AddServiceReviewInput } from './dto/index.js';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getServiceReviews({
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

      const count = await this.prisma.serviceReview.count({
        where: { serviceId },
      });
      const reviews = await this.prisma.serviceReview.findMany({
        where: { serviceId },
        skip,
        take,
        select: {
          id: true,
          serviceId: true,
          reviewerId: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      });

      const mappedReviews = reviews.map((review) => ({
        ...review,
        reviewer: { id: review.reviewerId },
      }));

      return createPaginatedResponse(mappedReviews, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener las reseñas del servicio:', error);
      throw new InternalServerError(
        'Error al obtener las reseñas del servicio',
      );
    }
  }

  async getServiceReviewsByReviewer({
    reviewerId,
    page,
    pageSize,
  }: {
    reviewerId: string;
    page: number;
    pageSize: number;
  }) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const count = await this.prisma.serviceReview.count({
        where: { reviewerId },
      });
      const reviews = await this.prisma.serviceReview.findMany({
        where: { reviewerId },
        skip,
        take,
        select: {
          id: true,
          serviceId: true,
          reviewerId: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      });

      const mappedReviews = reviews.map((review) => ({
        ...review,
        reviewer: { id: review.reviewerId },
      }));

      return createPaginatedResponse(mappedReviews, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error al obtener las reseñas del revisor:', error);
      throw new InternalServerError('Error al obtener las reseñas del revisor');
    }
  }

  async addServiceReview(
    input: AddServiceReviewInput & { reviewerId: string },
  ) {
    try {
      // Check if user already reviewed this service
      const existingReview = await this.prisma.serviceReview.findFirst({
        where: {
          serviceId: input.serviceId,
          reviewerId: input.reviewerId,
        },
      });

      if (existingReview) {
        throw new BadRequestError('Ya has reseñado este servicio');
      }

      // Only someone the provider actually served may rate them. Without this
      // the rating is open to anyone with the service id.
      const completedBooking = await this.prisma.serviceBooking.findFirst({
        where: {
          serviceId: input.serviceId,
          clientId: input.reviewerId,
          status: 'COMPLETED',
        },
        select: { id: true },
        orderBy: { id: 'desc' },
      });
      if (!completedBooking) {
        throw new ForbiddenError(
          'Solo puedes reseñar un servicio que hayas contratado y completado',
        );
      }

      const review = await this.prisma.serviceReview.create({
        data: {
          serviceId: input.serviceId,
          reviewerId: input.reviewerId,
          rating: input.rating,
          comment: input.comment,
          bookingId: completedBooking.id,
          isVerifiedPurchase: true,
        },
        select: {
          id: true,
          serviceId: true,
          reviewerId: true,
          rating: true,
          comment: true,
          createdAt: true,
          isVerifiedPurchase: true,
          service: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      await this.recomputeAverageRating(input.serviceId);

      return {
        ...review,
        reviewer: { id: review.reviewerId },
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof ForbiddenError) {
        throw error;
      }
      this.logger.error('Error al crear la reseña del servicio:', error);
      throw new InternalServerError('Error al crear la reseña del servicio');
    }
  }

  /** Authors delete their own reviews; nobody deletes anyone else's. */
  async deleteServiceReview({
    id,
    reviewerId,
  }: {
    id: number;
    reviewerId: string;
  }): Promise<boolean> {
    try {
      const review = await this.prisma.serviceReview.findUnique({
        where: { id },
        select: { reviewerId: true, serviceId: true },
      });
      if (!review) return false;
      if (review.reviewerId !== reviewerId) {
        throw new ForbiddenError('Solo puedes eliminar tus propias reseñas');
      }

      await this.prisma.serviceReview.delete({ where: { id } });
      await this.recomputeAverageRating(review.serviceId);

      return true;
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;
      this.logger.error('Error al eliminar la reseña del servicio:', error);
      return false;
    }
  }

  /**
   * `Service.averageRating` is a stored column while `reviewCount` is counted
   * at read time, so only the average has to be refreshed — otherwise the star
   * rating on the listing would never move no matter how many reviews land.
   */
  private async recomputeAverageRating(serviceId: number): Promise<void> {
    const { _avg } = await this.prisma.serviceReview.aggregate({
      where: { serviceId },
      _avg: { rating: true },
    });
    await this.prisma.service.update({
      where: { id: serviceId },
      data: { averageRating: _avg.rating ?? 0 },
    });
  }
}
