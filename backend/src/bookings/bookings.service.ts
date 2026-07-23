import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  BookingStatus,
  AssignmentStatus,
  DriverStatus,
  VehicleStatus,
  DutySlipStatus,
} from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookingDto) {
    // 1. Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // 2. Generate a unique booking number
    const count = await this.prisma.booking.count();
    let bookingNumber = '';
    let isUnique = false;
    let currentVal = count + 1;
    while (!isUnique) {
      bookingNumber = String(currentVal);
      const existing = await this.prisma.booking.findFirst({
        where: { bookingNumber },
      });
      if (!existing) {
        isUnique = true;
      } else {
        currentVal++;
      }
    }

    const pickupDateObj = new Date(dto.pickupDate);

    // If driverId and vehicleId provided, validate availability & assign
    if (dto.driverId && dto.vehicleId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: dto.driverId },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      if (driver.status === DriverStatus.INACTIVE) {
        throw new BadRequestException('Selected driver is INACTIVE');
      }

      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
      });
      if (!vehicle) throw new NotFoundException('Vehicle not found');
      if (
        vehicle.status === VehicleStatus.INACTIVE ||
        vehicle.status === VehicleStatus.MAINTENANCE
      ) {
        throw new BadRequestException(`Selected vehicle is ${vehicle.status}`);
      }

      return this.prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            tenantId: customer.tenantId,
            bookingNumber,
            customerId: dto.customerId,
            pickupLocation: dto.pickupLocation,
            dropLocation: dto.dropLocation,
            pickupDate: pickupDateObj,
            pickupTime: dto.pickupTime,
            tripType: dto.tripType,
            vehicleTypeRequired: dto.vehicleTypeRequired,
            status: BookingStatus.ASSIGNED,
            employeeId: dto.employeeId,
            guestName: dto.guestName,
            guestSalutation: dto.guestSalutation,
            bookingBy: dto.bookingBy,
            remarks: dto.remarks,
          } as any,
        });

        await tx.driver.update({
          where: { id: dto.driverId },
          data: { status: DriverStatus.ON_TRIP },
        });

        await tx.vehicle.update({
          where: { id: dto.vehicleId },
          data: { status: VehicleStatus.ON_TRIP },
        });

        await tx.assignment.create({
          data: {
            tenantId: customer.tenantId,
            bookingId: booking.id,
            vehicleId: dto.vehicleId,
            driverId: dto.driverId,
            status: AssignmentStatus.ACTIVE,
          } as any,
        });

        // Duty slip reporting time
        const repTimeDate = new Date(pickupDateObj);
        if (dto.pickupTime) {
          const parts = dto.pickupTime.split(':');
          if (parts.length >= 2) {
            const hh = parseInt(parts[0], 10);
            const mm = parseInt(parts[1], 10);
            if (!isNaN(hh) && !isNaN(mm)) repTimeDate.setHours(hh, mm, 0, 0);
          }
        }

        const countSlips = await tx.dutySlip.count();
        let dutySlipNumber = '';
        let isUniqueSlip = false;
        let currentDsVal = countSlips + 1;
        while (!isUniqueSlip) {
          dutySlipNumber = String(currentDsVal);
          const existing = await tx.dutySlip.findFirst({
            where: { dutySlipNumber },
          });
          if (!existing) {
            isUniqueSlip = true;
          } else {
            currentDsVal++;
          }
        }

        await tx.dutySlip.create({
          data: {
            tenantId: customer.tenantId,
            dutySlipNumber,
            bookingId: booking.id,
            driverId: dto.driverId,
            vehicleId: dto.vehicleId,
            reportingTime: repTimeDate,
            startKm: 0,
            status: DutySlipStatus.DRAFT,
            employeeId: dto.employeeId,
          } as any,
        });

        return tx.booking.findUnique({
          where: { id: booking.id },
          include: {
            customer: true,
            dutySlip: {
              select: { id: true, dutySlipNumber: true },
            },
            assignments: {
              where: { status: AssignmentStatus.ACTIVE },
              include: { driver: true, vehicle: true },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      });
    }

    // Standard booking creation without immediate assignment
    return this.prisma.booking.create({
      data: {
        bookingNumber,
        customerId: dto.customerId,
        pickupLocation: dto.pickupLocation,
        dropLocation: dto.dropLocation,
        pickupDate: pickupDateObj,
        pickupTime: dto.pickupTime,
        tripType: dto.tripType,
        vehicleTypeRequired: dto.vehicleTypeRequired,
        status: dto.status ?? BookingStatus.PENDING,
        employeeId: dto.employeeId,
        guestName: dto.guestName,
        guestSalutation: dto.guestSalutation,
        bookingBy: dto.bookingBy,
        remarks: dto.remarks,
      } as any,
      include: {
        customer: true,
        dutySlip: {
          select: { id: true, dutySlipNumber: true },
        },
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
          include: { driver: true, vehicle: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: BookingStatus;
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
        { bookingNumber: { contains: query.search, mode: 'insensitive' } },
        { pickupLocation: { contains: query.search, mode: 'insensitive' } },
        { dropLocation: { contains: query.search, mode: 'insensitive' } },
        {
          customer: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          dutySlip: {
            select: {
              id: true,
              dutySlipNumber: true,
            },
          },
          assignments: {
            where: { status: AssignmentStatus.ACTIVE },
            include: {
              driver: true,
              vehicle: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
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

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        dutySlip: {
          select: {
            id: true,
            dutySlipNumber: true,
          },
        },
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
          include: {
            driver: true,
            vehicle: true,
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async update(id: string, dto: UpdateBookingDto) {
    const booking = await this.findOne(id);

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    if (dto.driverId && dto.vehicleId) {
      // Validate driver & vehicle
      const driver = await this.prisma.driver.findUnique({
        where: { id: dto.driverId },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
      });
      if (!vehicle) throw new NotFoundException('Vehicle not found');

      return this.prisma.$transaction(async (tx) => {
        // Revert previous active assignment resources if any
        const existingAssignment = await tx.assignment.findFirst({
          where: { bookingId: id, status: AssignmentStatus.ACTIVE },
        });

        if (existingAssignment) {
          if (existingAssignment.driverId !== dto.driverId) {
            await tx.driver.update({
              where: { id: existingAssignment.driverId },
              data: { status: DriverStatus.AVAILABLE },
            });
          }
          if (existingAssignment.vehicleId !== dto.vehicleId) {
            await tx.vehicle.update({
              where: { id: existingAssignment.vehicleId },
              data: { status: VehicleStatus.AVAILABLE },
            });
          }
          await tx.assignment.delete({ where: { id: existingAssignment.id } });
        }

        await tx.driver.update({
          where: { id: dto.driverId },
          data: { status: DriverStatus.ON_TRIP },
        });

        await tx.vehicle.update({
          where: { id: dto.vehicleId },
          data: { status: VehicleStatus.ON_TRIP },
        });

        await tx.assignment.create({
          data: {
            tenantId: booking.tenantId,
            bookingId: id,
            vehicleId: dto.vehicleId,
            driverId: dto.driverId,
            status: AssignmentStatus.ACTIVE,
          } as any,
        });

        // Duty Slip update or create
        const pickupDateObj = dto.pickupDate
          ? new Date(dto.pickupDate)
          : booking.pickupDate;
        const pickupTimeStr = dto.pickupTime || booking.pickupTime;
        const repTimeDate = new Date(pickupDateObj);
        if (pickupTimeStr) {
          const parts = pickupTimeStr.split(':');
          if (parts.length >= 2) {
            const hh = parseInt(parts[0], 10);
            const mm = parseInt(parts[1], 10);
            if (!isNaN(hh) && !isNaN(mm)) repTimeDate.setHours(hh, mm, 0, 0);
          }
        }

        if (booking.dutySlip) {
          await tx.dutySlip.update({
            where: { id: booking.dutySlip.id },
            data: {
              driverId: dto.driverId,
              vehicleId: dto.vehicleId,
              reportingTime: repTimeDate,
            },
          });
        } else {
          const countSlips = await tx.dutySlip.count();
          let dutySlipNumber = String(countSlips + 1);
          await tx.dutySlip.create({
            data: {
              tenantId: booking.tenantId,
              dutySlipNumber,
              bookingId: id,
              driverId: dto.driverId,
              vehicleId: dto.vehicleId,
              reportingTime: repTimeDate,
              startKm: 0,
              status: DutySlipStatus.DRAFT,
              employeeId: dto.employeeId || booking.employeeId,
            } as any,
          });
        }

        return tx.booking.update({
          where: { id },
          data: {
            customerId: dto.customerId,
            pickupLocation: dto.pickupLocation,
            dropLocation: dto.dropLocation,
            pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : undefined,
            pickupTime: dto.pickupTime,
            tripType: dto.tripType,
            vehicleTypeRequired: dto.vehicleTypeRequired,
            status: BookingStatus.ASSIGNED,
            employeeId: dto.employeeId,
            guestName: dto.guestName,
            guestSalutation: dto.guestSalutation,
            bookingBy: dto.bookingBy,
            remarks: dto.remarks,
          },
          include: {
            customer: true,
            dutySlip: {
              select: { id: true, dutySlipNumber: true },
            },
            assignments: {
              where: { status: AssignmentStatus.ACTIVE },
              include: { driver: true, vehicle: true },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      });
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        pickupLocation: dto.pickupLocation,
        dropLocation: dto.dropLocation,
        pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : undefined,
        pickupTime: dto.pickupTime,
        tripType: dto.tripType,
        vehicleTypeRequired: dto.vehicleTypeRequired,
        status: dto.status,
        employeeId: dto.employeeId,
        guestName: dto.guestName,
        guestSalutation: dto.guestSalutation,
        bookingBy: dto.bookingBy,
        remarks: dto.remarks,
      },
      include: {
        customer: true,
        dutySlip: {
          select: { id: true, dutySlipNumber: true },
        },
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
          include: { driver: true, vehicle: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async remove(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        assignments: true,
        dutySlip: {
          include: {
            trip: {
              include: {
                invoiceItems: true,
              },
            },
          },
        },
        trip: {
          include: {
            invoiceItems: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const trip = booking.trip || booking.dutySlip?.trip;
    if (trip?.invoiceItems && trip.invoiceItems.length > 0) {
      throw new BadRequestException(
        'Cannot delete booking that is associated with an invoice.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete associated Trip if exists and unbilled
      if (trip) {
        await tx.trip.delete({
          where: { id: trip.id },
        });
      }

      // 2. Delete associated Duty Slip if exists
      if (booking.dutySlip) {
        await tx.dutySlip.delete({
          where: { id: booking.dutySlip.id },
        });
      }

      // 3. Collect assigned driver and vehicle IDs
      const driverIds = Array.from(
        new Set(booking.assignments.map((a) => a.driverId).filter(Boolean)),
      );
      const vehicleIds = Array.from(
        new Set(booking.assignments.map((a) => a.vehicleId).filter(Boolean)),
      );

      // 4. Delete Assignments
      await tx.assignment.deleteMany({
        where: { bookingId: id },
      });

      // 5. Revert Drivers and Vehicles status to AVAILABLE if no active assignments remain
      for (const dId of driverIds) {
        const activeCount = await tx.assignment.count({
          where: { driverId: dId, status: AssignmentStatus.ACTIVE },
        });
        if (activeCount === 0) {
          await tx.driver.update({
            where: { id: dId },
            data: { status: DriverStatus.AVAILABLE },
          });
        }
      }

      for (const vId of vehicleIds) {
        const activeCount = await tx.assignment.count({
          where: { vehicleId: vId, status: AssignmentStatus.ACTIVE },
        });
        if (activeCount === 0) {
          await tx.vehicle.update({
            where: { id: vId },
            data: { status: VehicleStatus.AVAILABLE },
          });
        }
      }

      // 6. Delete Booking
      return tx.booking.delete({
        where: { id },
      });
    });
  }
}
