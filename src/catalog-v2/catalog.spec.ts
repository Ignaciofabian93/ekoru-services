import { Test, TestingModule } from '@nestjs/testing';
import { Language } from '@prisma/client';
import { ServiceCatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError, InternalServerError } from '../common/exceptions/index';

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
        select: {
          id: true,
          translations: {
            where: { language: Language.ES },
            select: { category: true, slug: true, href: true },
            take: 1,
          },
          subcategories: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              translations: {
                where: { language: Language.ES },
                select: { subCategory: true, slug: true, href: true },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });
    });

    it('should throw NotFoundError when no categories are found', async () => {
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([]);

      await expect(service.getServiceCatalog()).rejects.toThrow(
        new NotFoundError('No se encontraron categorías de servicios'),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceCategory.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getServiceCatalog()).rejects.toThrow(
        new InternalServerError('Error al obtener el catálogo de servicios'),
      );
    });
  });
});
