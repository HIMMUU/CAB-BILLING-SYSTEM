import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloseTripDto } from './dto/close-trip.dto';
import {
  DutySlipStatus,
  BookingStatus,
  DriverStatus,
  VehicleStatus,
  TripType,
  Prisma,
} from '@prisma/client';
import * as fs from 'fs';

type DutySlipWithRateContext = Prisma.DutySlipGetPayload<{
  include: {
    booking: { include: { customer: true } };
    vehicle: true;
  };
}>;

interface CustomRatePackage {
  id: string;
  includedKm: number;
  includedHours: number;
  rate: number;
}

const isJsonRecord = (
  value: Prisma.JsonValue | undefined,
): value is Prisma.JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getSelectedCustomPackage = (
  packageValues: Prisma.JsonValue,
  pricingSnapshot: Prisma.JsonValue,
): CustomRatePackage | null => {
  if (!Array.isArray(packageValues) || !isJsonRecord(pricingSnapshot)) {
    return null;
  }
  const packageId = pricingSnapshot.customPackageId;
  if (typeof packageId !== 'string') return null;

  const value = packageValues.find(
    (item) =>
      isJsonRecord(item) &&
      item.id === packageId &&
      typeof item.includedKm === 'number' &&
      typeof item.includedHours === 'number' &&
      typeof item.rate === 'number',
  );
  if (!isJsonRecord(value)) return null;
  const { id, includedKm, includedHours, rate } = value;
  if (
    typeof id !== 'string' ||
    typeof includedKm !== 'number' ||
    includedKm <= 0 ||
    typeof includedHours !== 'number' ||
    includedHours <= 0 ||
    typeof rate !== 'number' ||
    rate <= 0
  ) {
    return null;
  }
  return {
    id,
    includedKm,
    includedHours,
    rate,
  };
};

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async resolveRateCard(
    slip: DutySlipWithRateContext,
    effectiveAt: Date,
  ) {
    const booking = slip.booking;
    const customer = booking?.customer;
    if (!booking || !customer) {
      throw new BadRequestException(
        'A valid booking and customer are required before closing this duty slip.',
      );
    }

    const modelFirstWord = slip.vehicle?.model.split(' ')[0];
    const categoryNames = [
      booking.vehicleTypeRequired,
      slip.vehicle?.vehicleType,
      slip.carGroup,
      slip.vehicle?.model,
      modelFirstWord,
    ].filter((name): name is string => !!name?.trim());

    let category: { id: string } | null = null;
    for (const name of categoryNames) {
      category = await this.prisma.vehicleCategory.findFirst({
        where: { name: { equals: name.trim(), mode: 'insensitive' } },
        select: { id: true },
      });
      if (category) break;
    }

    if (!category) {
      throw new BadRequestException(
        'No vehicle category matches this booking. Configure a vehicle category and an applicable rate card before closing.',
      );
    }

    const mappedClientType =
      customer.type === 'INDIVIDUAL'
        ? 'Individual'
        : /travel|holiday|resort|tour/i.test(customer.companyName || '')
          ? 'Travel Company'
          : 'Company';
    const applicableRateCardWhere = {
      tenantId: slip.tenantId,
      vehicleCategoryId: category.id,
      status: 'ACTIVE',
      effectiveFrom: { lte: effectiveAt },
    };

    const latestCustomerRateCard = await this.prisma.rateCard.findFirst({
      where: { ...applicableRateCardWhere, customerId: customer.id },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
    const rateCard =
      latestCustomerRateCard ||
      (await this.prisma.rateCard.findFirst({
        where: {
          ...applicableRateCardWhere,
          customerId: null,
          clientType: mappedClientType,
        },
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      }));

    if (!rateCard) {
      throw new BadRequestException(
        'No active and effective rate card is configured for this booking and vehicle category. Select or create a matching rate card before closing.',
      );
    }
    if (slip.rateCardId && slip.rateCardId !== rateCard.id) {
      throw new BadRequestException(
        'The saved rate card is not the current applicable card for this booking. Reload the duty slip and select the latest matching card.',
      );
    }

    const hasValidBaseRate =
      booking.tripType === TripType.OUTSTATION
        ? Number(rateCard.minKmPerDay) > 0 &&
          Number(rateCard.outstationRatePerKm) > 0
        : ((Number(rateCard.fullDayRate) > 0 ||
            Number(rateCard.halfDayRate) > 0) &&
            (Number(rateCard.fullKm) ||
              Number(rateCard.minKm) ||
              Number(rateCard.includedKm)) > 0 &&
            (Number(rateCard.fullHr) || Number(rateCard.minHr)) > 0) ||
          (Array.isArray(rateCard.customPackages) &&
            rateCard.customPackages.some(
              (ratePackage) =>
                isJsonRecord(ratePackage) &&
                typeof ratePackage.includedKm === 'number' &&
                ratePackage.includedKm > 0 &&
                typeof ratePackage.includedHours === 'number' &&
                ratePackage.includedHours > 0 &&
                typeof ratePackage.rate === 'number' &&
                ratePackage.rate > 0,
            ));

    if (!hasValidBaseRate) {
      throw new BadRequestException(
        'The applicable rate card has no valid base fare for this trip type. Update the rate card before closing.',
      );
    }

    return { rateCard, vehicleCategoryId: category.id };
  }

  async calculateTripCharges(
    dutySlipId: string,
    endKm: number,
    overrideStartDateTime?: Date,
    overrideEndDateTime?: Date,
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
    if (!Number.isFinite(startKm) || startKm < 0) {
      throw new BadRequestException(
        'The duty slip has an invalid starting odometer reading.',
      );
    }
    if (!Number.isFinite(endKm) || endKm < 0) {
      throw new BadRequestException(
        'End KM must be a finite number greater than or equal to zero.',
      );
    }
    const totalDistance = endKm - startKm;

    if (totalDistance < 0) {
      throw new BadRequestException('End KM cannot be less than Start KM');
    }

    // Resolve dates
    const startDateTime = overrideStartDateTime || slip.startDateTime;
    const endDateTime = overrideEndDateTime || slip.endDateTime;
    const effectiveAt =
      endDateTime && !isNaN(new Date(endDateTime).getTime())
        ? new Date(endDateTime)
        : new Date();

    if (
      (startDateTime && Number.isNaN(new Date(startDateTime).getTime())) ||
      (endDateTime && Number.isNaN(new Date(endDateTime).getTime()))
    ) {
      throw new BadRequestException(
        'Trip start and end date-times must be valid dates.',
      );
    }

    if (
      startDateTime &&
      endDateTime &&
      new Date(endDateTime) < new Date(startDateTime)
    ) {
      throw new BadRequestException(
        'End Date & Time cannot be before Start Date & Time',
      );
    }

    let calculatedHours = 0;
    let calculatedDays = 1;
    let extraHours = 0;

    if (startDateTime && endDateTime) {
      const diffMs =
        new Date(endDateTime).getTime() - new Date(startDateTime).getTime();
      calculatedHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));

      const getIstDateString = (dt: Date | string) => {
        const d = new Date(dt);
        return isNaN(d.getTime())
          ? ''
          : d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      };
      const startStr = getIstDateString(startDateTime);
      const endStr = getIstDateString(endDateTime);
      const startD = new Date(startStr);
      const endD = new Date(endStr);
      const diffDaysMs = endD.getTime() - startD.getTime();
      calculatedDays = Math.max(
        1,
        Math.round(diffDaysMs / (1000 * 60 * 60 * 24)) + 1,
      );
    }

    const { rateCard, vehicleCategoryId } = await this.resolveRateCard(
      slip,
      effectiveAt,
    );
    const selectedCustomPackage = getSelectedCustomPackage(
      rateCard.customPackages,
      slip.pricingSnapshot,
    );
    if (
      slip.billingMode === 'C' &&
      Array.isArray(rateCard.customPackages) &&
      rateCard.customPackages.length > 0 &&
      !selectedCustomPackage
    ) {
      throw new BadRequestException(
        'Select a valid custom package from the current rate card before closing this trip.',
      );
    }

    // 3. Dynamic Rate Calculation based on Trip Type & Rate Card Fields
    let baseFare = 0;
    let baseKm = 0;
    let extraKmRate = Number(rateCard.extraKmRate);
    const extraHourRate = Number(rateCard.extraHourRate);
    let driverAllowanceAmount = Number(rateCard.driverAllowance);
    let nightChargesAmount = Number(rateCard.nightCharge);

    if (slip.booking.tripType === TripType.OUTSTATION) {
      const minKm = Number(rateCard.minKmPerDay);
      const ratePerKm = Number(rateCard.outstationRatePerKm);
      baseKm = calculatedDays * minKm;
      baseFare = baseKm * ratePerKm;
      extraKmRate = ratePerKm;
      driverAllowanceAmount = calculatedDays * driverAllowanceAmount;
      nightChargesAmount =
        calculatedDays *
        (Number(rateCard.outstationNightCharge) ||
          Number(rateCard.nightCharge));
    } else {
      // Local hourly rental, local package, or airport transfer
      const packageHr =
        selectedCustomPackage?.includedHours ??
        (Number(rateCard.fullHr) || Number(rateCard.minHr));
      const packageKm =
        selectedCustomPackage?.includedKm ??
        (Number(rateCard.fullKm) ||
          Number(rateCard.minKm) ||
          Number(rateCard.includedKm));
      const packageFare =
        selectedCustomPackage?.rate ??
        (Number(rateCard.fullDayRate) || Number(rateCard.halfDayRate));

      baseFare = packageFare;
      baseKm = packageKm;
      if (calculatedHours > packageHr) {
        extraHours = calculatedHours - packageHr;
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
    const driverAllowance =
      slip.driverAllowance !== null && slip.driverAllowance !== undefined
        ? Number(slip.driverAllowance)
        : driverAllowanceAmount;
    const nightCharges =
      slip.nightCharges !== null && slip.nightCharges !== undefined
        ? Number(slip.nightCharges)
        : nightChargesAmount;
    const extraCharges = Number(slip.extraCharges);

    const totalAmount =
      baseFare +
      extraKmCharged +
      extraHoursCharged +
      toll +
      parking +
      stateTax +
      mcd +
      driverAllowance +
      nightCharges +
      extraCharges;

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
      rateCardId: rateCard.id,
      rateCardUpdatedAt: rateCard.updatedAt,
      vehicleCategoryId,
      bookingCustomerId: slip.booking!.customerId,
      bookingTripType: slip.booking!.tripType,
      bookingUpdatedAt: slip.booking!.updatedAt,
      customerUpdatedAt: slip.booking!.customer.updatedAt,
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

    const subtotal =
      baseFare +
      extraKm +
      toll +
      parking +
      stateTax +
      mcd +
      nightCharges +
      miscCharges;

    // 3. Calculate Taxes based on GST rates in the invoice
    const gstTaxableAmount = Math.max(
      0,
      subtotal - (toll + parking + mcd + stateTax),
    );

    const cgstRate = Number(invoice.cgstRate || 0);
    const sgstRate = Number(invoice.sgstRate || 0);
    const igstRate = Number(invoice.igstRate || 0);

    const cgstAmount = (gstTaxableAmount * cgstRate) / 100;
    const sgstAmount = (gstTaxableAmount * sgstRate) / 100;
    const igstAmount = (gstTaxableAmount * igstRate) / 100;
    const totalTax = cgstAmount + sgstAmount + igstAmount;

    const isRcm = !!invoice.isRcm;
    const totalAmount = isRcm ? subtotal : subtotal + totalTax;

    // dueAmount = totalAmount - paidAmount
    const dueAmount = Math.max(
      0,
      totalAmount - Number(invoice.paidAmount || 0),
    );

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
    try {
      if (!dto.dutySlipId) {
        throw new BadRequestException(
          'Duty Slip ID is required to close a trip',
        );
      }

      // 1. Fetch the target duty slip
      const slip = await this.prisma.dutySlip.findUnique({
        where: { id: dto.dutySlipId },
        include: {
          booking: { include: { customer: true } },
        },
      });
      if (!slip) {
        throw new NotFoundException('Duty slip not found');
      }
      if (!slip.bookingId || !slip.booking) {
        throw new BadRequestException(
          'A valid booking is required before this duty slip can be closed.',
        );
      }
      if (
        slip.booking.status !== BookingStatus.ASSIGNED &&
        slip.booking.status !== BookingStatus.COMPLETED
      ) {
        throw new BadRequestException(
          'Only a duty slip linked to an assigned booking can be closed.',
        );
      }

      // Resolve overrides or defaults for dates (fallback startDateTime to reportingTime if missing)
      const startDateTime = dto.startDateTime
        ? new Date(dto.startDateTime)
        : slip.startDateTime
          ? new Date(slip.startDateTime)
          : slip.reportingTime
            ? new Date(slip.reportingTime)
            : undefined;
      const endDateTime = dto.endDateTime
        ? new Date(dto.endDateTime)
        : slip.endDateTime
          ? new Date(slip.endDateTime)
          : undefined;

      // 2. Run charges calculation to establish defaults if not explicitly overridden in DTO
      const calculations = await this.calculateTripCharges(
        dto.dutySlipId,
        dto.endKm,
        startDateTime,
        endDateTime,
      );

      const baseFareCharged =
        dto.baseFareCharged ?? calculations.baseFareCharged;
      const extraKmCharged = dto.extraKmCharged ?? calculations.extraKmCharged;
      const extraHoursCharged =
        dto.extraHoursCharged ?? calculations.extraHoursCharged;
      const toll = dto.toll ?? calculations.toll;
      const parking = dto.parking ?? calculations.parking;
      const stateTax = dto.stateTax ?? calculations.stateTax;
      const mcd = dto.mcd ?? calculations.mcd;
      const driverAllowance =
        dto.driverAllowance ?? calculations.driverAllowance;
      const nightChargesCharged = dto.nightCharges ?? calculations.nightCharges;
      const miscChargesCharged = dto.extraCharges ?? calculations.extraCharges;

      const totalAmount =
        dto.totalAmount ??
        Number(baseFareCharged) +
          Number(extraKmCharged) +
          Number(extraHoursCharged) +
          Number(toll) +
          Number(parking) +
          Number(stateTax) +
          Number(mcd) +
          Number(driverAllowance) +
          Number(nightChargesCharged) +
          Number(miscChargesCharged);

      const existingTrip = await this.prisma.trip.findUnique({
        where: { dutySlipId: dto.dutySlipId },
        include: {
          invoiceItems: true,
        },
      });

      // 4. Run database updates inside a safe prisma transaction
      return this.prisma.$transaction(async (tx) => {
        const currentBooking = await tx.booking.findFirst({
          where: {
            id: slip.bookingId!,
            tenantId: slip.tenantId,
            customerId: calculations.bookingCustomerId,
            tripType: calculations.bookingTripType,
            updatedAt: calculations.bookingUpdatedAt,
            status: {
              in: [BookingStatus.ASSIGNED, BookingStatus.COMPLETED],
            },
          },
          include: { customer: true },
        });
        if (!currentBooking) {
          throw new BadRequestException(
            'The booking changed or is no longer assigned. Reload the duty slip and try again.',
          );
        }
        if (
          currentBooking.customer.updatedAt.getTime() !==
          calculations.customerUpdatedAt.getTime()
        ) {
          throw new BadRequestException(
            'The customer changed while closing the trip. Reload the duty slip and try again.',
          );
        }

        const currentClientType =
          currentBooking.customer.type === 'INDIVIDUAL'
            ? 'Individual'
            : /travel|holiday|resort|tour/i.test(
                  currentBooking.customer.companyName || '',
                )
              ? 'Travel Company'
              : 'Company';
        const applicableRateCardWhere = {
          tenantId: slip.tenantId,
          vehicleCategoryId: calculations.vehicleCategoryId,
          status: 'ACTIVE',
          effectiveFrom: {
            lte: endDateTime || new Date(),
          },
        };
        const latestCustomerRateCard = await tx.rateCard.findFirst({
          where: {
            ...applicableRateCardWhere,
            customerId: currentBooking.customerId,
          },
          orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
        });
        const currentRateCard =
          latestCustomerRateCard ||
          (await tx.rateCard.findFirst({
            where: {
              ...applicableRateCardWhere,
              customerId: null,
              clientType: currentClientType,
            },
            orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
          }));
        const rateCardStillValid =
          currentRateCard?.id === calculations.rateCardId &&
          currentRateCard.updatedAt.getTime() ===
            calculations.rateCardUpdatedAt.getTime()
            ? currentRateCard
            : null;
        const hasValidCurrentBaseRate =
          rateCardStillValid &&
          (currentBooking.tripType === TripType.OUTSTATION
            ? Number(rateCardStillValid.minKmPerDay) > 0 &&
              Number(rateCardStillValid.outstationRatePerKm) > 0
            : ((Number(rateCardStillValid.fullDayRate) > 0 ||
                Number(rateCardStillValid.halfDayRate) > 0) &&
                (Number(rateCardStillValid.fullKm) ||
                  Number(rateCardStillValid.minKm) ||
                  Number(rateCardStillValid.includedKm)) > 0 &&
                (Number(rateCardStillValid.fullHr) ||
                  Number(rateCardStillValid.minHr)) > 0) ||
              (Array.isArray(rateCardStillValid?.customPackages) &&
                rateCardStillValid.customPackages.some(
                  (ratePackage) =>
                    isJsonRecord(ratePackage) &&
                    typeof ratePackage.includedKm === 'number' &&
                    ratePackage.includedKm > 0 &&
                    typeof ratePackage.includedHours === 'number' &&
                    ratePackage.includedHours > 0 &&
                    typeof ratePackage.rate === 'number' &&
                    ratePackage.rate > 0,
                )));
        if (!hasValidCurrentBaseRate) {
          throw new BadRequestException(
            'The rate card changed or is no longer valid. Reload the duty slip and select an active, effective rate card before closing.',
          );
        }

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
            rateCardId: calculations.rateCardId,
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
    } catch (err) {
      const details = err instanceof Error ? err.message : String(err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        this.logger.warn(
          `Trip close rejected for duty slip ${dto.dutySlipId}: ${details}`,
        );
      } else {
        this.logger.error(
          `Trip close failed for duty slip ${dto.dutySlipId}: ${details}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
      throw err;
    }
  }

  async findAll(query: { page?: number; limit?: number }) {
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
