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
exports.DriversService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DriversService = class DriversService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existingMobile = await this.prisma.driver.findFirst({
            where: { mobile: dto.mobile },
        });
        if (existingMobile) {
            throw new common_1.ConflictException('A driver with this mobile number already exists');
        }
        const existingLicense = await this.prisma.driver.findFirst({
            where: { licenseNumber: dto.licenseNumber },
        });
        if (existingLicense) {
            throw new common_1.ConflictException('A driver with this license number already exists');
        }
        return this.prisma.driver.create({
            data: {
                name: dto.name,
                mobile: dto.mobile,
                licenseNumber: dto.licenseNumber,
                licenseExpiry: new Date(dto.licenseExpiry),
                address: dto.address,
                emergencyContact: dto.emergencyContact,
                status: dto.status ?? client_1.DriverStatus.AVAILABLE,
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
                { name: { contains: query.search, mode: 'insensitive' } },
                { mobile: { contains: query.search } },
                { licenseNumber: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [total, data] = await Promise.all([
            this.prisma.driver.count({ where }),
            this.prisma.driver.findMany({
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
        const driver = await this.prisma.driver.findUnique({
            where: { id },
        });
        if (!driver) {
            throw new common_1.NotFoundException('Driver not found');
        }
        return driver;
    }
    async update(id, dto) {
        const driver = await this.findOne(id);
        if (dto.mobile && dto.mobile !== driver.mobile) {
            const existingMobile = await this.prisma.driver.findFirst({
                where: { mobile: dto.mobile },
            });
            if (existingMobile) {
                throw new common_1.ConflictException('A driver with this mobile number already exists');
            }
        }
        if (dto.licenseNumber && dto.licenseNumber !== driver.licenseNumber) {
            const existingLicense = await this.prisma.driver.findFirst({
                where: { licenseNumber: dto.licenseNumber },
            });
            if (existingLicense) {
                throw new common_1.ConflictException('A driver with this license number already exists');
            }
        }
        return this.prisma.driver.update({
            where: { id },
            data: {
                name: dto.name,
                mobile: dto.mobile,
                licenseNumber: dto.licenseNumber,
                licenseExpiry: dto.licenseExpiry
                    ? new Date(dto.licenseExpiry)
                    : undefined,
                address: dto.address,
                emergencyContact: dto.emergencyContact,
                status: dto.status,
            },
        });
    }
    async remove(id) {
        const driver = await this.prisma.driver.findUnique({
            where: { id },
            include: {
                assignments: {
                    where: { status: client_1.AssignmentStatus.ACTIVE },
                },
                _count: {
                    select: {
                        assignments: true,
                        dutySlips: true,
                    },
                },
            },
        });
        if (!driver) {
            throw new common_1.NotFoundException('Driver not found');
        }
        if (driver.assignments.length > 0) {
            throw new common_1.BadRequestException('Cannot delete driver while they have active trip dispatches. Please complete or cancel their active trips first.');
        }
        const hasHistory = driver._count.assignments > 0 || driver._count.dutySlips > 0;
        if (hasHistory) {
            return this.prisma.driver.update({
                where: { id },
                data: { status: client_1.DriverStatus.INACTIVE },
            });
        }
        return this.prisma.driver.delete({
            where: { id },
        });
    }
};
exports.DriversService = DriversService;
exports.DriversService = DriversService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DriversService);
//# sourceMappingURL=drivers.service.js.map