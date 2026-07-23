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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.customer.findFirst({
            where: { phone: dto.phone },
        });
        if (existing) {
            throw new common_1.ConflictException('A customer with this phone number already exists');
        }
        return this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.create({
                data: {
                    name: dto.name,
                    companyName: dto.companyName,
                    type: dto.type,
                    gstNumber: dto.type === client_1.CustomerType.CORPORATE ? dto.gstNumber : null,
                    email: dto.email,
                    phone: dto.phone,
                    billingAddress: dto.billingAddress,
                    creditLimit: dto.creditLimit ?? 0,
                    paymentTerms: dto.paymentTerms,
                    clientType: dto.clientType || 'Individual',
                    cgstRate: dto.cgstRate ?? 0,
                    sgstRate: dto.sgstRate ?? 0,
                    igstRate: dto.igstRate ?? 0,
                    isRcm: !!dto.isRcm,
                },
            });
            if (dto.rateCards && Array.isArray(dto.rateCards)) {
                for (const card of dto.rateCards) {
                    let catId = null;
                    if (card.vehicleCategoryName && card.vehicleCategoryName.trim()) {
                        const trimmedName = card.vehicleCategoryName.trim();
                        let category = await tx.vehicleCategory.findFirst({
                            where: {
                                name: { equals: trimmedName, mode: 'insensitive' },
                            },
                        });
                        if (!category) {
                            category = await tx.vehicleCategory.create({
                                data: { name: trimmedName },
                            });
                        }
                        catId = category.id;
                    }
                    else if (card.vehicleCategoryId) {
                        catId = card.vehicleCategoryId;
                    }
                    if (catId) {
                        await tx.rateCard.create({
                            data: {
                                tenantId: customer.tenantId,
                                customerId: customer.id,
                                clientType: dto.clientType || 'Individual',
                                vehicleCategoryId: catId,
                                halfDayRate: card.halfDayRate ?? 0,
                                fullDayRate: card.fullDayRate ?? 0,
                                includedKm: card.includedKm ?? 0,
                                extraKmRate: card.extraKmRate ?? 0,
                                extraHourRate: card.extraHourRate ?? 0,
                                minKmPerDay: card.minKmPerDay ?? 0,
                                outstationRatePerKm: card.outstationRatePerKm ?? 0,
                                driverAllowance: card.driverAllowance ?? 0,
                                nightCharge: card.nightCharge ?? 0,
                                nightStartTime: card.nightStartTime || '23:00',
                                nightEndTime: card.nightEndTime || '05:00',
                                minHr: card.minHr ?? 4,
                                minKm: card.minKm ?? 40,
                                fullHr: card.fullHr ?? 8,
                                fullKm: card.fullKm ?? 80,
                                outstationNightCharge: card.outstationNightCharge ?? 0,
                                effectiveFrom: card.effectiveFrom
                                    ? new Date(card.effectiveFrom)
                                    : new Date(),
                                status: card.status || 'ACTIVE',
                            },
                        });
                    }
                }
            }
            return customer;
        });
    }
    async findAll(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.type) {
            where.type = query.type;
        }
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search } },
                { companyName: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [total, data] = await Promise.all([
            this.prisma.customer.count({ where }),
            this.prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
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
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                rateCards: {
                    include: {
                        vehicleCategory: true,
                    },
                },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        return customer;
    }
    async update(id, dto) {
        const customer = await this.findOne(id);
        if (dto.phone && dto.phone !== customer.phone) {
            const existing = await this.prisma.customer.findFirst({
                where: { phone: dto.phone },
            });
            if (existing) {
                throw new common_1.ConflictException('A customer with this phone number already exists');
            }
        }
        const type = dto.type ?? customer.type;
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.customer.update({
                where: { id },
                data: {
                    name: dto.name,
                    companyName: dto.companyName,
                    type,
                    gstNumber: type === client_1.CustomerType.CORPORATE
                        ? (dto.gstNumber ?? customer.gstNumber)
                        : null,
                    email: dto.email,
                    phone: dto.phone,
                    billingAddress: dto.billingAddress,
                    creditLimit: dto.creditLimit,
                    paymentTerms: dto.paymentTerms,
                    clientType: dto.clientType,
                    cgstRate: dto.cgstRate,
                    sgstRate: dto.sgstRate,
                    igstRate: dto.igstRate,
                    isRcm: dto.isRcm !== undefined ? !!dto.isRcm : undefined,
                },
            });
            if (dto.rateCards && Array.isArray(dto.rateCards)) {
                await tx.rateCard.deleteMany({
                    where: { customerId: id },
                });
                for (const card of dto.rateCards) {
                    let catId = null;
                    if (card.vehicleCategoryName && card.vehicleCategoryName.trim()) {
                        const trimmedName = card.vehicleCategoryName.trim();
                        let category = await tx.vehicleCategory.findFirst({
                            where: {
                                name: { equals: trimmedName, mode: 'insensitive' },
                            },
                        });
                        if (!category) {
                            category = await tx.vehicleCategory.create({
                                data: { name: trimmedName },
                            });
                        }
                        catId = category.id;
                    }
                    else if (card.vehicleCategoryId) {
                        catId = card.vehicleCategoryId;
                    }
                    if (catId) {
                        await tx.rateCard.create({
                            data: {
                                tenantId: updated.tenantId,
                                customerId: updated.id,
                                clientType: dto.clientType || updated.clientType || 'Individual',
                                vehicleCategoryId: catId,
                                halfDayRate: card.halfDayRate ?? 0,
                                fullDayRate: card.fullDayRate ?? 0,
                                includedKm: card.includedKm ?? 0,
                                extraKmRate: card.extraKmRate ?? 0,
                                extraHourRate: card.extraHourRate ?? 0,
                                minKmPerDay: card.minKmPerDay ?? 0,
                                outstationRatePerKm: card.outstationRatePerKm ?? 0,
                                driverAllowance: card.driverAllowance ?? 0,
                                nightCharge: card.nightCharge ?? 0,
                                nightStartTime: card.nightStartTime || '23:00',
                                nightEndTime: card.nightEndTime || '05:00',
                                minHr: card.minHr ?? 4,
                                minKm: card.minKm ?? 40,
                                fullHr: card.fullHr ?? 8,
                                fullKm: card.fullKm ?? 80,
                                outstationNightCharge: card.outstationNightCharge ?? 0,
                                effectiveFrom: card.effectiveFrom
                                    ? new Date(card.effectiveFrom)
                                    : new Date(),
                                status: card.status || 'ACTIVE',
                            },
                        });
                    }
                }
            }
            return updated;
        });
    }
    async remove(id) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                bookings: {
                    where: {
                        status: { in: [client_1.BookingStatus.PENDING, client_1.BookingStatus.ASSIGNED] },
                    },
                },
                invoices: {
                    where: {
                        status: {
                            in: [client_1.InvoiceStatus.UNPAID, client_1.InvoiceStatus.PARTIALLY_PAID],
                        },
                    },
                },
                _count: {
                    select: {
                        bookings: true,
                        invoices: true,
                    },
                },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        if (customer.bookings.length > 0 || customer.invoices.length > 0) {
            throw new common_1.BadRequestException('Cannot delete customer while they have active pending bookings or unpaid invoices. Please resolve open bookings and invoices first.');
        }
        const hasHistory = customer._count.bookings > 0 || customer._count.invoices > 0;
        if (hasHistory) {
            return this.prisma.customer.update({
                where: { id },
                data: { status: 'INACTIVE' },
            });
        }
        return this.prisma.customer.delete({
            where: { id },
        });
    }
    async getHistory(id) {
        await this.findOne(id);
        return this.prisma.booking.findMany({
            where: { customerId: id },
            include: {
                trip: true,
            },
            orderBy: { pickupDate: 'desc' },
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map