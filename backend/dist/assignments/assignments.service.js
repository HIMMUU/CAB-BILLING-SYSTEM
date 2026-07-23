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
exports.AssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tenant_context_service_1 = require("../common/context/tenant-context.service");
const client_1 = require("@prisma/client");
let AssignmentsService = class AssignmentsService {
    constructor(prisma, tenantContext) {
        this.prisma = prisma;
        this.tenantContext = tenantContext;
    }
    async create(dto) {
        const userId = this.tenantContext.getUser()?.id;
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.status === client_1.BookingStatus.CANCELLED ||
            booking.status === client_1.BookingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Cannot assign resources to a completed or cancelled booking');
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
                const vType = dto.manualVehicleType || booking.vehicleTypeRequired || 'Sedan';
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
        if (!targetDriverId || !targetVehicleId) {
            throw new common_1.BadRequestException('Driver and Vehicle details must be provided');
        }
        const driver = await this.prisma.driver.findUnique({
            where: { id: targetDriverId },
        });
        if (!driver) {
            throw new common_1.NotFoundException('Driver not found');
        }
        if (driver.status === client_1.DriverStatus.INACTIVE) {
            throw new common_1.BadRequestException('Selected driver is currently INACTIVE');
        }
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: targetVehicleId },
        });
        if (!vehicle) {
            throw new common_1.NotFoundException('Vehicle not found');
        }
        if (vehicle.status === client_1.VehicleStatus.INACTIVE ||
            vehicle.status === client_1.VehicleStatus.MAINTENANCE) {
            throw new common_1.BadRequestException(`Selected vehicle is currently ${vehicle.status}`);
        }
        const overlappingDriver = await this.prisma.assignment.findFirst({
            where: {
                driverId: targetDriverId,
                status: client_1.AssignmentStatus.ACTIVE,
                booking: {
                    pickupDate: booking.pickupDate,
                },
            },
        });
        if (overlappingDriver && overlappingDriver.bookingId !== booking.id) {
            throw new common_1.ConflictException('Driver is already assigned to another active trip on this date');
        }
        const overlappingVehicle = await this.prisma.assignment.findFirst({
            where: {
                vehicleId: targetVehicleId,
                status: client_1.AssignmentStatus.ACTIVE,
                booking: {
                    pickupDate: booking.pickupDate,
                },
            },
        });
        if (overlappingVehicle && overlappingVehicle.bookingId !== booking.id) {
            throw new common_1.ConflictException('Vehicle is already assigned to another active trip on this date');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.booking.update({
                where: { id: dto.bookingId },
                data: { status: client_1.BookingStatus.ASSIGNED },
            });
            await tx.driver.update({
                where: { id: targetDriverId },
                data: { status: client_1.DriverStatus.ON_TRIP },
            });
            await tx.vehicle.update({
                where: { id: targetVehicleId },
                data: { status: client_1.VehicleStatus.ON_TRIP },
            });
            const assignment = await tx.assignment.create({
                data: {
                    bookingId: dto.bookingId,
                    vehicleId: targetVehicleId,
                    driverId: targetDriverId,
                    assignedById: userId || null,
                    status: client_1.AssignmentStatus.ACTIVE,
                },
                include: {
                    booking: {
                        include: { customer: true },
                    },
                    driver: true,
                    vehicle: true,
                },
            });
            const repTimeDate = new Date(booking.pickupDate);
            if (booking.pickupTime) {
                const timeParts = booking.pickupTime.split(':');
                if (timeParts.length >= 2) {
                    const hh = parseInt(timeParts[0], 10);
                    const mm = parseInt(timeParts[1], 10);
                    if (!isNaN(hh) && !isNaN(mm)) {
                        repTimeDate.setHours(hh, mm, 0, 0);
                    }
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
                    tenantId: booking.tenantId,
                    dutySlipNumber,
                    bookingId: booking.id,
                    driverId: targetDriverId,
                    vehicleId: targetVehicleId,
                    reportingTime: repTimeDate,
                    startKm: 0,
                    status: client_1.DutySlipStatus.DRAFT,
                    employeeId: booking.employeeId,
                },
            });
            return assignment;
        });
    }
    async findAvailableResources(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        const targetDate = booking.pickupDate;
        const allDrivers = await this.prisma.driver.findMany({
            where: {
                status: { not: client_1.DriverStatus.INACTIVE },
            },
        });
        const activeAssignmentsOnDate = await this.prisma.assignment.findMany({
            where: {
                status: client_1.AssignmentStatus.ACTIVE,
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
        const allVehicles = await this.prisma.vehicle.findMany({
            where: {
                status: { notIn: [client_1.VehicleStatus.INACTIVE, client_1.VehicleStatus.MAINTENANCE] },
            },
        });
        const availableVehicles = allVehicles.filter((v) => !busyVehicleIds.has(v.id));
        return {
            drivers: availableDrivers,
            vehicles: availableVehicles,
            booking,
        };
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
                        include: {
                            customer: true,
                            dutySlip: {
                                select: {
                                    id: true,
                                    dutySlipNumber: true,
                                },
                            },
                        },
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
    async updateStatus(id, dto) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id },
            include: { booking: true },
        });
        if (!assignment) {
            throw new common_1.NotFoundException('Assignment not found');
        }
        if (assignment.status !== client_1.AssignmentStatus.ACTIVE) {
            throw new common_1.BadRequestException('Can only update status of ACTIVE assignments');
        }
        return this.prisma.$transaction(async (tx) => {
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
            await tx.driver.update({
                where: { id: assignment.driverId },
                data: { status: client_1.DriverStatus.AVAILABLE },
            });
            await tx.vehicle.update({
                where: { id: assignment.vehicleId },
                data: { status: client_1.VehicleStatus.AVAILABLE },
            });
            let targetBookingStatus = client_1.BookingStatus.PENDING;
            if (dto.status === client_1.AssignmentStatus.COMPLETED) {
                targetBookingStatus = client_1.BookingStatus.COMPLETED;
            }
            await tx.booking.update({
                where: { id: assignment.bookingId },
                data: { status: targetBookingStatus },
            });
            if (dto.status === client_1.AssignmentStatus.CANCELLED) {
                await tx.dutySlip.deleteMany({
                    where: {
                        bookingId: assignment.bookingId,
                        status: client_1.DutySlipStatus.DRAFT,
                    },
                });
            }
            return updatedAssignment;
        });
    }
    async remove(id) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id },
            include: {
                booking: {
                    include: {
                        dutySlip: {
                            include: {
                                trip: {
                                    include: {
                                        invoiceItems: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!assignment) {
            throw new common_1.NotFoundException('Assignment not found');
        }
        const dutySlip = assignment.booking?.dutySlip;
        if (dutySlip?.trip?.invoiceItems && dutySlip.trip.invoiceItems.length > 0) {
            throw new common_1.BadRequestException('Cannot delete an assignment for a duty slip/trip that has already been billed on an invoice.');
        }
        return this.prisma.$transaction(async (tx) => {
            if (dutySlip?.trip) {
                await tx.trip.delete({
                    where: { id: dutySlip.trip.id },
                });
            }
            if (dutySlip) {
                await tx.dutySlip.delete({
                    where: { id: dutySlip.id },
                });
            }
            const deletedAssignment = await tx.assignment.delete({
                where: { id },
            });
            if (assignment.bookingId) {
                await tx.booking.update({
                    where: { id: assignment.bookingId },
                    data: { status: client_1.BookingStatus.PENDING },
                });
            }
            if (assignment.driverId) {
                const activeDriverAssignments = await tx.assignment.count({
                    where: {
                        driverId: assignment.driverId,
                        status: client_1.AssignmentStatus.ACTIVE,
                        id: { not: id },
                    },
                });
                if (activeDriverAssignments === 0) {
                    await tx.driver.update({
                        where: { id: assignment.driverId },
                        data: { status: client_1.DriverStatus.AVAILABLE },
                    });
                }
            }
            if (assignment.vehicleId) {
                const activeVehicleAssignments = await tx.assignment.count({
                    where: {
                        vehicleId: assignment.vehicleId,
                        status: client_1.AssignmentStatus.ACTIVE,
                        id: { not: id },
                    },
                });
                if (activeVehicleAssignments === 0) {
                    await tx.vehicle.update({
                        where: { id: assignment.vehicleId },
                        data: { status: client_1.VehicleStatus.AVAILABLE },
                    });
                }
            }
            return deletedAssignment;
        });
    }
};
exports.AssignmentsService = AssignmentsService;
exports.AssignmentsService = AssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenant_context_service_1.TenantContextService])
], AssignmentsService);
//# sourceMappingURL=assignments.service.js.map