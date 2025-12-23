import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from "../common/exceptions/index.js";
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from "../common/utils/index.js";
import {
  AddServiceBookingInput,
  UpdateServiceBookingInput,
} from "./dto/index.js";

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getServiceBooking(id: number) {
    try {
      const booking = await this.prisma.serviceBooking.findUnique({
        where: { id },
        include: {
          service: true,
          client: true,
          provider: true,
        },
      });

      if (!booking) {
        throw new NotFoundError("Reserva no encontrada");
      }

      return booking;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error("Error al obtener la reserva:", error);
      throw new InternalServerError("Error al obtener la reserva");
    }
  }

  async getServiceBookings(page: number, pageSize: number, status?: string) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = status ? { status } : {};
      const count = await this.prisma.serviceBooking.count({ where });
      const bookings = await this.prisma.serviceBooking.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledDate: "asc" },
      });

      return createPaginatedResponse(bookings, count, page, pageSize);
    } catch (error) {
      this.logger.error("Error al obtener las reservas:", error);
      throw new InternalServerError("Error al obtener las reservas");
    }
  }

  async getServiceBookingsByClient(
    clientId: string,
    page: number,
    pageSize: number,
    status?: string
  ) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = { clientId, ...(status && { status }) };
      const count = await this.prisma.serviceBooking.count({ where });
      const bookings = await this.prisma.serviceBooking.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledDate: "asc" },
      });

      return createPaginatedResponse(bookings, count, page, pageSize);
    } catch (error) {
      this.logger.error("Error al obtener las reservas del cliente:", error);
      throw new InternalServerError(
        "Error al obtener las reservas del cliente"
      );
    }
  }

  async getServiceBookingsByProvider(
    providerId: string,
    page: number,
    pageSize: number,
    status?: string
  ) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const where = { providerId, ...(status && { status }) };
      const count = await this.prisma.serviceBooking.count({ where });
      const bookings = await this.prisma.serviceBooking.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledDate: "asc" },
      });

      return createPaginatedResponse(bookings, count, page, pageSize);
    } catch (error) {
      this.logger.error("Error al obtener las reservas del proveedor:", error);
      throw new InternalServerError(
        "Error al obtener las reservas del proveedor"
      );
    }
  }

  async getServiceBookingsByService(
    serviceId: number,
    page: number,
    pageSize: number
  ) {
    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const count = await this.prisma.serviceBooking.count({
        where: { serviceId },
      });
      const bookings = await this.prisma.serviceBooking.findMany({
        where: { serviceId },
        skip,
        take,
        orderBy: { scheduledDate: "asc" },
      });

      return createPaginatedResponse(bookings, count, page, pageSize);
    } catch (error) {
      this.logger.error("Error al obtener las reservas del servicio:", error);
      throw new InternalServerError(
        "Error al obtener las reservas del servicio"
      );
    }
  }

  async addServiceBooking(input: AddServiceBookingInput) {
    try {
      // Verify service exists and is active
      const service = await this.prisma.service.findUnique({
        where: { id: input.serviceId },
      });

      if (!service || !service.isActive) {
        throw new BadRequestError("Servicio no disponible");
      }

      const booking = await this.prisma.serviceBooking.create({
        data: {
          serviceId: input.serviceId,
          clientId: input.clientId,
          providerId: input.providerId,
          scheduledDate: input.scheduledDate,
          scheduledTimeSlot: input.scheduledTimeSlot,
          serviceLocation: input.serviceLocation || {},
          agreedPrice: input.agreedPrice,
          clientNotes: input.clientNotes,
        },
      });

      return booking;
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      this.logger.error("Error al crear la reserva:", error);
      throw new InternalServerError("Error al crear la reserva");
    }
  }

  async updateServiceBooking(input: UpdateServiceBookingInput) {
    try {
      const id = parseInt(input.id, 10);

      const booking = await this.prisma.serviceBooking.update({
        where: { id },
        data: {
          ...(input.scheduledDate && { scheduledDate: input.scheduledDate }),
          ...(input.scheduledTimeSlot && {
            scheduledTimeSlot: input.scheduledTimeSlot,
          }),
          ...(input.serviceLocation && {
            serviceLocation: input.serviceLocation,
          }),
          ...(input.agreedPrice !== undefined && {
            agreedPrice: input.agreedPrice,
          }),
          ...(input.paymentStatus && { paymentStatus: input.paymentStatus }),
          ...(input.status && { status: input.status }),
          ...(input.clientNotes && { clientNotes: input.clientNotes }),
          ...(input.providerNotes && { providerNotes: input.providerNotes }),
          ...(input.cancellationReason && {
            cancellationReason: input.cancellationReason,
          }),
          ...(input.cancelledBy && { cancelledBy: input.cancelledBy }),
          ...(input.status === "COMPLETED" && { completedAt: new Date() }),
          updatedAt: new Date(),
        },
      });

      return booking;
    } catch (error) {
      this.logger.error("Error al actualizar la reserva:", error);
      throw new InternalServerError("Error al actualizar la reserva");
    }
  }

  async cancelServiceBooking(id: number, cancelledBy: string, reason: string) {
    try {
      const booking = await this.prisma.serviceBooking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledBy,
          cancellationReason: reason,
          updatedAt: new Date(),
        },
      });

      return booking;
    } catch (error) {
      this.logger.error("Error al cancelar la reserva:", error);
      throw new InternalServerError("Error al cancelar la reserva");
    }
  }

  async completeServiceBooking(id: number) {
    try {
      const booking = await this.prisma.serviceBooking.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return booking;
    } catch (error) {
      this.logger.error("Error al completar la reserva:", error);
      throw new InternalServerError("Error al completar la reserva");
    }
  }
}
