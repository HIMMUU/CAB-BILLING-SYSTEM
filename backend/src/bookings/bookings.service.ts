import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from '@prisma/client';

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

    // 3. Create the booking
    return this.prisma.booking.create({
      data: {
        bookingNumber,
        customerId: dto.customerId,
        pickupLocation: dto.pickupLocation,
        dropLocation: dto.dropLocation,
        pickupDate: new Date(dto.pickupDate),
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
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async update(id: string, dto: UpdateBookingDto) {
    // Check if booking exists
    await this.findOne(id);

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
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
      },
    });
  }

  async remove(id: string) {
    // Check if booking exists
    const booking = await this.findOne(id);

    // Note: Deletions are guarded by Prisma foreign key onDelete Restrict rules on DutySlip and Trip.
    // If there is any associated duty slip or trip, Prisma will throw a database error that we let float up.
    return this.prisma.booking.delete({
      where: { id },
    });
  }
}
