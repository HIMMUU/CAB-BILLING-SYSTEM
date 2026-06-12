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
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateTripCharges(dutySlipId, endKm, extraHours = 0) {
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
        const baseFare = rateCard ? Number(rateCard.baseFare) : 1500;
        const baseKm = rateCard ? Number(rateCard.baseKm) : 40;
        const extraKmRate = rateCard ? Number(rateCard.extraKmRate) : 12;
        const extraHourRate = rateCard ? Number(rateCard.extraHourRate) : 100;
        let extraKmCharged = 0;
        if (totalDistance > baseKm) {
            const extraKm = totalDistance - baseKm;
            extraKmCharged = extraKm * extraKmRate;
        }
        const extraHoursCharged = extraHours * extraHourRate;
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
    async closeTrip(dto) {
        const existingTrip = await this.prisma.trip.findUnique({
            where: { dutySlipId: dto.dutySlipId },
        });
        if (existingTrip) {
            throw new common_1.ConflictException('A trip for this duty slip has already been closed');
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
        if (slip.status === client_1.DutySlipStatus.CLOSED) {
            throw new common_1.BadRequestException('Duty slip is already closed');
        }
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
        return this.prisma.$transaction(async (tx) => {
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
                },
            });
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
            return trip;
        });
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