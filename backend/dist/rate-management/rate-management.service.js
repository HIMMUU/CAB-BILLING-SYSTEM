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
exports.RateManagementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tenant_context_service_1 = require("../common/context/tenant-context.service");
let RateManagementService = class RateManagementService {
    constructor(prisma, tenantContext) {
        this.prisma = prisma;
        this.tenantContext = tenantContext;
    }
    getUserId() {
        return this.tenantContext.getUser()?.id;
    }
    getTenantId() {
        const tenantId = this.tenantContext.getTenantId();
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant context is missing');
        }
        return tenantId;
    }
    async writeAuditLog(action, entityName, entityId, oldValues, newValues) {
        try {
            const tenantId = this.getTenantId();
            const userId = this.getUserId();
            await this.prisma.auditLog.create({
                data: {
                    tenantId,
                    userId: userId || null,
                    action,
                    entityName,
                    entityId,
                    oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
                    newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
                },
            });
        }
        catch (e) {
            console.error('Failed to write audit log:', e);
        }
    }
    async findAllCategories() {
        return this.prisma.vehicleCategory.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async createRateCard(dto) {
        const tenantId = this.getTenantId();
        if (dto.customerId) {
            const customer = await this.prisma.customer.findUnique({
                where: { id: dto.customerId },
            });
            if (!customer) {
                throw new common_1.NotFoundException('Customer not found');
            }
        }
        const rateCard = await this.prisma.rateCard.create({
            data: {
                tenantId,
                customerId: dto.customerId || null,
                clientType: dto.clientType,
                vehicleCategoryId: dto.vehicleCategoryId,
                halfDayRate: dto.halfDayRate ?? 0,
                fullDayRate: dto.fullDayRate ?? 0,
                includedKm: dto.includedKm ?? 0,
                extraKmRate: dto.extraKmRate ?? 0,
                extraHourRate: dto.extraHourRate ?? 0,
                minKmPerDay: dto.minKmPerDay ?? 0,
                outstationRatePerKm: dto.outstationRatePerKm ?? 0,
                driverAllowance: dto.driverAllowance ?? 0,
                nightCharge: dto.nightCharge ?? 0,
                nightStartTime: dto.nightStartTime || '23:00',
                nightEndTime: dto.nightEndTime || '05:00',
                minHr: dto.minHr ?? 4.00,
                minKm: dto.minKm ?? 40.00,
                fullHr: dto.fullHr ?? 8.00,
                fullKm: dto.fullKm ?? 80.00,
                outstationNightCharge: dto.outstationNightCharge ?? 0,
                effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
                status: dto.status || 'ACTIVE',
            },
            include: {
                customer: true,
                vehicleCategory: true,
            },
        });
        await this.writeAuditLog('RATE_CARD_CREATE', 'rate_cards', rateCard.id, null, rateCard);
        return rateCard;
    }
    async findAllRateCards(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.clientType && query.clientType !== 'ALL') {
            where.clientType = query.clientType;
        }
        if (query.customerId && query.customerId !== 'ALL') {
            where.customerId = query.customerId;
        }
        if (query.vehicleCategoryId && query.vehicleCategoryId !== 'ALL') {
            where.vehicleCategoryId = query.vehicleCategoryId;
        }
        if (query.effectiveDate) {
            where.effectiveFrom = {
                lte: new Date(query.effectiveDate),
            };
        }
        if (query.search) {
            where.OR = [
                {
                    customer: {
                        name: { contains: query.search, mode: 'insensitive' },
                    },
                },
                {
                    clientType: { contains: query.search, mode: 'insensitive' },
                },
            ];
        }
        const [total, data] = await Promise.all([
            this.prisma.rateCard.count({ where }),
            this.prisma.rateCard.findMany({
                where,
                skip,
                take: limit,
                orderBy: { effectiveFrom: 'desc' },
                include: {
                    customer: true,
                    vehicleCategory: true,
                },
            }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOneRateCard(id) {
        const rateCard = await this.prisma.rateCard.findUnique({
            where: { id },
            include: {
                customer: true,
                vehicleCategory: true,
            },
        });
        if (!rateCard) {
            throw new common_1.NotFoundException('Rate card not found');
        }
        return rateCard;
    }
    async updateRateCard(id, dto) {
        const oldRateCard = await this.findOneRateCard(id);
        const updateData = {};
        if (dto.customerId !== undefined)
            updateData.customerId = dto.customerId || null;
        if (dto.clientType !== undefined)
            updateData.clientType = dto.clientType;
        if (dto.vehicleCategoryId !== undefined)
            updateData.vehicleCategoryId = dto.vehicleCategoryId;
        if (dto.halfDayRate !== undefined)
            updateData.halfDayRate = dto.halfDayRate;
        if (dto.fullDayRate !== undefined)
            updateData.fullDayRate = dto.fullDayRate;
        if (dto.includedKm !== undefined)
            updateData.includedKm = dto.includedKm;
        if (dto.extraKmRate !== undefined)
            updateData.extraKmRate = dto.extraKmRate;
        if (dto.extraHourRate !== undefined)
            updateData.extraHourRate = dto.extraHourRate;
        if (dto.minKmPerDay !== undefined)
            updateData.minKmPerDay = dto.minKmPerDay;
        if (dto.outstationRatePerKm !== undefined)
            updateData.outstationRatePerKm = dto.outstationRatePerKm;
        if (dto.driverAllowance !== undefined)
            updateData.driverAllowance = dto.driverAllowance;
        if (dto.nightCharge !== undefined)
            updateData.nightCharge = dto.nightCharge;
        if (dto.nightStartTime !== undefined)
            updateData.nightStartTime = dto.nightStartTime;
        if (dto.nightEndTime !== undefined)
            updateData.nightEndTime = dto.nightEndTime;
        if (dto.minHr !== undefined)
            updateData.minHr = dto.minHr;
        if (dto.minKm !== undefined)
            updateData.minKm = dto.minKm;
        if (dto.fullHr !== undefined)
            updateData.fullHr = dto.fullHr;
        if (dto.fullKm !== undefined)
            updateData.fullKm = dto.fullKm;
        if (dto.outstationNightCharge !== undefined)
            updateData.outstationNightCharge = dto.outstationNightCharge;
        if (dto.effectiveFrom !== undefined)
            updateData.effectiveFrom = new Date(dto.effectiveFrom);
        if (dto.status !== undefined)
            updateData.status = dto.status;
        const rateCard = await this.prisma.rateCard.update({
            where: { id },
            data: updateData,
            include: {
                customer: true,
                vehicleCategory: true,
            },
        });
        await this.writeAuditLog('RATE_CARD_UPDATE', 'rate_cards', id, oldRateCard, rateCard);
        return rateCard;
    }
    async cloneRateCard(id) {
        const rateCard = await this.findOneRateCard(id);
        const tenantId = this.getTenantId();
        const cloned = await this.prisma.rateCard.create({
            data: {
                tenantId,
                customerId: rateCard.customerId,
                clientType: rateCard.clientType,
                vehicleCategoryId: rateCard.vehicleCategoryId,
                halfDayRate: rateCard.halfDayRate,
                fullDayRate: rateCard.fullDayRate,
                includedKm: rateCard.includedKm,
                extraKmRate: rateCard.extraKmRate,
                extraHourRate: rateCard.extraHourRate,
                minKmPerDay: rateCard.minKmPerDay,
                outstationRatePerKm: rateCard.outstationRatePerKm,
                driverAllowance: rateCard.driverAllowance,
                nightCharge: rateCard.nightCharge,
                nightStartTime: rateCard.nightStartTime,
                nightEndTime: rateCard.nightEndTime,
                minHr: rateCard.minHr,
                minKm: rateCard.minKm,
                fullHr: rateCard.fullHr,
                fullKm: rateCard.fullKm,
                outstationNightCharge: rateCard.outstationNightCharge,
                effectiveFrom: new Date(),
                status: 'ACTIVE',
            },
            include: {
                customer: true,
                vehicleCategory: true,
            },
        });
        await this.writeAuditLog('RATE_CARD_CLONE', 'rate_cards', cloned.id, rateCard, cloned);
        return cloned;
    }
    async removeRateCard(id) {
        const rateCard = await this.findOneRateCard(id);
        if (rateCard.customerId) {
            const invoicesCount = await this.prisma.invoice.count({
                where: { customerId: rateCard.customerId },
            });
            if (invoicesCount > 0) {
                throw new common_1.BadRequestException('This rate card cannot be deleted because invoices have been issued for this customer.');
            }
        }
        else {
            const invoicesCount = await this.prisma.invoice.count({
                where: {
                    customer: {
                        type: rateCard.clientType === 'Individual' ? 'INDIVIDUAL' : 'CORPORATE',
                    },
                    items: {
                        some: {
                            trip: {
                                dutySlip: {
                                    vehicle: {
                                        vehicleType: rateCard.vehicleCategory.name,
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (invoicesCount > 0) {
                throw new common_1.BadRequestException('This rate card cannot be deleted because invoices have been generated using this default vehicle category rate.');
            }
        }
        await this.prisma.rateCard.delete({
            where: { id },
        });
        await this.writeAuditLog('RATE_CARD_DELETE', 'rate_cards', id, rateCard, null);
        return { success: true };
    }
    async exportRateCardsToCsv() {
        const rateCards = await this.prisma.rateCard.findMany({
            include: {
                customer: true,
                vehicleCategory: true,
            },
            orderBy: { effectiveFrom: 'desc' },
        });
        const headers = [
            'Client Type',
            'Customer Name',
            'Vehicle Category',
            'Half Day Rate',
            'Full Day Rate',
            'Included KM',
            'Extra KM Rate',
            'Extra Hour Rate',
            'Outstation Min KM',
            'Outstation Rate/KM',
            'Driver Allowance',
            'Night Charge',
            'Effective From',
            'Status',
        ];
        const rows = rateCards.map((rc) => [
            rc.clientType,
            rc.customer?.name || 'Default (All Clients)',
            rc.vehicleCategory.name,
            rc.halfDayRate.toString(),
            rc.fullDayRate.toString(),
            rc.includedKm.toString(),
            rc.extraKmRate.toString(),
            rc.extraHourRate.toString(),
            rc.minKmPerDay.toString(),
            rc.outstationRatePerKm.toString(),
            rc.driverAllowance.toString(),
            rc.nightCharge.toString(),
            rc.effectiveFrom.toISOString().split('T')[0],
            rc.status,
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        return csvContent;
    }
    async createTaxConfig(dto) {
        const tenantId = this.getTenantId();
        return this.prisma.$transaction(async (tx) => {
            if (dto.isActive) {
                await tx.taxConfiguration.updateMany({
                    where: { tenantId, isActive: true },
                    data: { isActive: false },
                });
            }
            const taxConfig = await tx.taxConfiguration.create({
                data: {
                    tenantId,
                    taxName: dto.taxName,
                    cgst: dto.cgst,
                    sgst: dto.sgst,
                    igst: dto.igst,
                    effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
                    isActive: dto.isActive ?? false,
                },
            });
            await this.writeAuditLog('TAX_CONFIG_CREATE', 'tax_configurations', taxConfig.id, null, taxConfig);
            return taxConfig;
        });
    }
    async findAllTaxConfigs() {
        return this.prisma.taxConfiguration.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOneTaxConfig(id) {
        const taxConfig = await this.prisma.taxConfiguration.findUnique({
            where: { id },
        });
        if (!taxConfig) {
            throw new common_1.NotFoundException('Tax configuration not found');
        }
        return taxConfig;
    }
    async updateTaxConfig(id, dto) {
        const oldTaxConfig = await this.findOneTaxConfig(id);
        const tenantId = this.getTenantId();
        return this.prisma.$transaction(async (tx) => {
            if (dto.isActive === true && !oldTaxConfig.isActive) {
                await tx.taxConfiguration.updateMany({
                    where: { tenantId, isActive: true },
                    data: { isActive: false },
                });
            }
            const updateData = {};
            if (dto.taxName !== undefined)
                updateData.taxName = dto.taxName;
            if (dto.cgst !== undefined)
                updateData.cgst = dto.cgst;
            if (dto.sgst !== undefined)
                updateData.sgst = dto.sgst;
            if (dto.igst !== undefined)
                updateData.igst = dto.igst;
            if (dto.effectiveFrom !== undefined)
                updateData.effectiveFrom = new Date(dto.effectiveFrom);
            if (dto.isActive !== undefined)
                updateData.isActive = dto.isActive;
            const taxConfig = await tx.taxConfiguration.update({
                where: { id },
                data: updateData,
            });
            await this.writeAuditLog('TAX_CONFIG_UPDATE', 'tax_configurations', id, oldTaxConfig, taxConfig);
            return taxConfig;
        });
    }
    async activateTaxConfig(id) {
        const oldTaxConfig = await this.findOneTaxConfig(id);
        if (oldTaxConfig.isActive) {
            return oldTaxConfig;
        }
        const tenantId = this.getTenantId();
        return this.prisma.$transaction(async (tx) => {
            await tx.taxConfiguration.updateMany({
                where: { tenantId, isActive: true },
                data: { isActive: false },
            });
            const taxConfig = await tx.taxConfiguration.update({
                where: { id },
                data: { isActive: true },
            });
            await this.writeAuditLog('TAX_CONFIG_ACTIVATE', 'tax_configurations', id, oldTaxConfig, taxConfig);
            return taxConfig;
        });
    }
    async removeTaxConfig(id) {
        const taxConfig = await this.findOneTaxConfig(id);
        if (taxConfig.isActive) {
            throw new common_1.BadRequestException('Active tax configurations cannot be deleted. Activate another configuration first.');
        }
        await this.prisma.taxConfiguration.delete({
            where: { id },
        });
        await this.writeAuditLog('TAX_CONFIG_DELETE', 'tax_configurations', id, taxConfig, null);
        return { success: true };
    }
    async findAuditLogs() {
        return this.prisma.auditLog.findMany({
            where: {
                entityName: { in: ['rate_cards', 'tax_configurations'] },
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            take: 50,
        });
    }
};
exports.RateManagementService = RateManagementService;
exports.RateManagementService = RateManagementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenant_context_service_1.TenantContextService])
], RateManagementService);
//# sourceMappingURL=rate-management.service.js.map