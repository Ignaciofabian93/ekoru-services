import { Test, TestingModule } from "@nestjs/testing";
import { ServiceCatalogService } from "./catalog.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundError, InternalServerError } from "../common/exceptions/index";

describe("ServiceCatalogService", () => {
  let service: ServiceCatalogService;
  let prismaService: PrismaService;

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
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getServiceCatalog", () => {
    const mockCategories = [
      {
        id: 1,
        category: "Categoría 1",
        href: "/categoria-1",
        subcategories: [
          {
            id: 1,
            subCategory: "Subcategoría 1",
            serviceCategoryId: 1,
            href: "/subcategoria-1",
          },
        ],
      },
      {
        id: 2,
        category: "Categoría 2",
        href: "/categoria-2",
        subcategories: [],
      },
    ];

    it("should return service catalog with categories and subcategories", async () => {
      mockPrismaService.serviceCategory.findMany.mockResolvedValue(
        mockCategories
      );

      const result = await service.getServiceCatalog();

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.serviceCategory.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          category: true,
          href: true,
          subcategories: {
            select: {
              id: true,
              subCategory: true,
              serviceCategoryId: true,
              href: true,
            },
          },
        },
        orderBy: {
          category: "asc",
        },
      });
    });

    it("should throw NotFoundError when no categories are found", async () => {
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([]);

      await expect(service.getServiceCatalog()).rejects.toThrow(
        new NotFoundError("No se encontraron categorías de servicios")
      );
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.serviceCategory.findMany.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.getServiceCatalog()).rejects.toThrow(
        new InternalServerError("Error al obtener el catálogo de servicios")
      );
    });
  });

  describe("getServiceCategories", () => {
    const mockCategories = [
      {
        id: 1,
        category: "Categoría 1",
        href: "/categoria-1",
        subcategories: [
          {
            id: 1,
            subCategory: "Subcategoría 1",
            serviceCategoryId: 1,
            href: "/subcategoria-1",
          },
        ],
      },
    ];

    it("should return all service categories", async () => {
      mockPrismaService.serviceCategory.findMany.mockResolvedValue(
        mockCategories
      );

      const result = await service.getServiceCategories();

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.serviceCategory.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          category: true,
          href: true,
          subcategories: {
            select: {
              id: true,
              subCategory: true,
              serviceCategoryId: true,
              href: true,
            },
          },
        },
      });
    });

    it("should throw NotFoundError when no categories are found", async () => {
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([]);

      await expect(service.getServiceCategories()).rejects.toThrow(
        new NotFoundError("No se encontraron categorías de servicios")
      );
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.serviceCategory.findMany.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.getServiceCategories()).rejects.toThrow(
        new InternalServerError("Error al obtener las categorías de servicios")
      );
    });
  });

  describe("getServiceCategory", () => {
    const mockCategory = {
      id: 1,
      category: "Categoría 1",
      href: "/categoria-1",
      subcategories: [
        {
          id: 1,
          subCategory: "Subcategoría 1",
          serviceCategoryId: 1,
          href: "/subcategoria-1",
        },
      ],
    };

    it("should return a service category by id", async () => {
      mockPrismaService.serviceCategory.findUnique.mockResolvedValue(
        mockCategory
      );

      const result = await service.getServiceCategory(1);

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.serviceCategory.findUnique).toHaveBeenCalledWith(
        {
          where: { id: 1 },
          select: {
            id: true,
            category: true,
            href: true,
            subcategories: {
              select: {
                id: true,
                subCategory: true,
                serviceCategoryId: true,
                href: true,
              },
            },
          },
        }
      );
    });

    it("should throw NotFoundError when category is not found", async () => {
      mockPrismaService.serviceCategory.findUnique.mockResolvedValue(null);

      await expect(service.getServiceCategory(999)).rejects.toThrow(
        new NotFoundError("Categoría de servicio no encontrada")
      );
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.serviceCategory.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.getServiceCategory(1)).rejects.toThrow(
        new InternalServerError("Error al obtener la categoría de servicio")
      );
    });
  });

  describe("getServiceSubCategories", () => {
    const mockSubcategories = [
      {
        id: 1,
        subCategory: "Subcategoría 1",
        serviceCategoryId: 1,
        href: "/subcategoria-1",
        _count: {
          services: 5,
        },
      },
      {
        id: 2,
        subCategory: "Subcategoría 2",
        serviceCategoryId: 1,
        href: "/subcategoria-2",
        _count: {
          services: 3,
        },
      },
    ];

    it("should return paginated subcategories with default pagination", async () => {
      mockPrismaService.serviceSubCategory.count.mockResolvedValue(2);
      mockPrismaService.serviceSubCategory.findMany.mockResolvedValue(
        mockSubcategories
      );

      const result = await service.getServiceSubCategories(1);

      expect(mockPrismaService.serviceSubCategory.count).toHaveBeenCalledWith({
        where: { serviceCategoryId: 1 },
      });
      expect(
        mockPrismaService.serviceSubCategory.findMany
      ).toHaveBeenCalledWith({
        where: { serviceCategoryId: 1 },
        skip: 0,
        take: 10,
        select: {
          id: true,
          subCategory: true,
          serviceCategoryId: true,
          href: true,
          _count: {
            select: {
              services: true,
            },
          },
        },
      });
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].serviceCount).toBe(5);
      expect(result.nodes[1].serviceCount).toBe(3);
      expect(result.pageInfo.totalCount).toBe(2);
    });

    it("should return paginated subcategories with custom pagination", async () => {
      mockPrismaService.serviceSubCategory.count.mockResolvedValue(15);
      mockPrismaService.serviceSubCategory.findMany.mockResolvedValue(
        mockSubcategories
      );

      const result = await service.getServiceSubCategories(1, 2, 5);

      expect(
        mockPrismaService.serviceSubCategory.findMany
      ).toHaveBeenCalledWith({
        where: { serviceCategoryId: 1 },
        skip: 5,
        take: 5,
        select: {
          id: true,
          subCategory: true,
          serviceCategoryId: true,
          href: true,
          _count: {
            select: {
              services: true,
            },
          },
        },
      });
      expect(result.pageInfo.totalCount).toBe(15);
      expect(result.pageInfo.pageSize).toBe(5);
    });

    it("should return empty edges when no subcategories are found", async () => {
      mockPrismaService.serviceSubCategory.count.mockResolvedValue(0);
      mockPrismaService.serviceSubCategory.findMany.mockResolvedValue([]);

      const result = await service.getServiceSubCategories(999);

      expect(result.nodes).toHaveLength(0);
      expect(result.pageInfo.totalCount).toBe(0);
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.serviceSubCategory.count.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.getServiceSubCategories(1)).rejects.toThrow(
        new InternalServerError(
          "Error al obtener las subcategorías de servicio"
        )
      );
    });
  });

  describe("getServiceSubCategory", () => {
    const mockSubcategory = {
      id: 1,
      subCategory: "Subcategoría 1",
      serviceCategoryId: 1,
      href: "/subcategoria-1",
      serviceCategory: {
        id: 1,
        category: "Categoría 1",
      },
      _count: {
        services: 5,
      },
    };

    it("should return a subcategory by id with service count", async () => {
      mockPrismaService.serviceSubCategory.findUnique.mockResolvedValue(
        mockSubcategory
      );

      const result = await service.getServiceSubCategory(1);

      expect(result).toEqual({
        ...mockSubcategory,
        serviceCount: 5,
      });
      expect(
        mockPrismaService.serviceSubCategory.findUnique
      ).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          subCategory: true,
          serviceCategoryId: true,
          href: true,
          serviceCategory: {
            select: {
              id: true,
              category: true,
            },
          },
          _count: {
            select: {
              services: true,
            },
          },
        },
      });
    });

    it("should throw NotFoundError when subcategory is not found", async () => {
      mockPrismaService.serviceSubCategory.findUnique.mockResolvedValue(null);

      await expect(service.getServiceSubCategory(999)).rejects.toThrow(
        new NotFoundError("Subcategoría de servicio no encontrada")
      );
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.serviceSubCategory.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.getServiceSubCategory(1)).rejects.toThrow(
        new InternalServerError("Error al obtener la subcategoría de servicio")
      );
    });
  });
});
