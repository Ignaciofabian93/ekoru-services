import { Test, TestingModule } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError, InternalServerError } from '../common/exceptions/index';
import { AddServiceInput, UpdateServiceInput } from './dto/index';
import { ServicePricing } from '../graphql/enums/index';

describe('ServicesService', () => {
  let service: ServicesService;

  const mockPrismaService = {
    service: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockService = {
    id: 1,
    name: 'Test Service',
    description: 'Test Description',
    sellerId: 'seller-123',
    subcategoryId: 1,
    pricingType: 'FIXED' as ServicePricing,
    basePrice: 100,
    priceRange: null,
    duration: 60,
    isActive: true,
    images: ['image1.jpg', 'image2.jpg'],
    tags: ['tag1', 'tag2'],
    createdAt: new Date('2025-12-20'),
    updatedAt: new Date('2025-12-23'),
  };

  const mockServiceCategory = {
    id: 1,
    subCategory: 'Test Subcategory',
    serviceCategoryId: 1,
    href: '/test-subcategory',
    serviceCategory: {
      id: 1,
      category: 'Test Category',
    },
  };

  const mockReviews = [
    {
      id: 1,
      rating: 5,
      comment: 'Great!',
      createdAt: new Date(),
      reviewerId: 'user1',
    },
    {
      id: 2,
      rating: 4,
      comment: 'Good',
      createdAt: new Date(),
      reviewerId: 'user2',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getService', () => {
    it('should return a service with average rating calculated', async () => {
      const mockServiceWithRelations = {
        ...mockService,
        serviceCategory: mockServiceCategory,
        serviceReview: mockReviews,
      };

      mockPrismaService.service.findUnique.mockResolvedValue(
        mockServiceWithRelations,
      );

      const result = await service.getService(1);

      expect(result).toEqual({
        ...mockServiceWithRelations,
        seller: { id: 'seller-123' },
        averageRating: 4.5,
        reviewCount: 2,
      });
      expect(mockPrismaService.service.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.objectContaining({
          id: true,
          name: true,
          description: true,
          serviceCategory: expect.any(Object),
          serviceReview: expect.any(Object),
        }),
      });
    });

    it('should return service with zero rating when no reviews exist', async () => {
      const mockServiceWithoutReviews = {
        ...mockService,
        serviceCategory: mockServiceCategory,
        serviceReview: [],
      };

      mockPrismaService.service.findUnique.mockResolvedValue(
        mockServiceWithoutReviews,
      );

      const result = await service.getService(1);

      expect(result.averageRating).toBe(0);
      expect(result.reviewCount).toBe(0);
    });

    it('should throw NotFoundError when service is not found', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(null);

      await expect(service.getService(999)).rejects.toThrow(
        new NotFoundError('Servicio no encontrado'),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getService(1)).rejects.toThrow(
        new InternalServerError('Error al obtener el servicio'),
      );
    });
  });

  describe('getServices', () => {
    const mockServices = [
      {
        ...mockService,
        _count: { serviceReview: 2 },
      },
    ];

    it('should return paginated services without filter', async () => {
      mockPrismaService.service.count.mockResolvedValue(1);
      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      const result = await service.getServices(1, 10);

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(mockPrismaService.service.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        select: expect.any(Object),
      });
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].reviewCount).toBe(2);
      expect(result.nodes[0].seller).toEqual({ id: 'seller-123' });
    });

    it('should return paginated active services only', async () => {
      mockPrismaService.service.count.mockResolvedValue(1);
      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      await service.getServices(1, 10, true);

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockPrismaService.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should return paginated inactive services only', async () => {
      mockPrismaService.service.count.mockResolvedValue(0);
      mockPrismaService.service.findMany.mockResolvedValue([]);

      await service.getServices(1, 10, false);

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { isActive: false },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getServices(1, 10)).rejects.toThrow(
        new InternalServerError('Error al obtener los servicios'),
      );
    });
  });

  describe('getServicesBySeller', () => {
    const mockServices = [
      {
        ...mockService,
        _count: { serviceReview: 2 },
      },
    ];

    it('should return paginated services for a seller', async () => {
      mockPrismaService.service.count.mockResolvedValue(1);
      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      const result = await service.getServicesBySeller('seller-123', 1, 10);

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
      });
      expect(mockPrismaService.service.findMany).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        skip: 0,
        take: 10,
        select: expect.any(Object),
      });
      expect(result.nodes).toHaveLength(1);
    });

    it('should return active services for a seller', async () => {
      mockPrismaService.service.count.mockResolvedValue(1);
      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      await service.getServicesBySeller('seller-123', 1, 10, true);

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123', isActive: true },
      });
      expect(mockPrismaService.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerId: 'seller-123', isActive: true },
        }),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getServicesBySeller('seller-123', 1, 10),
      ).rejects.toThrow(
        new InternalServerError('Error al obtener los servicios del vendedor'),
      );
    });
  });

  describe('getServicesBySubCategory', () => {
    const mockServices = [
      {
        ...mockService,
        _count: { serviceReview: 2 },
      },
    ];

    it('should return paginated services for a subcategory', async () => {
      mockPrismaService.service.count.mockResolvedValue(1);
      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      const result = await service.getServicesBySubCategory(1, 1, 10);

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { subcategoryId: 1 },
      });
      expect(mockPrismaService.service.findMany).toHaveBeenCalledWith({
        where: { subcategoryId: 1 },
        skip: 0,
        take: 10,
        select: expect.any(Object),
      });
      expect(result.nodes).toHaveLength(1);
    });

    it('should return active services for a subcategory', async () => {
      mockPrismaService.service.count.mockResolvedValue(1);
      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      await service.getServicesBySubCategory(1, 1, 10, true);

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { subcategoryId: 1, isActive: true },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getServicesBySubCategory(1, 1, 10)).rejects.toThrow(
        new InternalServerError(
          'Error al obtener los servicios por subcategoría',
        ),
      );
    });
  });

  describe('getServicesByPricingType', () => {
    const mockServices = [
      {
        ...mockService,
        _count: { serviceReview: 2 },
      },
    ];

    it('should return paginated services for a pricing type', async () => {
      mockPrismaService.service.count.mockResolvedValue(1);
      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      const result = await service.getServicesByPricingType(
        ServicePricing.FIXED,
        1,
        10,
      );

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { pricingType: ServicePricing.FIXED },
      });
      expect(mockPrismaService.service.findMany).toHaveBeenCalledWith({
        where: { pricingType: ServicePricing.FIXED },
        skip: 0,
        take: 10,
        select: expect.any(Object),
      });
      expect(result.nodes).toHaveLength(1);
    });

    it('should return active services for a pricing type', async () => {
      mockPrismaService.service.count.mockResolvedValue(1);
      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      await service.getServicesByPricingType(ServicePricing.FIXED, 1, 10, true);

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { pricingType: ServicePricing.FIXED, isActive: true },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getServicesByPricingType(ServicePricing.FIXED, 1, 10),
      ).rejects.toThrow(
        new InternalServerError(
          'Error al obtener los servicios por tipo de precio',
        ),
      );
    });
  });

  describe('addService', () => {
    const input: AddServiceInput = {
      name: 'New Service',
      description: 'New Description',
      sellerId: 'seller-123',
      subcategoryId: 1,
      pricingType: ServicePricing.FIXED,
      basePrice: 150,
      priceRange: undefined,
      duration: 90,
      images: ['image1.jpg'],
      tags: ['new', 'service'],
      isActive: true,
    };

    it('should create a new service successfully', async () => {
      const createdService = {
        ...mockService,
        ...input,
        id: 2,
        serviceCategory: mockServiceCategory,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.service.create.mockResolvedValue(createdService);

      const result = await service.addService(input);

      expect(mockPrismaService.service.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          subcategoryId: input.subcategoryId,
          pricingType: input.pricingType,
          basePrice: input.basePrice,
          priceRange: input.priceRange,
          duration: input.duration,
          images: input.images,
          tags: input.tags,
          sellerId: input.sellerId,
          isActive: input.isActive,
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        ...createdService,
        seller: { id: 'seller-123' },
        averageRating: 0,
        reviewCount: 0,
      });
    });

    it('should create a service with default empty tags when not provided', async () => {
      const inputWithoutTags = { ...input };
      delete inputWithoutTags.tags;

      const createdService = {
        ...mockService,
        tags: [],
        serviceCategory: mockServiceCategory,
      };

      mockPrismaService.service.create.mockResolvedValue(createdService);

      await service.addService(inputWithoutTags);

      expect(mockPrismaService.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: [],
          }),
        }),
      );
    });

    it('should create a service with isActive defaulting to true', async () => {
      const inputWithoutActive = { ...input };
      delete inputWithoutActive.isActive;

      const createdService = {
        ...mockService,
        isActive: true,
        serviceCategory: mockServiceCategory,
      };

      mockPrismaService.service.create.mockResolvedValue(createdService);

      await service.addService(inputWithoutActive);

      expect(mockPrismaService.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.addService(input)).rejects.toThrow(
        new InternalServerError('Error al crear el servicio'),
      );
    });
  });

  describe('updateService', () => {
    const input: UpdateServiceInput = {
      id: '1',
      name: 'Updated Service',
      description: 'Updated Description',
      basePrice: 200,
      isActive: false,
    };

    it('should update a service successfully', async () => {
      const updatedService = {
        ...mockService,
        ...input,
        id: 1,
        serviceCategory: mockServiceCategory,
        _count: { serviceReview: 3 },
      };

      mockPrismaService.service.update.mockResolvedValue(updatedService);

      const result = await service.updateService(input);

      expect(mockPrismaService.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: input.name,
          description: input.description,
          basePrice: input.basePrice,
          isActive: input.isActive,
        },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        ...updatedService,
        seller: { id: 'seller-123' },
        averageRating: 0,
        reviewCount: 3,
      });
    });

    it('should update only provided fields', async () => {
      const partialInput: UpdateServiceInput = {
        id: '1',
        name: 'Updated Name Only',
      };

      const updatedService = {
        ...mockService,
        name: 'Updated Name Only',
        serviceCategory: mockServiceCategory,
        _count: { serviceReview: 0 },
      };

      mockPrismaService.service.update.mockResolvedValue(updatedService);

      await service.updateService(partialInput);

      const callData = mockPrismaService.service.update.mock.calls[0][0].data;
      expect(callData.name).toBe('Updated Name Only');
      expect(callData.description).toBeUndefined();
      expect(callData.basePrice).toBeUndefined();
    });

    it('should handle basePrice of 0', async () => {
      const inputWithZeroPrice: UpdateServiceInput = {
        id: '1',
        basePrice: 0,
      };

      const updatedService = {
        ...mockService,
        basePrice: 0,
        serviceCategory: mockServiceCategory,
        _count: { serviceReview: 0 },
      };

      mockPrismaService.service.update.mockResolvedValue(updatedService);

      await service.updateService(inputWithZeroPrice);

      const callData = mockPrismaService.service.update.mock.calls[0][0].data;
      expect(callData.basePrice).toBe(0);
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.updateService(input)).rejects.toThrow(
        new InternalServerError('Error al actualizar el servicio'),
      );
    });
  });

  describe('deleteService', () => {
    it('should delete a service successfully', async () => {
      mockPrismaService.service.delete.mockResolvedValue(mockService);

      const result = await service.deleteService(1);

      expect(mockPrismaService.service.delete).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        ...mockService,
        seller: { id: 'seller-123' },
        averageRating: 0,
        reviewCount: 0,
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.delete.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.deleteService(1)).rejects.toThrow(
        new InternalServerError('Error al eliminar el servicio'),
      );
    });
  });

  describe('toggleServiceActive', () => {
    it('should toggle service from active to inactive', async () => {
      const activeService = { isActive: true };
      const toggledService = {
        ...mockService,
        isActive: false,
        serviceCategory: mockServiceCategory,
        _count: { serviceReview: 2 },
      };

      mockPrismaService.service.findUnique.mockResolvedValue(activeService);
      mockPrismaService.service.update.mockResolvedValue(toggledService);

      const result = await service.toggleServiceActive(1);

      expect(mockPrismaService.service.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { isActive: true },
      });
      expect(mockPrismaService.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(false);
    });

    it('should toggle service from inactive to active', async () => {
      const inactiveService = { isActive: false };
      const toggledService = {
        ...mockService,
        isActive: true,
        serviceCategory: mockServiceCategory,
        _count: { serviceReview: 2 },
      };

      mockPrismaService.service.findUnique.mockResolvedValue(inactiveService);
      mockPrismaService.service.update.mockResolvedValue(toggledService);

      const result = await service.toggleServiceActive(1);

      expect(mockPrismaService.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: true },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundError when service does not exist', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(null);

      await expect(service.toggleServiceActive(999)).rejects.toThrow(
        new NotFoundError('Servicio no encontrado'),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.toggleServiceActive(1)).rejects.toThrow(
        new InternalServerError('Error al cambiar el estado del servicio'),
      );
    });
  });
});
