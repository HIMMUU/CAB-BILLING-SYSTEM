import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { AssignmentStatus, DriverStatus, VehicleStatus, BookingStatus } from '@prisma/client';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateAssignmentDto) {
    const userId = this.tenantContext.getUser()?.id;

    // 1. Fetch parent booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot assign resources to a completed or cancelled booking');
    }

    // 2. Fetch driver and verify status
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
    });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    if (driver.status === DriverStatus.INACTIVE) {
      throw new BadRequestException('Selected driver is currently INACTIVE');
    }

    // 3. Fetch vehicle and verify status
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    if (vehicle.status === VehicleStatus.INACTIVE || vehicle.status === VehicleStatus.MAINTENANCE) {
      throw new BadRequestException(`Selected vehicle is currently ${vehicle.status}`);
    }

    // 4. Overlap Check: Check if driver already has an ACTIVE assignment on the target booking's date
    const overlappingDriver = await this.prisma.assignment.findFirst({
      where: {
        driverId: dto.driverId,
        status: AssignmentStatus.ACTIVE,
        booking: {
          pickupDate: booking.pickupDate,
        },
      },
    });
    if (overlappingDriver) {
      throw new ConflictException('Driver is already assigned to another active trip on this date');
    }

    // 5. Overlap Check: Check if vehicle already has an ACTIVE assignment on the target booking's date
    const overlappingVehicle = await this.prisma.assignment.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        status: AssignmentStatus.ACTIVE,
        booking: {
          pickupDate: booking.pickupDate,
        },
      },
    });
    if (overlappingVehicle) {
      throw new ConflictException('Vehicle is already assigned to another active trip on this date');
    }

    // 6. Run assignment within transaction
    return this.prisma.$transaction(async (tx) => {
      // Create Assignment record
      const assignment = await tx.assignment.create({
        data: {
          bookingId: dto.bookingId,
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          assignedById: userId || null,
          status: AssignmentStatus.ACTIVE,
        } as any,
        include: {
          booking: {
            include: { customer: true },
          },
          driver: true,
          vehicle: true,
        },
      });

      // Update Booking status
      await tx.booking.update({
        where: { id: dto.bookingId },
        data: { status: BookingStatus.ASSIGNED },
      });

      // Update Driver status to ON_TRIP
      await tx.driver.update({
        where: { id: dto.driverId },
        data: { status: DriverStatus.ON_TRIP },
      });

      // Update Vehicle status to ON_TRIP
      await tx.vehicle.update({
        where: { id: dto.vehicleId },
        data: { status: VehicleStatus.ON_TRIP },
      });

      return assignment;
    });
  }

  async findAvailableResources(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const targetDate = booking.pickupDate;

    // 1. Get all drivers who DO NOT have active assignments on the targetDate and are ACTIVE
    const allDrivers = await this.prisma.driver.findMany({
      where: {
        status: { not: DriverStatus.INACTIVE },
      },
    });

    const activeAssignmentsOnDate = await this.prisma.assignment.findMany({
      where: {
        status: AssignmentStatus.ACTIVE,
        booking: {
          pickupDate: targetDate,
        },
      },
      select: {
        driverId: true,
        vehicleId: true,
      },
    });

    const busyDriverIds = new Set(activeAssignmentsOnDate.map((a) => a.driverId));
    const busyVehicleIds = new Set(activeAssignmentsOnDate.map((a) => a.vehicleId));

    const availableDrivers = allDrivers.filter((d) => !busyDriverIds.has(d.id));

    // 2. Get all vehicles who DO NOT have active assignments on the targetDate and are ACTIVE/not in maintenance
    const allVehicles = await this.prisma.vehicle.findMany({
      where: {
        status: { notIn: [VehicleStatus.INACTIVE, VehicleStatus.MAINTENANCE] },
      },
    });

    const availableVehicles = allVehicles.filter((v) => !busyVehicleIds.has(v.id));

    return {
      drivers: availableDrivers,
      vehicles: availableVehicles,
      booking,
    };
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: AssignmentStatus;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        {
          booking: {
            bookingNumber: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          driver: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          vehicle: {
            vehicleNumber: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.assignment.count({ where }),
      this.prisma.assignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: { customer: true },
          },
          driver: true,
          vehicle: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async updateStatus(id: string, dto: UpdateAssignmentStatusDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.status !== AssignmentStatus.ACTIVE) {
      throw new BadRequestException('Can only update status of ACTIVE assignments');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Assignment status
      const updatedAssignment = await tx.assignment.update({
        where: { id },
        data: { status: dto.status },
        include: {
          booking: {
            include: { customer: true },
          },
          driver: true,
          vehicle: true,
        },
      });

      // 2. Revert Driver and Vehicle status to AVAILABLE
      await tx.driver.update({
        where: { id: assignment.driverId },
        data: { status: DriverStatus.AVAILABLE },
      });

      await tx.vehicle.update({
        where: { id: assignment.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      // 3. Update Booking status depending on Assignment outcome
      let targetBookingStatus: BookingStatus = BookingStatus.PENDING; // Default for CANCELLED
      if (dto.status === AssignmentStatus.COMPLETED) {
        targetBookingStatus = BookingStatus.COMPLETED;
      }

      await tx.booking.update({
        where: { id: assignment.bookingId },
        data: { status: targetBookingStatus },
      });

      return updatedAssignment;
    });
  }
}
