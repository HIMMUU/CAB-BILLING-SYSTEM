import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloseTripDto } from './dto/close-trip.dto';
import { DutySlipStatus, BookingStatus, DriverStatus, VehicleStatus, TripType } from '@prisma/client';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateTripCharges(
    dutySlipId: string,
    endKm: number,
    overrideStartDateTime?: Date,
    overrideEndDateTime?: Date
  ) {
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

    // Resolve dates
    const startDateTime = overrideStartDateTime || slip.startDateTime;
    const endDateTime = overrideEndDateTime || slip.endDateTime;

    let calculatedHours = 0;
    let calculatedDays = 1;
    let extraHours = 0;

    if (startDateTime && endDateTime) {
      const diffMs = new Date(endDateTime).getTime() - new Date(startDateTime).getTime();
      calculatedHours = diffMs / (1000 * 60 * 60);

      const startD = new Date(startDateTime);
      startD.setHours(0, 0, 0, 0);
      const endD = new Date(endDateTime);
      endD.setHours(0, 0, 0, 0);
      const diffDaysMs = endD.getTime() - startD.getTime();
      calculatedDays = Math.max(1, Math.round(diffDaysMs / (1000 * 60 * 60 * 24)) + 1);
    }

    // 1. Find mapped VehicleCategory
    const category = await this.prisma.vehicleCategory.findFirst({
      where: {
        name: { equals: slip.vehicle.vehicleType, mode: 'insensitive' },
      },
    });

    // Determine client type mapping for defaults
    let mappedClientType = 'Individual';
    if (slip.booking.customer.type === 'CORPORATE') {
      const lowerName = (slip.booking.customer.companyName || '').toLowerCase();
      if (lowerName.includes('travel') || lowerName.includes('holiday') || lowerName.includes('resort') || lowerName.includes('tour')) {
        mappedClientType = 'Travel Company';
      } else {
        mappedClientType = 'Company';
      }
    }

    // 2. Resolve Rate Card: Customer-specific first, fallback to Tenant Default
    let rateCard: any = null;
    if (category) {
      rateCard = await this.prisma.rateCard.findFirst({
        where: {
          customerId: slip.booking.customerId,
          vehicleCategoryId: category.id,
          status: 'ACTIVE',
          effectiveFrom: { lte: new Date() },
        },
      });

      if (!rateCard) {
        rateCard = await this.prisma.rateCard.findFirst({
          where: {
            customerId: null,
            clientType: mappedClientType,
            vehicleCategoryId: category.id,
            status: 'ACTIVE',
            effectiveFrom: { lte: new Date() },
          },
        });
      }
    }

    // 3. Dynamic Rate Calculation based on Trip Type & Rate Card Fields
    let baseFare = 1500;
    let baseKm = 40;
    let extraKmRate = 12;
    let extraHourRate = 100;
    let driverAllowanceAmount = 250;
    let nightChargesAmount = 200;

    if (rateCard) {
      extraKmRate = Number(rateCard.extraKmRate);
      extraHourRate = Number(rateCard.extraHourRate);
      baseKm = Number(rateCard.includedKm) || 40;

      if (slip.booking.tripType === TripType.OUTSTATION) {
        const minKm = Number(rateCard.minKmPerDay) || 250;
        const ratePerKm = Number(rateCard.outstationRatePerKm) || 12;
        baseKm = calculatedDays * minKm;
        baseFare = baseKm * ratePerKm;
        extraKmRate = ratePerKm;
        driverAllowanceAmount = calculatedDays * (Number(rateCard.driverAllowance) || 250);
        nightChargesAmount = calculatedDays * (Number(rateCard.outstationNightCharge || rateCard.nightCharge) || 200);
      } else {
        // Local hourly rental, full day local, or airport transfer
        const thresholdHr = Number(rateCard.minHr) || 4;
        const thresholdKm = Number(rateCard.minKm) || 40;

        let isHalfDay = false;
        if (slip.booking.tripType === TripType.AIRPORT_TRANSFER) {
          isHalfDay = true;
        } else {
          if (calculatedHours <= thresholdHr && totalDistance <= thresholdKm) {
            isHalfDay = true;
          }
        }

        if (isHalfDay) {
          baseFare = Number(rateCard.halfDayRate) || 1000;
          baseKm = thresholdKm;
          const baseHr = thresholdHr;
          if (calculatedHours > baseHr) {
            extraHours = calculatedHours - baseHr;
          }
        } else {
          baseFare = Number(rateCard.fullDayRate) || 1800;
          baseKm = Number(rateCard.fullKm) || 80;
          const baseHr = Number(rateCard.fullHr) || 8;
          if (calculatedHours > baseHr) {
            extraHours = calculatedHours - baseHr;
          }
        }

        driverAllowanceAmount = Number(rateCard.driverAllowance) || 250;
        nightChargesAmount = Number(rateCard.nightCharge) || 200;
      }
    }

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
    const stateTax = Number(slip.stateTax);
    const mcd = Number(slip.mcd);
    const driverAllowance = slip.driverAllowance !== null && Number(slip.driverAllowance) > 0 ? Number(slip.driverAllowance) : driverAllowanceAmount;
    const nightCharges = slip.nightCharges !== null && Number(slip.nightCharges) > 0 ? Number(slip.nightCharges) : nightChargesAmount;
    const extraCharges = Number(slip.extraCharges);

    const totalAmount = baseFare + extraKmCharged + extraHoursCharged + toll + parking + stateTax + mcd + driverAllowance + nightCharges + extraCharges;

    return {
      baseFareCharged: baseFare,
      extraKmCharged,
      extraHoursCharged,
      toll,
      parking,
      stateTax,
      mcd,
      driverAllowance,
      nightCharges,
      extraCharges,
      totalDistance,
      totalAmount,
      totalHours: calculatedHours,
      totalDays: calculatedDays,
    };
  }

  async recalculateInvoice(invoiceId: string, tx: any) {
    // 1. Fetch invoice with customer and items
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: {
            trip: true,
          },
        },
      },
    });

    if (!invoice) return;

    // 2. Aggregate charges from all Trip records
    let baseFare = 0;
    let extraKm = 0;
    let toll = 0;
    let parking = 0;
    let stateTax = 0;
    let mcd = 0;
    let nightCharges = 0;
    let miscCharges = 0;

    for (const item of invoice.items) {
      const trip = item.trip;
      if (!trip) continue;
      baseFare += Number(trip.baseFareCharged || 0);
      extraKm += Number(trip.extraKmCharged || 0);
      toll += Number(trip.toll || 0);
      parking += Number(trip.parking || 0);
      stateTax += Number(trip.stateTaxCharged || 0);
      mcd += Number(trip.mcdCharged || 0);
      nightCharges += Number(trip.nightChargesCharged || 0);
      miscCharges +=
        Number(trip.extraHoursCharged || 0) +
        Number(trip.driverAllowance || 0) +
        Number(trip.miscChargesCharged || trip.extraCharges || 0);
    }

    const subtotal = baseFare + extraKm + toll + parking + stateTax + mcd + nightCharges + miscCharges;

    // 3. Calculate Taxes based on GST rates in the invoice
    const cgstRate = Number(invoice.cgstRate || 0);
    const sgstRate = Number(invoice.sgstRate || 0);
    const igstRate = Number(invoice.igstRate || 0);

    const cgstAmount = (subtotal * cgstRate) / 100;
    const sgstAmount = (subtotal * sgstRate) / 100;
    const igstAmount = (subtotal * igstRate) / 100;
    const totalTax = cgstAmount + sgstAmount + igstAmount;

    const isCorporate = invoice.customer.type === 'CORPORATE';
    const totalGstRate = cgstRate + sgstRate + igstRate;
    const isRcm = isCorporate && Math.abs(totalGstRate - 5) < 0.01;
    const totalAmount = isRcm ? subtotal : (subtotal + totalTax);

    // dueAmount = totalAmount - paidAmount
    const dueAmount = Math.max(0, totalAmount - Number(invoice.paidAmount || 0));

    // 4. Update the Invoice record
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        baseFare,
        extraKmCharges: extraKm,
        toll,
        parking,
        nightCharges,
        miscCharges,
        stateTax,
        mcd,
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax,
        totalAmount,
        dueAmount,
      },
    });
  }

  async closeTrip(dto: CloseTripDto) {
    // 1. Fetch the target duty slip
    const slip = await this.prisma.dutySlip.findUnique({
      where: { id: dto.dutySlipId },
      include: {
        booking: true,
      },
    });
    if (!slip) {
      throw new NotFoundException('Duty slip not found');
    }

    // Resolve overrides or defaults for dates
    const startDateTime = dto.startDateTime ? new Date(dto.startDateTime) : (slip.startDateTime ? new Date(slip.startDateTime) : undefined);
    const endDateTime = dto.endDateTime ? new Date(dto.endDateTime) : (slip.endDateTime ? new Date(slip.endDateTime) : undefined);

    // 2. Run charges calculation to establish defaults if not explicitly overridden in DTO
    const calculations = await this.calculateTripCharges(dto.dutySlipId, dto.endKm, startDateTime, endDateTime);

    const baseFareCharged = dto.baseFareCharged ?? calculations.baseFareCharged;
    const extraKmCharged = dto.extraKmCharged ?? calculations.extraKmCharged;
    const extraHoursCharged = dto.extraHoursCharged ?? calculations.extraHoursCharged;
    const toll = dto.toll ?? calculations.toll;
    const parking = dto.parking ?? calculations.parking;
    const stateTax = dto.stateTax ?? calculations.stateTax;
    const mcd = dto.mcd ?? calculations.mcd;
    const driverAllowance = dto.driverAllowance ?? calculations.driverAllowance;
    const nightChargesCharged = dto.nightCharges ?? calculations.nightCharges;
    const miscChargesCharged = dto.extraCharges ?? calculations.extraCharges;
    
    const totalAmount = dto.totalAmount ?? 
      (Number(baseFareCharged) + 
       Number(extraKmCharged) + 
       Number(extraHoursCharged) + 
       Number(toll) + 
       Number(parking) + 
       Number(stateTax) + 
       Number(mcd) + 
       Number(driverAllowance) + 
       Number(nightChargesCharged) + 
       Number(miscChargesCharged));

    const existingTrip = await this.prisma.trip.findUnique({
      where: { dutySlipId: dto.dutySlipId },
      include: {
        invoiceItems: true,
      },
    });

    // 4. Run database updates inside a safe prisma transaction
    return this.prisma.$transaction(async (tx) => {
      let trip;
      if (existingTrip) {
        // Update existing Trip record
        trip = await tx.trip.update({
          where: { id: existingTrip.id },
          data: {
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
            startDateTime,
            endDateTime,
            totalHours: calculations.totalHours,
            totalDays: calculations.totalDays,
            stateTaxCharged: stateTax,
            mcdCharged: mcd,
          } as any,
        });
      } else {
        // Create finalized Trip record
        trip = await tx.trip.create({
          data: {
            tenantId: slip.tenantId,
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
            startDateTime,
            endDateTime,
            totalHours: calculations.totalHours,
            totalDays: calculations.totalDays,
            stateTaxCharged: stateTax,
            mcdCharged: mcd,
          } as any,
        });
      }

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
          startDateTime,
          endDateTime,
          stateTax,
          mcd,
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

      // Recalculate any associated invoices
      if (existingTrip && existingTrip.invoiceItems.length > 0) {
        for (const item of existingTrip.invoiceItems) {
          await this.recalculateInvoice(item.invoiceId, tx);
        }
      }

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
