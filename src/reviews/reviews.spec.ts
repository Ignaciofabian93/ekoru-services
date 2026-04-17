import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestError,
  InternalServerError,
} from '../common/exceptions/index';
import { AddServiceReviewInput } from './dto/index';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrismaService = {
    serviceReview: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockReview = {
    id: 1,
    serviceId: 1,
    reviewerId: 'reviewer-123',
    rating: 5,
    comment: 'Excellent service!',
    createdAt: new Date('2025-12-23'),
  };

  const mockService = {
    id: 1,
    name: 'Test Service',
    description: 'Test Description',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getServiceReviews', () => {
    const mockReviews = [mockReview];

    it('should return paginated reviews for a service', async () => {
      mockPrismaService.serviceReview.count.mockResolvedValue(1);
      mockPrismaService.serviceReview.findMany.mockResolvedValue(mockReviews);

      const result = await service.getServiceReviews(1, 1, 10);

      expect(mockPrismaService.serviceReview.count).toHaveBeenCalledWith({
        where: { serviceId: 1 },
      });
      expect(mockPrismaService.serviceReview.findMany).toHaveBeenCalledWith({
        where: { serviceId: 1 },
        skip: 0,
        take: 10,
        select: {
          id: true,
          serviceId: true,
          reviewerId: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      });
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].reviewer).toEqual({ id: 'reviewer-123' });
      expect(result.pageInfo.totalCount).toBe(1);
    });

    it('should return empty reviews when none exist for service', async () => {
      mockPrismaService.serviceReview.count.mockResolvedValue(0);
      mockPrismaService.serviceReview.findMany.mockResolvedValue([]);

      const result = await service.getServiceReviews(999, 1, 10);

      expect(result.nodes).toHaveLength(0);
      expect(result.pageInfo.totalCount).toBe(0);
    });

    it('should handle custom pagination parameters', async () => {
      mockPrismaService.serviceReview.count.mockResolvedValue(20);
      mockPrismaService.serviceReview.findMany.mockResolvedValue(mockReviews);

      await service.getServiceReviews(1, 2, 5);

      expect(mockPrismaService.serviceReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceReview.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getServiceReviews(1, 1, 10)).rejects.toThrow(
        new InternalServerError('Error al obtener las reseñas del servicio'),
      );
    });
  });

  describe('getServiceReviewsByReviewer', () => {
    const mockReviews = [
      mockReview,
      {
        ...mockReview,
        id: 2,
        serviceId: 2,
        rating: 4,
        comment: 'Good service',
      },
    ];

    it('should return paginated reviews for a reviewer', async () => {
      mockPrismaService.serviceReview.count.mockResolvedValue(2);
      mockPrismaService.serviceReview.findMany.mockResolvedValue(mockReviews);

      const result = await service.getServiceReviewsByReviewer(
        'reviewer-123',
        1,
        10,
      );

      expect(mockPrismaService.serviceReview.count).toHaveBeenCalledWith({
        where: { reviewerId: 'reviewer-123' },
      });
      expect(mockPrismaService.serviceReview.findMany).toHaveBeenCalledWith({
        where: { reviewerId: 'reviewer-123' },
        skip: 0,
        take: 10,
        select: {
          id: true,
          serviceId: true,
          reviewerId: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      });
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].reviewer).toEqual({ id: 'reviewer-123' });
      expect(result.pageInfo.totalCount).toBe(2);
    });

    it('should return empty reviews when reviewer has no reviews', async () => {
      mockPrismaService.serviceReview.count.mockResolvedValue(0);
      mockPrismaService.serviceReview.findMany.mockResolvedValue([]);

      const result = await service.getServiceReviewsByReviewer(
        'new-reviewer',
        1,
        10,
      );

      expect(result.nodes).toHaveLength(0);
      expect(result.pageInfo.totalCount).toBe(0);
    });

    it('should handle custom pagination parameters', async () => {
      mockPrismaService.serviceReview.count.mockResolvedValue(15);
      mockPrismaService.serviceReview.findMany.mockResolvedValue(mockReviews);

      await service.getServiceReviewsByReviewer('reviewer-123', 3, 5);

      expect(mockPrismaService.serviceReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        }),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceReview.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getServiceReviewsByReviewer('reviewer-123', 1, 10),
      ).rejects.toThrow(
        new InternalServerError('Error al obtener las reseñas del revisor'),
      );
    });
  });

  describe('addServiceReview', () => {
    const input: AddServiceReviewInput = {
      serviceId: 1,
      reviewerId: 'reviewer-123',
      rating: 5,
      comment: 'Excellent service!',
    };

    it('should create a new review successfully', async () => {
      const createdReview = {
        ...mockReview,
        service: mockService,
      };

      mockPrismaService.serviceReview.findFirst.mockResolvedValue(null);
      mockPrismaService.serviceReview.create.mockResolvedValue(createdReview);

      const result = await service.addServiceReview(input);

      expect(mockPrismaService.serviceReview.findFirst).toHaveBeenCalledWith({
        where: {
          serviceId: input.serviceId,
          reviewerId: input.reviewerId,
        },
      });
      expect(mockPrismaService.serviceReview.create).toHaveBeenCalledWith({
        data: {
          serviceId: input.serviceId,
          reviewerId: input.reviewerId,
          rating: input.rating,
          comment: input.comment,
        },
        select: {
          id: true,
          serviceId: true,
          reviewerId: true,
          rating: true,
          comment: true,
          createdAt: true,
          service: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });
      expect(result).toEqual({
        ...createdReview,
        reviewer: { id: 'reviewer-123' },
      });
    });

    it('should throw BadRequestError when reviewer already reviewed the service', async () => {
      mockPrismaService.serviceReview.findFirst.mockResolvedValue(mockReview);

      await expect(service.addServiceReview(input)).rejects.toThrow(
        new BadRequestError('Ya has reseñado este servicio'),
      );

      expect(mockPrismaService.serviceReview.create).not.toHaveBeenCalled();
    });

    it('should create a review with minimum rating', async () => {
      const minRatingInput = { ...input, rating: 1 };
      const createdReview = {
        ...mockReview,
        rating: 1,
        service: mockService,
      };

      mockPrismaService.serviceReview.findFirst.mockResolvedValue(null);
      mockPrismaService.serviceReview.create.mockResolvedValue(createdReview);

      const result = await service.addServiceReview(minRatingInput);

      expect(result.rating).toBe(1);
    });

    it('should create a review with maximum rating', async () => {
      const maxRatingInput = { ...input, rating: 5 };
      const createdReview = {
        ...mockReview,
        rating: 5,
        service: mockService,
      };

      mockPrismaService.serviceReview.findFirst.mockResolvedValue(null);
      mockPrismaService.serviceReview.create.mockResolvedValue(createdReview);

      const result = await service.addServiceReview(maxRatingInput);

      expect(result.rating).toBe(5);
    });

    it('should create a review with empty comment', async () => {
      const emptyCommentInput = { ...input, comment: '' };
      const createdReview = {
        ...mockReview,
        comment: '',
        service: mockService,
      };

      mockPrismaService.serviceReview.findFirst.mockResolvedValue(null);
      mockPrismaService.serviceReview.create.mockResolvedValue(createdReview);

      const result = await service.addServiceReview(emptyCommentInput);

      expect(result.comment).toBe('');
    });

    it('should throw InternalServerError on database error during creation', async () => {
      mockPrismaService.serviceReview.findFirst.mockResolvedValue(null);
      mockPrismaService.serviceReview.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.addServiceReview(input)).rejects.toThrow(
        new InternalServerError('Error al crear la reseña del servicio'),
      );
    });

    it('should throw InternalServerError on database error during duplicate check', async () => {
      mockPrismaService.serviceReview.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.addServiceReview(input)).rejects.toThrow(
        new InternalServerError('Error al crear la reseña del servicio'),
      );
    });
  });

  describe('deleteServiceReview', () => {
    it('should delete a review successfully and return true', async () => {
      mockPrismaService.serviceReview.delete.mockResolvedValue(mockReview);

      const result = await service.deleteServiceReview(1);

      expect(mockPrismaService.serviceReview.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBe(true);
    });

    it('should return false on database error', async () => {
      mockPrismaService.serviceReview.delete.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.deleteServiceReview(1);

      expect(result).toBe(false);
    });

    it('should return false when review does not exist', async () => {
      mockPrismaService.serviceReview.delete.mockRejectedValue(
        new Error('Record not found'),
      );

      const result = await service.deleteServiceReview(999);

      expect(result).toBe(false);
    });
  });
});
