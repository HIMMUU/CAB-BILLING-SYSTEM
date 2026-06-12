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
    prisma;
    tenantContext;
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
        if (booking.status === client_1.BookingStatus.CANCELLED || booking.status === client_1.BookingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Cannot assign resources to a completed or cancelled booking');
        }
        const driver = await this.prisma.driver.findUnique({
            where: { id: dto.driverId },
        });
        if (!driver) {
            throw new common_1.NotFoundException('Driver not found');
        }
        if (driver.status === client_1.DriverStatus.INACTIVE) {
            throw new common_1.BadRequestException('Selected driver is currently INACTIVE');
        }
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: dto.vehicleId },
        });
        if (!vehicle) {
            throw new common_1.NotFoundException('Vehicle not found');
        }
        if (vehicle.status === client_1.VehicleStatus.INACTIVE || vehicle.status === client_1.VehicleStatus.MAINTENANCE) {
            throw new common_1.BadRequestException(`Selected vehicle is currently ${vehicle.status}`);
        }
        const overlappingDriver = await this.prisma.assignment.findFirst({
            where: {
                driverId: dto.driverId,
                status: client_1.AssignmentStatus.ACTIVE,
                booking: {
                    pickupDate: booking.pickupDate,
                },
            },
        });
        if (overlappingDriver) {
            throw new common_1.ConflictException('Driver is already assigned to another active trip on this date');
        }
        const overlappingVehicle = await this.prisma.assignment.findFirst({
            where: {
                vehicleId: dto.vehicleId,
                status: client_1.AssignmentStatus.ACTIVE,
                booking: {
                    pickupDate: booking.pickupDate,
                },
            },
        });
        if (overlappingVehicle) {
            throw new common_1.ConflictException('Vehicle is already assigned to another active trip on this date');
        }
        return this.prisma.$transaction(async (tx) => {
            const assignment = await tx.assignment.create({
                data: {
                    bookingId: dto.bookingId,
                    vehicleId: dto.vehicleId,
                    driverId: dto.driverId,
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
            await tx.booking.update({
                where: { id: dto.bookingId },
                data: { status: client_1.BookingStatus.ASSIGNED },
            });
            await tx.driver.update({
                where: { id: dto.driverId },
                data: { status: client_1.DriverStatus.ON_TRIP },
            });
            await tx.vehicle.update({
                where: { id: dto.vehicleId },
                data: { status: client_1.VehicleStatus.ON_TRIP },
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
            return updatedAssignment;
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