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
        let bookingNumber = '';
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
            attempts++;
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomDigits = Math.floor(1000 + Math.random() * 9000);
            bookingNumber = `BK-${dateStr}-${randomDigits}`;
            const existing = await this.prisma.booking.findFirst({
                where: { bookingNumber },
            });
            if (!existing) {
                isUnique = true;
            }
        }
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
                status: dto.status ?? client_1.BookingStatus.PENDING,
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
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        return booking;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.customerId) {
            const customer = await this.prisma.customer.findUnique({
                where: { id: dto.customerId },
            });
            if (!customer) {
                throw new common_1.NotFoundException('Customer not found');
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
    async remove(id) {
        const booking = await this.findOne(id);
        return this.prisma.booking.delete({
            where: { id },
        });
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map