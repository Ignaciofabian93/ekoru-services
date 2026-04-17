import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions/index';
import { AddServiceBookingInput, UpdateServiceBookingInput } from './dto/index';

describe('BookingsService', () => {
  let service: BookingsService;

  const mockPrismaService = {
    serviceBooking: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
  };

  const mockBooking = {
    id: 1,
    serviceId: 1,
    clientId: 'client-123',
    providerId: 'provider-456',
    scheduledDate: new Date('2025-12-25'),
    scheduledTimeSlot: '10:00-11:00',
    serviceLocation: { address: '123 Main St' },
    agreedPrice: 100,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    clientNotes: 'Test notes',
    providerNotes: null,
    cancellationReason: null,
    cancelledBy: null,
    completedAt: null,
    createdAt: new Date('2025-12-23'),
    updatedAt: new Date('2025-12-23'),
  };

  const mockService = {
    id: 1,
    isActive: true,
    title: 'Test Service',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getServiceBooking', () => {
    it('should return a booking with related data', async () => {
      const mockBookingWithRelations = {
        ...mockBooking,
        service: mockService,
        client: { id: 'client-123', name: 'John Doe' },
        provider: { id: 'provider-456', name: 'Jane Smith' },
      };

      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(
        mockBookingWithRelations,
      );

      const result = await service.getServiceBooking(1);

      expect(result).toEqual(mockBookingWithRelations);
      expect(mockPrismaService.serviceBooking.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          service: true,
          client: true,
          provider: true,
        },
      });
    });

    it('should throw NotFoundError when booking is not found', async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(service.getServiceBooking(999)).rejects.toThrow(
        new NotFoundError('Reserva no encontrada'),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceBooking.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getServiceBooking(1)).rejects.toThrow(
        new InternalServerError('Error al obtener la reserva'),
      );
    });
  });

  describe('getServiceBookings', () => {
    const mockBookings = [mockBooking];

    it('should return paginated bookings without status filter', async () => {
      mockPrismaService.serviceBooking.count.mockResolvedValue(1);
      mockPrismaService.serviceBooking.findMany.mockResolvedValue(mockBookings);

      const result = await service.getServiceBookings(1, 10);

      expect(mockPrismaService.serviceBooking.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(mockPrismaService.serviceBooking.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { scheduledDate: 'asc' },
      });
      expect(result.nodes).toHaveLength(1);
      expect(result.pageInfo.totalCount).toBe(1);
    });

    it('should return paginated bookings with status filter', async () => {
      mockPrismaService.serviceBooking.count.mockResolvedValue(1);
      mockPrismaService.serviceBooking.findMany.mockResolvedValue(mockBookings);

      await service.getServiceBookings(1, 10, 'PENDING');

      expect(mockPrismaService.serviceBooking.count).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
      });
      expect(mockPrismaService.serviceBooking.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        skip: 0,
        take: 10,
        orderBy: { scheduledDate: 'asc' },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceBooking.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getServiceBookings(1, 10)).rejects.toThrow(
        new InternalServerError('Error al obtener las reservas'),
      );
    });
  });

  describe('getServiceBookingsByClient', () => {
    const mockBookings = [mockBooking];

    it('should return paginated bookings for a client without status filter', async () => {
      mockPrismaService.serviceBooking.count.mockResolvedValue(1);
      mockPrismaService.serviceBooking.findMany.mockResolvedValue(mockBookings);

      const result = await service.getServiceBookingsByClient(
        'client-123',
        1,
        10,
      );

      expect(mockPrismaService.serviceBooking.count).toHaveBeenCalledWith({
        where: { clientId: 'client-123' },
      });
      expect(mockPrismaService.serviceBooking.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-123' },
        skip: 0,
        take: 10,
        orderBy: { scheduledDate: 'asc' },
      });
      expect(result.nodes).toHaveLength(1);
    });

    it('should return paginated bookings for a client with status filter', async () => {
      mockPrismaService.serviceBooking.count.mockResolvedValue(1);
      mockPrismaService.serviceBooking.findMany.mockResolvedValue(mockBookings);

      await service.getServiceBookingsByClient(
        'client-123',
        1,
        10,
        'CONFIRMED',
      );

      expect(mockPrismaService.serviceBooking.count).toHaveBeenCalledWith({
        where: { clientId: 'client-123', status: 'CONFIRMED' },
      });
      expect(mockPrismaService.serviceBooking.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-123', status: 'CONFIRMED' },
        skip: 0,
        take: 10,
        orderBy: { scheduledDate: 'asc' },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceBooking.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getServiceBookingsByClient('client-123', 1, 10),
      ).rejects.toThrow(
        new InternalServerError('Error al obtener las reservas del cliente'),
      );
    });
  });

  describe('getServiceBookingsByProvider', () => {
    const mockBookings = [mockBooking];

    it('should return paginated bookings for a provider without status filter', async () => {
      mockPrismaService.serviceBooking.count.mockResolvedValue(1);
      mockPrismaService.serviceBooking.findMany.mockResolvedValue(mockBookings);

      const result = await service.getServiceBookingsByProvider(
        'provider-456',
        1,
        10,
      );

      expect(mockPrismaService.serviceBooking.count).toHaveBeenCalledWith({
        where: { providerId: 'provider-456' },
      });
      expect(mockPrismaService.serviceBooking.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-456' },
        skip: 0,
        take: 10,
        orderBy: { scheduledDate: 'asc' },
      });
      expect(result.nodes).toHaveLength(1);
    });

    it('should return paginated bookings for a provider with status filter', async () => {
      mockPrismaService.serviceBooking.count.mockResolvedValue(1);
      mockPrismaService.serviceBooking.findMany.mockResolvedValue(mockBookings);

      await service.getServiceBookingsByProvider(
        'provider-456',
        1,
        10,
        'COMPLETED',
      );

      expect(mockPrismaService.serviceBooking.count).toHaveBeenCalledWith({
        where: { providerId: 'provider-456', status: 'COMPLETED' },
      });
      expect(mockPrismaService.serviceBooking.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-456', status: 'COMPLETED' },
        skip: 0,
        take: 10,
        orderBy: { scheduledDate: 'asc' },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceBooking.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getServiceBookingsByProvider('provider-456', 1, 10),
      ).rejects.toThrow(
        new InternalServerError('Error al obtener las reservas del proveedor'),
      );
    });
  });

  describe('getServiceBookingsByService', () => {
    const mockBookings = [mockBooking];

    it('should return paginated bookings for a service', async () => {
      mockPrismaService.serviceBooking.count.mockResolvedValue(1);
      mockPrismaService.serviceBooking.findMany.mockResolvedValue(mockBookings);

      const result = await service.getServiceBookingsByService(1, 1, 10);

      expect(mockPrismaService.serviceBooking.count).toHaveBeenCalledWith({
        where: { serviceId: 1 },
      });
      expect(mockPrismaService.serviceBooking.findMany).toHaveBeenCalledWith({
        where: { serviceId: 1 },
        skip: 0,
        take: 10,
        orderBy: { scheduledDate: 'asc' },
      });
      expect(result.nodes).toHaveLength(1);
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceBooking.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getServiceBookingsByService(1, 1, 10),
      ).rejects.toThrow(
        new InternalServerError('Error al obtener las reservas del servicio'),
      );
    });
  });

  describe('addServiceBooking', () => {
    const input: AddServiceBookingInput = {
      serviceId: 1,
      clientId: 'client-123',
      providerId: 'provider-456',
      scheduledDate: new Date('2025-12-25'),
      scheduledTimeSlot: '10:00-11:00',
      serviceLocation: { address: '123 Main St' },
      agreedPrice: 100,
      clientNotes: 'Test notes',
    };

    it('should create a new booking successfully', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.serviceBooking.create.mockResolvedValue(mockBooking);

      const result = await service.addServiceBooking(input);

      expect(mockPrismaService.service.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.serviceBooking.create).toHaveBeenCalledWith({
        data: {
          serviceId: input.serviceId,
          clientId: input.clientId,
          providerId: input.providerId,
          scheduledDate: input.scheduledDate,
          scheduledTimeSlot: input.scheduledTimeSlot,
          serviceLocation: input.serviceLocation,
          agreedPrice: input.agreedPrice,
          clientNotes: input.clientNotes,
        },
      });
      expect(result).toEqual(mockBooking);
    });

    it('should create a booking without optional serviceLocation', async () => {
      const inputWithoutLocation = { ...input };
      delete inputWithoutLocation.serviceLocation;

      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.serviceBooking.create.mockResolvedValue(mockBooking);

      await service.addServiceBooking(inputWithoutLocation);

      expect(mockPrismaService.serviceBooking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serviceLocation: {},
        }),
      });
    });

    it('should throw BadRequestError when service does not exist', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(null);

      await expect(service.addServiceBooking(input)).rejects.toThrow(
        new BadRequestError('Servicio no disponible'),
      );
    });

    it('should throw BadRequestError when service is not active', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue({
        ...mockService,
        isActive: false,
      });

      await expect(service.addServiceBooking(input)).rejects.toThrow(
        new BadRequestError('Servicio no disponible'),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.serviceBooking.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.addServiceBooking(input)).rejects.toThrow(
        new InternalServerError('Error al crear la reserva'),
      );
    });
  });

  describe('updateServiceBooking', () => {
    const input: UpdateServiceBookingInput = {
      id: '1',
      scheduledDate: new Date('2025-12-26'),
      scheduledTimeSlot: '14:00-15:00',
      agreedPrice: 120,
      status: 'CONFIRMED',
      providerNotes: 'Provider notes',
    };

    it('should update a booking successfully', async () => {
      const updatedBooking = { ...mockBooking, ...input, id: 1 };
      mockPrismaService.serviceBooking.update.mockResolvedValue(updatedBooking);

      const result = await service.updateServiceBooking(input);

      expect(mockPrismaService.serviceBooking.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          scheduledDate: input.scheduledDate,
          scheduledTimeSlot: input.scheduledTimeSlot,
          agreedPrice: input.agreedPrice,
          status: input.status,
          providerNotes: input.providerNotes,
          updatedAt: expect.any(Date),
        }),
      });
      expect(result).toEqual(updatedBooking);
    });

    it('should set completedAt when status is COMPLETED', async () => {
      const completedInput: UpdateServiceBookingInput = {
        id: '1',
        status: 'COMPLETED',
      };
      const completedBooking = {
        ...mockBooking,
        status: 'COMPLETED',
        completedAt: new Date(),
      };

      mockPrismaService.serviceBooking.update.mockResolvedValue(
        completedBooking,
      );

      await service.updateServiceBooking(completedInput);

      expect(mockPrismaService.serviceBooking.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should update only provided fields', async () => {
      const partialInput: UpdateServiceBookingInput = {
        id: '1',
        clientNotes: 'Updated notes',
      };

      mockPrismaService.serviceBooking.update.mockResolvedValue(mockBooking);

      await service.updateServiceBooking(partialInput);

      const callData =
        mockPrismaService.serviceBooking.update.mock.calls[0][0].data;
      expect(callData.clientNotes).toBe('Updated notes');
      expect(callData.scheduledDate).toBeUndefined();
      expect(callData.status).toBeUndefined();
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceBooking.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.updateServiceBooking(input)).rejects.toThrow(
        new InternalServerError('Error al actualizar la reserva'),
      );
    });
  });

  describe('cancelServiceBooking', () => {
    it('should cancel a booking successfully', async () => {
      const cancelledBooking = {
        ...mockBooking,
        status: 'CANCELLED',
        cancelledBy: 'client-123',
        cancellationReason: 'Changed plans',
      };

      mockPrismaService.serviceBooking.update.mockResolvedValue(
        cancelledBooking,
      );

      const result = await service.cancelServiceBooking(
        1,
        'client-123',
        'Changed plans',
      );

      expect(mockPrismaService.serviceBooking.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'CANCELLED',
          cancelledBy: 'client-123',
          cancellationReason: 'Changed plans',
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(cancelledBooking);
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceBooking.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.cancelServiceBooking(1, 'client-123', 'Changed plans'),
      ).rejects.toThrow(
        new InternalServerError('Error al cancelar la reserva'),
      );
    });
  });

  describe('completeServiceBooking', () => {
    it('should complete a booking successfully', async () => {
      const completedBooking = {
        ...mockBooking,
        status: 'COMPLETED',
        completedAt: new Date(),
      };

      mockPrismaService.serviceBooking.update.mockResolvedValue(
        completedBooking,
      );

      const result = await service.completeServiceBooking(1);

      expect(mockPrismaService.serviceBooking.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(completedBooking);
    });

    it('should throw InternalServerError on database error', async () => {
      mockPrismaService.serviceBooking.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.completeServiceBooking(1)).rejects.toThrow(
        new InternalServerError('Error al completar la reserva'),
      );
    });
  });
});
