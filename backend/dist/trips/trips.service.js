"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TripsService = class TripsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateTripCharges(dutySlipId, endKm, overrideStartDateTime, overrideEndDateTime) {
        const slip = await this.prisma.dutySlip.findUnique({
            where: { id: dutySlipId },
            include: {
                booking: { include: { customer: true } },
                vehicle: true,
            },
        });
        if (!slip) {
            throw new common_1.NotFoundException('Duty slip not found');
        }
        const startKm = Number(slip.startKm);
        const totalDistance = endKm - startKm;
        if (totalDistance < 0) {
            throw new common_1.BadRequestException('End KM cannot be less than Start KM');
        }
        const startDateTime = overrideStartDateTime || slip.startDateTime;
        const endDateTime = overrideEndDateTime || slip.endDateTime;
        if (startDateTime && endDateTime && new Date(endDateTime) < new Date(startDateTime)) {
            throw new common_1.BadRequestException('End Date & Time cannot be before Start Date & Time');
        }
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
        const category = await this.prisma.vehicleCategory.findFirst({
            where: {
                name: { equals: slip.vehicle.vehicleType, mode: 'insensitive' },
            },
        });
        let mappedClientType = 'Individual';
        if (slip.booking.customer.type === 'CORPORATE') {
            const lowerName = (slip.booking.customer.companyName || '').toLowerCase();
            if (lowerName.includes('travel') || lowerName.includes('holiday') || lowerName.includes('resort') || lowerName.includes('tour')) {
                mappedClientType = 'Travel Company';
            }
            else {
                mappedClientType = 'Company';
            }
        }
        let rateCard = null;
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
            if (slip.booking.tripType === client_1.TripType.OUTSTATION) {
                const minKm = Number(rateCard.minKmPerDay) || 250;
                const ratePerKm = Number(rateCard.outstationRatePerKm) || 12;
                baseKm = calculatedDays * minKm;
                baseFare = baseKm * ratePerKm;
                extraKmRate = ratePerKm;
                driverAllowanceAmount = calculatedDays * (Number(rateCard.driverAllowance) || 250);
                nightChargesAmount = calculatedDays * (Number(rateCard.outstationNightCharge || rateCard.nightCharge) || 200);
            }
            else {
                const thresholdHr = Number(rateCard.minHr) || 4;
                const thresholdKm = Number(rateCard.minKm) || 40;
                let isHalfDay = false;
                if (slip.booking.tripType === client_1.TripType.AIRPORT_TRANSFER) {
                    isHalfDay = true;
                }
                else {
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
                }
                else {
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
        let extraKmCharged = 0;
        if (totalDistance > baseKm) {
            const extraKm = totalDistance - baseKm;
            extraKmCharged = extraKm * extraKmRate;
        }
        const extraHoursCharged = extraHours * extraHourRate;
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
    async recalculateInvoice(invoiceId, tx) {
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
        if (!invoice)
            return;
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
            if (!trip)
                continue;
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
        const gstTaxableAmount = Math.max(0, subtotal - (toll + parking + mcd));
        const cgstRate = Number(invoice.cgstRate || 0);
        const sgstRate = Number(invoice.sgstRate || 0);
        const igstRate = Number(invoice.igstRate || 0);
        const cgstAmount = (gstTaxableAmount * cgstRate) / 100;
        const sgstAmount = (gstTaxableAmount * sgstRate) / 100;
        const igstAmount = (gstTaxableAmount * igstRate) / 100;
        const totalTax = cgstAmount + sgstAmount + igstAmount;
        const isRcm = !!invoice.isRcm;
        const totalAmount = isRcm ? subtotal : (subtotal + totalTax);
        const dueAmount = Math.max(0, totalAmount - Number(invoice.paidAmount || 0));
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
    async closeTrip(dto) {
        try {
            if (!dto.dutySlipId) {
                throw new common_1.BadRequestException('Duty Slip ID is required to close a trip');
            }
            const slip = await this.prisma.dutySlip.findUnique({
                where: { id: dto.dutySlipId },
                include: {
                    booking: true,
                },
            });
            if (!slip) {
                throw new common_1.NotFoundException('Duty slip not found');
            }
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
            return this.prisma.$transaction(async (tx) => {
                let trip;
                if (existingTrip) {
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
                        },
                    });
                }
                else {
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
                        },
                    });
                }
                await tx.dutySlip.update({
                    where: { id: dto.dutySlipId },
                    data: {
                        status: client_1.DutySlipStatus.CLOSED,
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
                await tx.booking.update({
                    where: { id: slip.bookingId },
                    data: { status: client_1.BookingStatus.COMPLETED },
                });
                await tx.driver.update({
                    where: { id: slip.driverId },
                    data: { status: client_1.DriverStatus.AVAILABLE },
                });
                await tx.vehicle.update({
                    where: { id: slip.vehicleId },
                    data: { status: client_1.VehicleStatus.AVAILABLE },
                });
                if (existingTrip && existingTrip.invoiceItems.length > 0) {
                    for (const item of existingTrip.invoiceItems) {
                        await this.recalculateInvoice(item.invoiceId, tx);
                    }
                }
                return trip;
            });
        }
        catch (err) {
            console.error(`Error in closeTrip: ${err.message}`, err.stack);
            throw err;
        }
    }
    async findAll(query) {
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
};
exports.TripsService = TripsService;
exports.TripsService = TripsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TripsService);
//# sourceMappingURL=trips.service.js.map