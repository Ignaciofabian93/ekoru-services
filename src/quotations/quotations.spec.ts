import { Test, TestingModule } from "@nestjs/testing";
import { QuotationsService } from "./quotations.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundError, InternalServerError } from "../common/exceptions/index";
import { AddQuotationInput, UpdateQuotationInput } from "./dto/index";
import { QuotationStatus } from "../graphql/enums/index";

describe("QuotationsService", () => {
  let service: QuotationsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    quotation: {
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
    name: "Test Service",
    description: "Test Description",
    pricingType: "FIXED",
  };

  const mockQuotation = {
    id: 1,
    serviceId: 1,
    clientId: "client-123",
    providerId: "provider-456",
    title: "Test Quotation",
    description: "Test quotation description",
    estimatedPrice: 500,
    finalPrice: null,
    estimatedDuration: 120,
    status: "PENDING",
    clientNotes: "Client notes",
    providerNotes: null,
    attachments: ["file1.pdf"],
    createdAt: new Date("2025-12-20"),
    updatedAt: new Date("2025-12-23"),
    expiresAt: new Date("2025-12-30"),
    acceptedAt: null,
    completedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getQuotation", () => {
    it("should return a quotation with service details", async () => {
      const mockQuotationWithService = {
        ...mockQuotation,
        service: mockService,
      };

      mockPrismaService.quotation.findUnique.mockResolvedValue(
        mockQuotationWithService
      );

      const result = await service.getQuotation(1);

      expect(result).toEqual({
        ...mockQuotationWithService,
        client: { id: "client-123" },
        provider: { id: "provider-456" },
      });
      expect(mockPrismaService.quotation.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.objectContaining({
          id: true,
          serviceId: true,
          clientId: true,
          providerId: true,
          service: expect.any(Object),
        }),
      });
    });

    it("should throw NotFoundError when quotation is not found", async () => {
      mockPrismaService.quotation.findUnique.mockResolvedValue(null);

      await expect(service.getQuotation(999)).rejects.toThrow(
        new NotFoundError("Cotización no encontrada")
      );
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.getQuotation(1)).rejects.toThrow(
        new InternalServerError("Error al obtener la cotización")
      );
    });
  });

  describe("getQuotationsByClient", () => {
    const mockQuotations = [mockQuotation];

    it("should return paginated quotations for a client", async () => {
      mockPrismaService.quotation.count.mockResolvedValue(1);
      mockPrismaService.quotation.findMany.mockResolvedValue(mockQuotations);

      const result = await service.getQuotationsByClient("client-123", 1, 10);

      expect(mockPrismaService.quotation.count).toHaveBeenCalledWith({
        where: { clientId: "client-123" },
      });
      expect(mockPrismaService.quotation.findMany).toHaveBeenCalledWith({
        where: { clientId: "client-123" },
        skip: 0,
        take: 10,
      });
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].client).toEqual({ id: "client-123" });
      expect(result.nodes[0].provider).toEqual({ id: "provider-456" });
      expect(result.pageInfo.totalCount).toBe(1);
    });

    it("should return empty quotations when none exist for client", async () => {
      mockPrismaService.quotation.count.mockResolvedValue(0);
      mockPrismaService.quotation.findMany.mockResolvedValue([]);

      const result = await service.getQuotationsByClient("new-client", 1, 10);

      expect(result.nodes).toHaveLength(0);
      expect(result.pageInfo.totalCount).toBe(0);
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.count.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        service.getQuotationsByClient("client-123", 1, 10)
      ).rejects.toThrow(
        new InternalServerError("Error al obtener las cotizaciones del cliente")
      );
    });
  });

  describe("getQuotationsByProvider", () => {
    const mockQuotations = [mockQuotation];

    it("should return paginated quotations for a provider", async () => {
      mockPrismaService.quotation.count.mockResolvedValue(1);
      mockPrismaService.quotation.findMany.mockResolvedValue(mockQuotations);

      const result = await service.getQuotationsByProvider(
        "provider-456",
        1,
        10
      );

      expect(mockPrismaService.quotation.count).toHaveBeenCalledWith({
        where: { providerId: "provider-456" },
      });
      expect(mockPrismaService.quotation.findMany).toHaveBeenCalledWith({
        where: { providerId: "provider-456" },
        skip: 0,
        take: 10,
      });
      expect(result.nodes).toHaveLength(1);
    });

    it("should return empty quotations when none exist for provider", async () => {
      mockPrismaService.quotation.count.mockResolvedValue(0);
      mockPrismaService.quotation.findMany.mockResolvedValue([]);

      const result = await service.getQuotationsByProvider(
        "new-provider",
        1,
        10
      );

      expect(result.nodes).toHaveLength(0);
      expect(result.pageInfo.totalCount).toBe(0);
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.count.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        service.getQuotationsByProvider("provider-456", 1, 10)
      ).rejects.toThrow(
        new InternalServerError(
          "Error al obtener las cotizaciones del proveedor"
        )
      );
    });
  });

  describe("getQuotationsByService", () => {
    const mockQuotations = [mockQuotation];

    it("should return paginated quotations for a service", async () => {
      mockPrismaService.quotation.count.mockResolvedValue(1);
      mockPrismaService.quotation.findMany.mockResolvedValue(mockQuotations);

      const result = await service.getQuotationsByService(1, 1, 10);

      expect(mockPrismaService.quotation.count).toHaveBeenCalledWith({
        where: { serviceId: 1 },
      });
      expect(mockPrismaService.quotation.findMany).toHaveBeenCalledWith({
        where: { serviceId: 1 },
        skip: 0,
        take: 10,
      });
      expect(result.nodes).toHaveLength(1);
    });

    it("should handle custom pagination parameters", async () => {
      mockPrismaService.quotation.count.mockResolvedValue(20);
      mockPrismaService.quotation.findMany.mockResolvedValue(mockQuotations);

      await service.getQuotationsByService(1, 3, 5);

      expect(mockPrismaService.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        })
      );
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.count.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.getQuotationsByService(1, 1, 10)).rejects.toThrow(
        new InternalServerError(
          "Error al obtener las cotizaciones del servicio"
        )
      );
    });
  });

  describe("getQuotationsByStatus", () => {
    const mockQuotations = [mockQuotation];

    it("should return paginated quotations for PENDING status", async () => {
      mockPrismaService.quotation.count.mockResolvedValue(1);
      mockPrismaService.quotation.findMany.mockResolvedValue(mockQuotations);

      const result = await service.getQuotationsByStatus(
        QuotationStatus.PENDING,
        1,
        10
      );

      expect(mockPrismaService.quotation.count).toHaveBeenCalledWith({
        where: { status: QuotationStatus.PENDING },
      });
      expect(mockPrismaService.quotation.findMany).toHaveBeenCalledWith({
        where: { status: QuotationStatus.PENDING },
        skip: 0,
        take: 10,
      });
      expect(result.nodes).toHaveLength(1);
    });

    it("should return paginated quotations for ACCEPTED status", async () => {
      const acceptedQuotations = [
        { ...mockQuotation, status: "ACCEPTED", acceptedAt: new Date() },
      ];
      mockPrismaService.quotation.count.mockResolvedValue(1);
      mockPrismaService.quotation.findMany.mockResolvedValue(
        acceptedQuotations
      );

      await service.getQuotationsByStatus(QuotationStatus.ACCEPTED, 1, 10);

      expect(mockPrismaService.quotation.count).toHaveBeenCalledWith({
        where: { status: QuotationStatus.ACCEPTED },
      });
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.count.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        service.getQuotationsByStatus(QuotationStatus.PENDING, 1, 10)
      ).rejects.toThrow(
        new InternalServerError("Error al obtener las cotizaciones por estado")
      );
    });
  });

  describe("addQuotation", () => {
    const input: AddQuotationInput = {
      serviceId: 1,
      clientId: "client-123",
      providerId: "provider-456",
      title: "New Quotation",
      description: "New quotation description",
      estimatedPrice: 600,
      estimatedDuration: 150,
      clientNotes: "New client notes",
      attachments: ["file1.pdf", "file2.pdf"],
      expiresAt: new Date("2025-12-31"),
    };

    it("should create a new quotation successfully", async () => {
      const createdQuotation = {
        ...mockQuotation,
        ...input,
        id: 2,
        service: mockService,
      };

      mockPrismaService.quotation.create.mockResolvedValue(createdQuotation);

      const result = await service.addQuotation(input);

      expect(mockPrismaService.quotation.create).toHaveBeenCalledWith({
        data: {
          serviceId: input.serviceId,
          clientId: input.clientId,
          providerId: input.providerId,
          title: input.title,
          description: input.description,
          estimatedPrice: input.estimatedPrice,
          estimatedDuration: input.estimatedDuration,
          clientNotes: input.clientNotes,
          attachments: input.attachments,
          expiresAt: input.expiresAt,
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        ...createdQuotation,
        client: { id: "client-123" },
        provider: { id: "provider-456" },
      });
    });

    it("should create a quotation with default empty attachments", async () => {
      const inputWithoutAttachments = { ...input };
      delete inputWithoutAttachments.attachments;

      const createdQuotation = {
        ...mockQuotation,
        attachments: [],
        service: mockService,
      };

      mockPrismaService.quotation.create.mockResolvedValue(createdQuotation);

      await service.addQuotation(inputWithoutAttachments);

      expect(mockPrismaService.quotation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attachments: [],
          }),
        })
      );
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.create.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.addQuotation(input)).rejects.toThrow(
        new InternalServerError("Error al crear la cotización")
      );
    });
  });

  describe("updateQuotation", () => {
    const input: UpdateQuotationInput = {
      id: "1",
      estimatedPrice: 700,
      finalPrice: 650,
      status: QuotationStatus.ACCEPTED,
      providerNotes: "Updated provider notes",
    };

    it("should update a quotation successfully", async () => {
      const updatedQuotation = {
        ...mockQuotation,
        ...input,
        id: 1,
        service: mockService,
      };

      mockPrismaService.quotation.update.mockResolvedValue(updatedQuotation);

      const result = await service.updateQuotation(input);

      expect(mockPrismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          estimatedPrice: input.estimatedPrice,
          finalPrice: input.finalPrice,
          status: input.status,
          providerNotes: input.providerNotes,
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        ...updatedQuotation,
        client: { id: "client-123" },
        provider: { id: "provider-456" },
      });
    });

    it("should update only provided fields", async () => {
      const partialInput: UpdateQuotationInput = {
        id: "1",
        finalPrice: 550,
      };

      const updatedQuotation = {
        ...mockQuotation,
        finalPrice: 550,
        service: mockService,
      };

      mockPrismaService.quotation.update.mockResolvedValue(updatedQuotation);

      await service.updateQuotation(partialInput);

      const callData = mockPrismaService.quotation.update.mock.calls[0][0].data;
      expect(callData.finalPrice).toBe(550);
      expect(callData.estimatedPrice).toBeUndefined();
      expect(callData.status).toBeUndefined();
    });

    it("should handle zero values for prices", async () => {
      const zeroInput: UpdateQuotationInput = {
        id: "1",
        estimatedPrice: 0,
        finalPrice: 0,
      };

      const updatedQuotation = {
        ...mockQuotation,
        estimatedPrice: 0,
        finalPrice: 0,
        service: mockService,
      };

      mockPrismaService.quotation.update.mockResolvedValue(updatedQuotation);

      await service.updateQuotation(zeroInput);

      const callData = mockPrismaService.quotation.update.mock.calls[0][0].data;
      expect(callData.estimatedPrice).toBe(0);
      expect(callData.finalPrice).toBe(0);
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.update.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.updateQuotation(input)).rejects.toThrow(
        new InternalServerError("Error al actualizar la cotización")
      );
    });
  });

  describe("acceptQuotation", () => {
    it("should accept a quotation successfully", async () => {
      const acceptedQuotation = {
        ...mockQuotation,
        status: "ACCEPTED",
        acceptedAt: new Date(),
        service: mockService,
      };

      mockPrismaService.quotation.update.mockResolvedValue(acceptedQuotation);

      const result = await service.acceptQuotation(1);

      expect(mockPrismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: "ACCEPTED",
          acceptedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result.status).toBe("ACCEPTED");
      expect(result.acceptedAt).toBeDefined();
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.update.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.acceptQuotation(1)).rejects.toThrow(
        new InternalServerError("Error al aceptar la cotización")
      );
    });
  });

  describe("declineQuotation", () => {
    it("should decline a quotation with reason", async () => {
      const declinedQuotation = {
        ...mockQuotation,
        status: "DECLINED",
        providerNotes: "Not available",
        service: mockService,
      };

      mockPrismaService.quotation.update.mockResolvedValue(declinedQuotation);

      const result = await service.declineQuotation(1, "Not available");

      expect(mockPrismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: "DECLINED",
          providerNotes: "Not available",
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result.status).toBe("DECLINED");
      expect(result.providerNotes).toBe("Not available");
    });

    it("should decline a quotation without reason", async () => {
      const declinedQuotation = {
        ...mockQuotation,
        status: "DECLINED",
        service: mockService,
      };

      mockPrismaService.quotation.update.mockResolvedValue(declinedQuotation);

      await service.declineQuotation(1);

      expect(mockPrismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: "DECLINED",
          providerNotes: undefined,
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.update.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.declineQuotation(1, "reason")).rejects.toThrow(
        new InternalServerError("Error al rechazar la cotización")
      );
    });
  });

  describe("completeQuotation", () => {
    it("should complete a quotation successfully", async () => {
      const completedQuotation = {
        ...mockQuotation,
        status: "COMPLETED",
        completedAt: new Date(),
        service: mockService,
      };

      mockPrismaService.quotation.update.mockResolvedValue(completedQuotation);

      const result = await service.completeQuotation(1);

      expect(mockPrismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: "COMPLETED",
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result.status).toBe("COMPLETED");
      expect(result.completedAt).toBeDefined();
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.update.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.completeQuotation(1)).rejects.toThrow(
        new InternalServerError("Error al completar la cotización")
      );
    });
  });

  describe("cancelQuotation", () => {
    it("should cancel a quotation with reason", async () => {
      const cancelledQuotation = {
        ...mockQuotation,
        status: "CANCELLED",
        providerNotes: "Client request",
        service: mockService,
      };

      mockPrismaService.quotation.update.mockResolvedValue(cancelledQuotation);

      const result = await service.cancelQuotation(1, "Client request");

      expect(mockPrismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: "CANCELLED",
          providerNotes: "Client request",
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result.status).toBe("CANCELLED");
      expect(result.providerNotes).toBe("Client request");
    });

    it("should cancel a quotation without reason", async () => {
      const cancelledQuotation = {
        ...mockQuotation,
        status: "CANCELLED",
        service: mockService,
      };

      mockPrismaService.quotation.update.mockResolvedValue(cancelledQuotation);

      await service.cancelQuotation(1);

      expect(mockPrismaService.quotation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: "CANCELLED",
          providerNotes: undefined,
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
    });

    it("should throw InternalServerError on database error", async () => {
      mockPrismaService.quotation.update.mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.cancelQuotation(1, "reason")).rejects.toThrow(
        new InternalServerError("Error al cancelar la cotización")
      );
    });
  });

  describe("deleteQuotation", () => {
    it("should delete a quotation successfully and return true", async () => {
      mockPrismaService.quotation.delete.mockResolvedValue(mockQuotation);

      const result = await service.deleteQuotation(1);

      expect(mockPrismaService.quotation.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBe(true);
    });

    it("should return false on database error", async () => {
      mockPrismaService.quotation.delete.mockRejectedValue(
        new Error("Database error")
      );

      const result = await service.deleteQuotation(1);

      expect(result).toBe(false);
    });

    it("should return false when quotation does not exist", async () => {
      mockPrismaService.quotation.delete.mockRejectedValue(
        new Error("Record not found")
      );

      const result = await service.deleteQuotation(999);

      expect(result).toBe(false);
    });
  });
});
