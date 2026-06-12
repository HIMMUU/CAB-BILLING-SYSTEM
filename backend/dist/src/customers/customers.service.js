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
    prisma;
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
        return this.prisma.customer.create({
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
            },
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
        return this.prisma.customer.update({
            where: { id },
            data: {
                name: dto.name,
                companyName: dto.companyName,
                type,
                gstNumber: type === client_1.CustomerType.CORPORATE ? (dto.gstNumber ?? customer.gstNumber) : null,
                email: dto.email,
                phone: dto.phone,
                billingAddress: dto.billingAddress,
                creditLimit: dto.creditLimit,
                paymentTerms: dto.paymentTerms,
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
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