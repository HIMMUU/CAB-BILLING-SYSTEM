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
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let BookingsService = class BookingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
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
            }
            else {
                currentVal++;
            }
        }
        const pickupDateObj = new Date(dto.pickupDate);
        let targetDriverId = dto.driverId;
        let targetVehicleId = dto.vehicleId;
        if (!targetDriverId && (dto.manualDriverName || dto.manualDriverMobile)) {
            const mobile = dto.manualDriverMobile || '9999999999';
            let existingDriver = await this.prisma.driver.findFirst({
                where: { tenantId: customer.tenantId, mobile },
            });
            if (!existingDriver) {
                existingDriver = await this.prisma.driver.create({
                    data: {
                        tenantId: customer.tenantId,
                        name: dto.manualDriverName || 'Manual Driver',
                        mobile,
                        licenseNumber: 'MANUAL-' + Date.now().toString().slice(-6),
                        licenseExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                        address: 'Vendor / Ad-hoc Cab Driver',
                        emergencyContact: mobile,
                        status: client_1.DriverStatus.AVAILABLE,
                    },
                });
            }
            targetDriverId = existingDriver.id;
        }
        if (!targetVehicleId && dto.manualVehicleNumber) {
            const vNum = dto.manualVehicleNumber.trim().toUpperCase();
            let existingVehicle = await this.prisma.vehicle.findFirst({
                where: { tenantId: customer.tenantId, vehicleNumber: vNum },
            });
            if (!existingVehicle) {
                const vType = dto.manualVehicleType || dto.vehicleTypeRequired || 'Sedan';
                existingVehicle = await this.prisma.vehicle.create({
                    data: {
                        tenantId: customer.tenantId,
                        vehicleNumber: vNum,
                        vehicleType: vType,
                        model: vType,
                        seatingCapacity: 4,
                        registrationDate: new Date(),
                        insuranceExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                        fitnessExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                        permitExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                        status: client_1.VehicleStatus.AVAILABLE,
                    },
                });
            }
            targetVehicleId = existingVehicle.id;
        }
        if (targetDriverId && targetVehicleId) {
            const driver = await this.prisma.driver.findUnique({
                where: { id: targetDriverId },
            });
            if (!driver)
                throw new common_1.NotFoundException('Driver not found');
            const vehicle = await this.prisma.vehicle.findUnique({
                where: { id: targetVehicleId },
            });
            if (!vehicle)
                throw new common_1.NotFoundException('Vehicle not found');
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
                        status: client_1.BookingStatus.ASSIGNED,
                        employeeId: dto.employeeId,
                        guestName: dto.guestName,
                        guestSalutation: dto.guestSalutation,
                        bookingBy: dto.bookingBy,
                        remarks: dto.remarks,
                    },
                });
                await tx.driver.update({
                    where: { id: targetDriverId },
                    data: { status: client_1.DriverStatus.ON_TRIP },
                });
                await tx.vehicle.update({
                    where: { id: targetVehicleId },
                    data: { status: client_1.VehicleStatus.ON_TRIP },
                });
                await tx.assignment.create({
                    data: {
                        tenantId: customer.tenantId,
                        bookingId: booking.id,
                        vehicleId: targetVehicleId,
                        driverId: targetDriverId,
                        status: client_1.AssignmentStatus.ACTIVE,
                    },
                });
                const repTimeDate = new Date(pickupDateObj);
                if (dto.pickupTime) {
                    const parts = dto.pickupTime.split(':');
                    if (parts.length >= 2) {
                        const hh = parseInt(parts[0], 10);
                        const mm = parseInt(parts[1], 10);
                        if (!isNaN(hh) && !isNaN(mm))
                            repTimeDate.setHours(hh, mm, 0, 0);
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
                    }
                    else {
                        currentDsVal++;
                    }
                }
                await tx.dutySlip.create({
                    data: {
                        tenantId: customer.tenantId,
                        dutySlipNumber,
                        bookingId: booking.id,
                        driverId: targetDriverId,
                        vehicleId: targetVehicleId,
                        reportingTime: repTimeDate,
                        startKm: 0,
                        status: client_1.DutySlipStatus.DRAFT,
                        employeeId: dto.employeeId,
                    },
                });
                return tx.booking.findUnique({
                    where: { id: booking.id },
                    include: {
                        customer: true,
                        dutySlip: {
                            select: { id: true, dutySlipNumber: true },
                        },
                        assignments: {
                            where: { status: client_1.AssignmentStatus.ACTIVE },
                            include: { driver: true, vehicle: true },
                            take: 1,
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                });
            });
        }
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
                status: dto.status ?? client_1.BookingStatus.PENDING,
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
                    where: { status: client_1.AssignmentStatus.ACTIVE },
                    include: { driver: true, vehicle: true },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
    async findAll(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const where = {};
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
                        where: { status: client_1.AssignmentStatus.ACTIVE },
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
    async findOne(id) {
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
                    where: { status: client_1.AssignmentStatus.ACTIVE },
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
            throw new common_1.NotFoundException('Booking not found');
        }
        return booking;
    }
    async update(id, dto) {
        const booking = await this.findOne(id);
        if (dto.customerId) {
            const customer = await this.prisma.customer.findUnique({
                where: { id: dto.customerId },
            });
            if (!customer) {
                throw new common_1.NotFoundException('Customer not found');
            }
        }
        let targetDriverId = dto.driverId;
        let targetVehicleId = dto.vehicleId;
        if (!targetDriverId && (dto.manualDriverName || dto.manualDriverMobile)) {
            const mobile = dto.manualDriverMobile || '9999999999';
            let existingDriver = await this.prisma.driver.findFirst({
                where: { tenantId: booking.tenantId, mobile },
            });
            if (!existingDriver) {
                existingDriver = await this.prisma.driver.create({
                    data: {
                        tenantId: booking.tenantId,
                        name: dto.manualDriverName || 'Manual Driver',
                        mobile,
                        licenseNumber: 'MANUAL-' + Date.now().toString().slice(-6),
                        licenseExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                        address: 'Vendor / Ad-hoc Cab Driver',
                        emergencyContact: mobile,
                        status: client_1.DriverStatus.AVAILABLE,
                    },
                });
            }
            targetDriverId = existingDriver.id;
        }
        if (!targetVehicleId && dto.manualVehicleNumber) {
            const vNum = dto.manualVehicleNumber.trim().toUpperCase();
            let existingVehicle = await this.prisma.vehicle.findFirst({
                where: { tenantId: booking.tenantId, vehicleNumber: vNum },
            });
            if (!existingVehicle) {
                const vType = dto.manualVehicleType || dto.vehicleTypeRequired || booking.vehicleTypeRequired || 'Sedan';
                existingVehicle = await this.prisma.vehicle.create({
                    data: {
                        tenantId: booking.tenantId,
                        vehicleNumber: vNum,
                        vehicleType: vType,
                        model: vType,
                        seatingCapacity: 4,
                        registrationDate: new Date(),
                        insuranceExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                        fitnessExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                        permitExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                        status: client_1.VehicleStatus.AVAILABLE,
                    },
                });
            }
            targetVehicleId = existingVehicle.id;
        }
        if (targetDriverId && targetVehicleId) {
            const driver = await this.prisma.driver.findUnique({
                where: { id: targetDriverId },
            });
            if (!driver)
                throw new common_1.NotFoundException('Driver not found');
            const vehicle = await this.prisma.vehicle.findUnique({
                where: { id: targetVehicleId },
            });
            if (!vehicle)
                throw new common_1.NotFoundException('Vehicle not found');
            return this.prisma.$transaction(async (tx) => {
                const existingAssignment = await tx.assignment.findFirst({
                    where: { bookingId: id, status: client_1.AssignmentStatus.ACTIVE },
                });
                if (existingAssignment) {
                    if (existingAssignment.driverId !== targetDriverId) {
                        await tx.driver.update({
                            where: { id: existingAssignment.driverId },
                            data: { status: client_1.DriverStatus.AVAILABLE },
                        });
                    }
                    if (existingAssignment.vehicleId !== targetVehicleId) {
                        await tx.vehicle.update({
                            where: { id: existingAssignment.vehicleId },
                            data: { status: client_1.VehicleStatus.AVAILABLE },
                        });
                    }
                    await tx.assignment.delete({ where: { id: existingAssignment.id } });
                }
                await tx.driver.update({
                    where: { id: targetDriverId },
                    data: { status: client_1.DriverStatus.ON_TRIP },
                });
                await tx.vehicle.update({
                    where: { id: targetVehicleId },
                    data: { status: client_1.VehicleStatus.ON_TRIP },
                });
                await tx.assignment.create({
                    data: {
                        tenantId: booking.tenantId,
                        bookingId: id,
                        vehicleId: targetVehicleId,
                        driverId: targetDriverId,
                        status: client_1.AssignmentStatus.ACTIVE,
                    },
                });
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
                        if (!isNaN(hh) && !isNaN(mm))
                            repTimeDate.setHours(hh, mm, 0, 0);
                    }
                }
                if (booking.dutySlip) {
                    await tx.dutySlip.update({
                        where: { id: booking.dutySlip.id },
                        data: {
                            driverId: targetDriverId,
                            vehicleId: targetVehicleId,
                            reportingTime: repTimeDate,
                        },
                    });
                }
                else {
                    const countSlips = await tx.dutySlip.count();
                    let dutySlipNumber = String(countSlips + 1);
                    await tx.dutySlip.create({
                        data: {
                            tenantId: booking.tenantId,
                            dutySlipNumber,
                            bookingId: id,
                            driverId: targetDriverId,
                            vehicleId: targetVehicleId,
                            reportingTime: repTimeDate,
                            startKm: 0,
                            status: client_1.DutySlipStatus.DRAFT,
                            employeeId: dto.employeeId || booking.employeeId,
                        },
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
                        status: client_1.BookingStatus.ASSIGNED,
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
                            where: { status: client_1.AssignmentStatus.ACTIVE },
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
                    where: { status: client_1.AssignmentStatus.ACTIVE },
                    include: { driver: true, vehicle: true },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
    async remove(id) {
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
            throw new common_1.NotFoundException('Booking not found');
        }
        const trip = booking.trip || booking.dutySlip?.trip;
        if (trip?.invoiceItems && trip.invoiceItems.length > 0) {
            throw new common_1.BadRequestException('Cannot delete booking that is associated with an invoice.');
        }
        return this.prisma.$transaction(async (tx) => {
            if (trip) {
                await tx.trip.delete({
                    where: { id: trip.id },
                });
            }
            if (booking.dutySlip) {
                await tx.dutySlip.delete({
                    where: { id: booking.dutySlip.id },
                });
            }
            const driverIds = Array.from(new Set(booking.assignments.map((a) => a.driverId).filter(Boolean)));
            const vehicleIds = Array.from(new Set(booking.assignments.map((a) => a.vehicleId).filter(Boolean)));
            await tx.assignment.deleteMany({
                where: { bookingId: id },
            });
            for (const dId of driverIds) {
                const activeCount = await tx.assignment.count({
                    where: { driverId: dId, status: client_1.AssignmentStatus.ACTIVE },
                });
                if (activeCount === 0) {
                    await tx.driver.update({
                        where: { id: dId },
                        data: { status: client_1.DriverStatus.AVAILABLE },
                    });
                }
            }
            for (const vId of vehicleIds) {
                const activeCount = await tx.assignment.count({
                    where: { vehicleId: vId, status: client_1.AssignmentStatus.ACTIVE },
                });
                if (activeCount === 0) {
                    await tx.vehicle.update({
                        where: { id: vId },
                        data: { status: client_1.VehicleStatus.AVAILABLE },
                    });
                }
            }
            return tx.booking.delete({
                where: { id },
            });
        });
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map