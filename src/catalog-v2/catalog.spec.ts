import { Test, TestingModule } from '@nestjs/testing';
import { Language } from '@prisma/client';
import { ServiceCatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ServiceCatalogService', () => {
  let service: ServiceCatalogService;

  const mockPrismaService = {
    serviceCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    serviceSubCategory: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ServiceCatalogService>(ServiceCatalogService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getServiceCatalog', () => {
    const mockCategories = [
      {
        id: 1,
        translations: [
          {
            category: 'Categoría 1',
            slug: 'categoria-1',
            href: '/categoria-1',
          },
        ],
        subcategories: [
          {
            id: 1,
            translations: [
              {
                subCategory: 'Subcategoría 1',
                slug: 'subcategoria-1',
                href: '/subcategoria-1',
              },
            ],
          },
        ],
      },
      {
        id: 2,
        translations: [
          {
            category: 'Categoría 2',
            slug: 'categoria-2',
            href: '/categoria-2',
          },
        ],
        subcategories: [],
      },
    ];

    it('should return service catalog with categories and subcategories', async () => {
      mockPrismaService.serviceCategory.findMany.mockResolvedValue(
        mockCategories,
      );

      const result = await service.getServiceCatalog();

      expect(result).toEqual([
        {
          id: 1,
          name: 'Categoría 1',
          slug: 'categoria-1',
          href: '/categoria-1',
          subCategoryItems: [
            {
              id: 1,
              name: 'Subcategoría 1',
              slug: 'subcategoria-1',
              href: '/subcategoria-1',
            },
          ],
        },
        {
          id: 2,
          name: 'Categoría 2',
          slug: 'categoria-2',
          href: '/categoria-2',
          subCategoryItems: [],
        },
      ]);
      expect(mockPrismaService.serviceCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          translations: {
            where: { language: Language.ES },
            select: { id: true, category: true, slug: true, href: true },
          },
          subcategories: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              translations: {
                where: { language: Language.ES },
                select: { id: true, subCategory: true, slug: true, href: true },
              },
            },
          },
        },
      });
    });

    it('should return an empty array when no categories are found', async () => {
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([]);

      await expect(service.getServiceCatalog()).resolves.toEqual([]);
    });

    it('should propagate the underlying error on database failure', async () => {
      mockPrismaService.serviceCategory.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getServiceCatalog()).rejects.toThrow(
        'Database error',
      );
    });
  });
});
