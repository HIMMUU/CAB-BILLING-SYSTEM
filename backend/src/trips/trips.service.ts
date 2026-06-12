import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloseTripDto } from './dto/close-trip.dto';
import { DutySlipStatus, BookingStatus, DriverStatus, VehicleStatus, TripType } from '@prisma/client';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateTripCharges(dutySlipId: string, endKm: number, extraHours: number = 0) {
    const slip = await this.prisma.dutySlip.findUnique({
      where: { id: dutySlipId },
      include: {
        booking: { include: { customer: true } },
        vehicle: true,
      },
    });

    if (!slip) {
      throw new NotFoundException('Duty slip not found');
    }

    const startKm = Number(slip.startKm);
    const totalDistance = endKm - startKm;

    if (totalDistance < 0) {
      throw new BadRequestException('End KM cannot be less than Start KM');
    }

    // 1. Resolve Rate Card: Customer-specific first, fallback to Tenant Default
    let rateCard = await this.prisma.rateCard.findFirst({
      where: {
        customerId: slip.booking.customerId,
        vehicleType: slip.vehicle.vehicleType,
        tripType: slip.booking.tripType,
      },
    });

    if (!rateCard) {
      rateCard = await this.prisma.rateCard.findFirst({
        where: {
          customerId: null,
          vehicleType: slip.vehicle.vehicleType,
          tripType: slip.booking.tripType,
        },
      });
    }

    // 2. Safe Fallback Rate Rules if no rate card matches in database
    const baseFare = rateCard ? Number(rateCard.baseFare) : 1500;
    const baseKm = rateCard ? Number(rateCard.baseKm) : 40;
    const extraKmRate = rateCard ? Number(rateCard.extraKmRate) : 12;
    const extraHourRate = rateCard ? Number(rateCard.extraHourRate) : 100;

    // 3. Compute Extra KM Cost
    let extraKmCharged = 0;
    if (totalDistance > baseKm) {
      const extraKm = totalDistance - baseKm;
      extraKmCharged = extraKm * extraKmRate;
    }

    // 4. Compute Extra Hours Cost
    const extraHoursCharged = extraHours * extraHourRate;

    // 5. Incidental charges inherited from Duty Slip
    const toll = Number(slip.toll);
    const parking = Number(slip.parking);
    const driverAllowance = Number(slip.driverAllowance);
    const nightCharges = Number(slip.nightCharges);
    const extraCharges = Number(slip.extraCharges);

    const totalAmount = baseFare + extraKmCharged + extraHoursCharged + toll + parking + driverAllowance + nightCharges + extraCharges;

    return {
      baseFareCharged: baseFare,
      extraKmCharged,
      extraHoursCharged,
      toll,
      parking,
      driverAllowance,
      nightCharges,
      extraCharges,
      totalDistance,
      totalAmount,
    };
  }

  async closeTrip(dto: CloseTripDto) {
    // 1. Check if trip is already closed
    const existingTrip = await this.prisma.trip.findUnique({
      where: { dutySlipId: dto.dutySlipId },
    });
    if (existingTrip) {
      throw new ConflictException('A trip for this duty slip has already been closed');
    }

    // 2. Fetch the target duty slip
    const slip = await this.prisma.dutySlip.findUnique({
      where: { id: dto.dutySlipId },
      include: {
        booking: true,
      },
    });
    if (!slip) {
      throw new NotFoundException('Duty slip not found');
    }
    if (slip.status === DutySlipStatus.CLOSED) {
      throw new BadRequestException('Duty slip is already closed');
    }

    // 3. Run charges calculation to establish defaults if not explicitly overridden in DTO
    const calculations = await this.calculateTripCharges(dto.dutySlipId, dto.endKm);

    const baseFareCharged = dto.baseFareCharged ?? calculations.baseFareCharged;
    const extraKmCharged = dto.extraKmCharged ?? calculations.extraKmCharged;
    const extraHoursCharged = dto.extraHoursCharged ?? calculations.extraHoursCharged;
    const toll = dto.toll ?? calculations.toll;
    const parking = dto.parking ?? calculations.parking;
    const driverAllowance = dto.driverAllowance ?? calculations.driverAllowance;
    const nightChargesCharged = dto.nightCharges ?? calculations.nightCharges;
    const miscChargesCharged = dto.extraCharges ?? calculations.extraCharges;
    
    const totalAmount = dto.totalAmount ?? 
      (Number(baseFareCharged) + 
       Number(extraKmCharged) + 
       Number(extraHoursCharged) + 
       Number(toll) + 
       Number(parking) + 
       Number(driverAllowance) + 
       Number(nightChargesCharged) + 
       Number(miscChargesCharged));

    // 4. Run database updates inside a safe prisma transaction
    return this.prisma.$transaction(async (tx) => {
      // Create finalized Trip record
      const trip = await tx.trip.create({
        data: {
          dutySlipId: dto.dutySlipId,
          bookingId: slip.bookingId,
          startKm: slip.startKm,
          endKm: dto.endKm,
          totalKm: calculations.totalDistance,
          toll,
          parking,
          driverAllowance,
          extraCharges: miscChargesCharged,
          baseFareCharged,
          extraKmCharged,
          extraHoursCharged,
          nightChargesCharged,
          miscChargesCharged,
          totalAmount,
        } as any,
      });

      // Update Duty Slip status to CLOSED
      await tx.dutySlip.update({
        where: { id: dto.dutySlipId },
        data: {
          status: DutySlipStatus.CLOSED,
          endKm: dto.endKm,
          toll,
          parking,
          driverAllowance,
          nightCharges: nightChargesCharged,
          extraCharges: miscChargesCharged,
        },
      });

      // Update Booking status to COMPLETED
      await tx.booking.update({
        where: { id: slip.bookingId },
        data: { status: BookingStatus.COMPLETED },
      });

      // Release Driver to AVAILABLE status
      await tx.driver.update({
        where: { id: slip.driverId },
        data: { status: DriverStatus.AVAILABLE },
      });

      // Release Vehicle to AVAILABLE status
      await tx.vehicle.update({
        where: { id: slip.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      return trip;
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.trip.count(),
      this.prisma.trip.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: { include: { customer: true } },
          dutySlip: {
            include: { driver: true, vehicle: true },
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
}
