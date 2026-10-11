import { Test, TestingModule } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { resetHiddenProviderCache } from '../common/seller-visibility';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundError,
  InternalServerError,
  UnauthorizedError,
  ForbiddenError,
} from '../common/exceptions/index';
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
    // Seller/BusinessProfile (publisher check) and Admin (SEC-8) are read
    // with raw SQL, since ekoru-users owns them.
    $queryRaw: jest.fn(),
  };

  /** The rows `$queryRaw` returns for the publisher and admin checks. */
  const approvedServicesBusiness = [
    { isActive: true, approvalStatus: 'APPROVED', businessType: 'SERVICES' },
  ];
  const productsAdmin = [
    {
      adminType: 'PLATFORM',
      role: 'MODERATOR',
      permissions: ['MANAGE_PRODUCTS'],
      isActive: true,
      sellerId: null,
    },
  ];

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
    availabilitySchedule: { mon: '09:00-17:00' },
    isCurrentlyAvailable: true,
    maxConcurrentBookings: 2,
    advanceBookingDays: 30,
    serviceRadius: 10,
    serviceLocations: [{ address: 'Main St', lat: 1, lng: 2 }],
    isRemoteService: false,
  };

  // `serviceCategory` is no longer flattened by ServicesService — it is filled
  // in by ServicesResolver.serviceCategory (a DataLoader-backed field resolver),
  // so these methods neither select nor return it.

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

  /** Providers the hidden-provider lookup returns (banned or unapproved). */
  let hiddenProviders: { sellerId: string }[] = [];

  beforeEach(async () => {
    hiddenProviders = [];
    resetHiddenProviderCache();
    // Tests that check publishers or admins replace this with mockResolvedValue.
    mockPrismaService.$queryRaw.mockImplementation(
      (strings: TemplateStringsArray) =>
        Promise.resolve(
          strings.join('?').includes('FROM "Service" sv')
            ? hiddenProviders
            : [],
        ),
    );
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
      const mockServiceFromDb = {
        ...mockService,
        serviceReview: mockReviews,
      };

      mockPrismaService.service.findUnique.mockResolvedValue(mockServiceFromDb);

      const result = await service.getService(1);

      expect(result).toEqual({
        ...mockService,
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
          serviceReview: expect.any(Object),
        }),
      });
    });

    it('should return service with zero rating when no reviews exist', async () => {
      const mockServiceWithoutReviews = {
        ...mockService,
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

      const result = await service.getServices({ page: 1, pageSize: 10 });

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

      await service.getServices({ page: 1, pageSize: 10, isActive: true });

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

      await service.getServices({ page: 1, pageSize: 10, isActive: false });

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { isActive: false },
      });
    });

    it("should exclude the current seller's own services when logged in", async () => {
      mockPrismaService.service.count.mockResolvedValue(0);
      mockPrismaService.service.findMany.mockResolvedValue([]);

      await service.getServices({
        page: 1,
        pageSize: 10,
        excludeSellerId: 'seller-123',
      });

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { sellerId: { notIn: ['seller-123'] } },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getServices({ page: 1, pageSize: 10 }),
      ).rejects.toThrow(
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

      const result = await service.getServicesBySeller({
        sellerId: 'seller-123',
        page: 1,
        pageSize: 10,
      });

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

      await service.getServicesBySeller({
        sellerId: 'seller-123',
        page: 1,
        pageSize: 10,
        isActive: true,
      });

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
        service.getServicesBySeller({
          sellerId: 'seller-123',
          page: 1,
          pageSize: 10,
        }),
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

      const result = await service.getServicesBySubCategory({
        subcategoryId: 1,
        page: 1,
        pageSize: 10,
      });

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

      await service.getServicesBySubCategory({
        subcategoryId: 1,
        page: 1,
        pageSize: 10,
        isActive: true,
      });

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { subcategoryId: 1, isActive: true },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getServicesBySubCategory({
          subcategoryId: 1,
          page: 1,
          pageSize: 10,
        }),
      ).rejects.toThrow(
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

      const result = await service.getServicesByPricingType({
        pricingType: ServicePricing.FIXED,
        page: 1,
        pageSize: 10,
      });

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

      await service.getServicesByPricingType({
        pricingType: ServicePricing.FIXED,
        page: 1,
        pageSize: 10,
        isActive: true,
      });

      expect(mockPrismaService.service.count).toHaveBeenCalledWith({
        where: { pricingType: ServicePricing.FIXED, isActive: true },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getServicesByPricingType({
          pricingType: ServicePricing.FIXED,
          page: 1,
          pageSize: 10,
        }),
      ).rejects.toThrow(
        new InternalServerError(
          'Error al obtener los servicios por tipo de precio',
        ),
      );
    });
  });

  describe('hidden providers (banned, deactivated or unapproved)', () => {
    beforeEach(() => {
      hiddenProviders = [{ sellerId: 'banned-1' }];
      mockPrismaService.service.count.mockResolvedValue(0);
      mockPrismaService.service.findMany.mockResolvedValue([]);
    });

    it('leaves their services out of listings, with the viewer excluded too', async () => {
      await service.getServices({
        page: 1,
        pageSize: 10,
        excludeSellerId: 'me',
      });
      expect(mockPrismaService.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerId: { notIn: ['banned-1', 'me'] } },
        }),
      );
    });

    it('shows their provider page empty', async () => {
      const page = await service.getServicesBySeller({
        sellerId: 'banned-1',
        page: 1,
        pageSize: 10,
      });
      expect(page.nodes).toEqual([]);
      expect(mockPrismaService.service.findMany).not.toHaveBeenCalled();
    });

    it('treats their service page as not found', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue({
        ...mockService,
        sellerId: 'banned-1',
        serviceReview: [],
        _count: { serviceReview: 0 },
      });
      await expect(service.getService(1)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('addService', () => {
    // `sellerId` in the input is ignored: the publisher is the session.
    const input: AddServiceInput = {
      name: 'New Service',
      description: 'New Description',
      sellerId: 'attacker-999',
      subcategoryId: 1,
      pricingType: ServicePricing.FIXED,
      basePrice: 150,
      priceRange: undefined,
      duration: 90,
      images: ['image1.jpg'],
      tags: ['new', 'service'],
      isActive: true,
    };

    const publish = (
      i: AddServiceInput,
      sellerId: string | undefined = 'seller-123',
    ) => service.addService({ input: i, sellerId });

    beforeEach(() => {
      mockPrismaService.$queryRaw.mockResolvedValue(approvedServicesBusiness);
    });

    it('should create a new service successfully', async () => {
      const createdService = {
        ...mockService,
        ...input,
        sellerId: 'seller-123',
        id: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.service.create.mockResolvedValue(createdService);

      const result = await publish(input);

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
          sellerId: 'seller-123',
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
      };

      mockPrismaService.service.create.mockResolvedValue(createdService);

      await publish(inputWithoutTags);

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
      };

      mockPrismaService.service.create.mockResolvedValue(createdService);

      await publish(inputWithoutActive);

      expect(mockPrismaService.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should persist availability and location fields when provided', async () => {
      const inputWithAvailability: AddServiceInput = {
        ...input,
        availabilitySchedule: { mon: '09:00-17:00' },
        isCurrentlyAvailable: true,
        maxConcurrentBookings: 3,
        advanceBookingDays: 14,
        serviceRadius: 25,
        serviceLocations: [{ address: 'Office', lat: 1, lng: 2 }],
        isRemoteService: false,
      };

      mockPrismaService.service.create.mockResolvedValue({
        ...mockService,
        ...inputWithAvailability,
        id: 3,
      });

      await publish(inputWithAvailability);

      expect(mockPrismaService.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            availabilitySchedule: { mon: '09:00-17:00' },
            isCurrentlyAvailable: true,
            maxConcurrentBookings: 3,
            advanceBookingDays: 14,
            serviceRadius: 25,
            serviceLocations: [{ address: 'Office', lat: 1, lng: 2 }],
            isRemoteService: false,
          }),
        }),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(publish(input)).rejects.toThrow(
        new InternalServerError('Error al crear el servicio'),
      );
    });

    it('refuses an anonymous caller', async () => {
      await expect(
        service.addService({ input, sellerId: undefined }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      expect(mockPrismaService.service.create).not.toHaveBeenCalled();
    });

    it.each([
      [
        'a person account (no business profile)',
        [{ isActive: true, approvalStatus: null, businessType: null }],
      ],
      [
        'a business EKORU has not approved',
        [
          {
            isActive: true,
            approvalStatus: 'PENDING',
            businessType: 'SERVICES',
          },
        ],
      ],
      [
        'a retail-only business',
        [
          {
            isActive: true,
            approvalStatus: 'APPROVED',
            businessType: 'RETAIL',
          },
        ],
      ],
      [
        'a banned or deactivated account',
        [
          {
            isActive: false,
            approvalStatus: 'APPROVED',
            businessType: 'MIXED',
          },
        ],
      ],
      ['an unknown seller', []],
    ])('refuses %s', async (_label, rows) => {
      mockPrismaService.$queryRaw.mockResolvedValue(rows);

      await expect(publish(input)).rejects.toBeInstanceOf(ForbiddenError);
      expect(mockPrismaService.service.create).not.toHaveBeenCalled();
    });

    it('lets a MIXED business publish', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        { isActive: true, approvalStatus: 'APPROVED', businessType: 'MIXED' },
      ]);
      mockPrismaService.service.create.mockResolvedValue(mockService);

      await expect(publish(input)).resolves.toBeDefined();
    });
  });

  describe('service ownership (SRV-1)', () => {
    beforeEach(() => {
      mockPrismaService.service.findUnique.mockResolvedValue({
        sellerId: 'seller-123',
      });
      mockPrismaService.service.delete.mockResolvedValue(mockService);
    });

    it("refuses another seller's edit, delete or toggle", async () => {
      const other = { sellerId: 'seller-999' };
      await expect(
        service.updateService({ input: { id: '1', name: 'x' }, ...other }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(
        service.deleteService({ id: 1, ...other }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(
        service.toggleServiceActive({ id: 1, ...other }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(mockPrismaService.service.update).not.toHaveBeenCalled();
      expect(mockPrismaService.service.delete).not.toHaveBeenCalled();
    });

    it('refuses an anonymous caller', async () => {
      await expect(service.deleteService({ id: 1 })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it('refuses an admin without MANAGE_PRODUCTS, a business admin included', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          adminType: 'BUSINESS',
          role: 'SUPER_ADMIN',
          permissions: ['MANAGE_PRODUCTS'],
          isActive: true,
          sellerId: 'seller-999',
        },
      ]);

      await expect(
        service.deleteService({ id: 1, adminId: 'admin-1' }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(mockPrismaService.service.delete).not.toHaveBeenCalled();
    });

    it('lets a platform admin with MANAGE_PRODUCTS act on any service', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue(productsAdmin);

      await expect(
        service.deleteService({ id: 1, adminId: 'admin-1' }),
      ).resolves.toBeDefined();
      expect(mockPrismaService.service.delete).toHaveBeenCalled();
    });

    it('throws NotFoundError for an unknown service', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteService({ id: 404, sellerId: 'seller-123' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateService', () => {
    beforeEach(() => {
      mockPrismaService.service.findUnique.mockResolvedValue({
        sellerId: 'seller-123',
      });
    });
    const edit = (i: UpdateServiceInput) =>
      service.updateService({ input: i, sellerId: 'seller-123' });

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
        _count: { serviceReview: 3 },
      };

      mockPrismaService.service.update.mockResolvedValue(updatedService);

      const result = await edit(input);

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
        _count: { serviceReview: 0 },
      };

      mockPrismaService.service.update.mockResolvedValue(updatedService);

      await edit(partialInput);

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
        _count: { serviceReview: 0 },
      };

      mockPrismaService.service.update.mockResolvedValue(updatedService);

      await edit(inputWithZeroPrice);

      const callData = mockPrismaService.service.update.mock.calls[0][0].data;
      expect(callData.basePrice).toBe(0);
    });

    it('should update availability and location fields, keeping falsy values', async () => {
      const availabilityInput: UpdateServiceInput = {
        id: '1',
        availabilitySchedule: { tue: '10:00-16:00' },
        isCurrentlyAvailable: false,
        maxConcurrentBookings: 0,
        advanceBookingDays: 0,
        serviceRadius: 0,
        serviceLocations: [],
        isRemoteService: true,
      };

      mockPrismaService.service.update.mockResolvedValue({
        ...mockService,
        _count: { serviceReview: 0 },
      });

      await edit(availabilityInput);

      const callData = mockPrismaService.service.update.mock.calls[0][0].data;
      expect(callData).toEqual({
        availabilitySchedule: { tue: '10:00-16:00' },
        isCurrentlyAvailable: false,
        maxConcurrentBookings: 0,
        advanceBookingDays: 0,
        serviceRadius: 0,
        serviceLocations: [],
        isRemoteService: true,
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(edit(input)).rejects.toThrow(
        new InternalServerError('Error al actualizar el servicio'),
      );
    });
  });

  describe('deleteService', () => {
    beforeEach(() => {
      mockPrismaService.service.findUnique.mockResolvedValue({
        sellerId: 'seller-123',
      });
    });

    it('should delete a service successfully', async () => {
      mockPrismaService.service.delete.mockResolvedValue(mockService);

      const result = await service.deleteService({
        id: 1,
        sellerId: 'seller-123',
      });

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

      await expect(
        service.deleteService({ id: 1, sellerId: 'seller-123' }),
      ).rejects.toThrow(
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
        _count: { serviceReview: 2 },
      };

      mockPrismaService.service.findUnique
        .mockResolvedValueOnce({ sellerId: 'seller-123' })
        .mockResolvedValueOnce(activeService);
      mockPrismaService.service.update.mockResolvedValue(toggledService);

      const result = await service.toggleServiceActive({
        id: 1,
        sellerId: 'seller-123',
      });

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
        _count: { serviceReview: 2 },
      };

      mockPrismaService.service.findUnique
        .mockResolvedValueOnce({ sellerId: 'seller-123' })
        .mockResolvedValueOnce(inactiveService);
      mockPrismaService.service.update.mockResolvedValue(toggledService);

      const result = await service.toggleServiceActive({
        id: 1,
        sellerId: 'seller-123',
      });

      expect(mockPrismaService.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: true },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundError when service does not exist', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleServiceActive({ id: 999, sellerId: 'seller-123' }),
      ).rejects.toThrow(new NotFoundError('Servicio no encontrado'));
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.findUnique
        .mockResolvedValueOnce({ sellerId: 'seller-123' })
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.toggleServiceActive({ id: 1, sellerId: 'seller-123' }),
      ).rejects.toThrow(
        new InternalServerError('Error al cambiar el estado del servicio'),
      );
    });
  });
});
