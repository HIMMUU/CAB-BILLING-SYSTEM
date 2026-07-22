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
exports.VehiclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let VehiclesService = class VehiclesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    cleanVehicleNumber(num) {
        return num.replace(/[\s-]/g, '').toUpperCase();
    }
    async create(dto) {
        const cleanedNumber = this.cleanVehicleNumber(dto.vehicleNumber);
        const existing = await this.prisma.vehicle.findFirst({
            where: { vehicleNumber: cleanedNumber },
        });
        if (existing) {
            throw new common_1.ConflictException('A vehicle with this registration plate already exists');
        }
        return this.prisma.vehicle.create({
            data: {
                vehicleNumber: cleanedNumber,
                vehicleType: dto.vehicleType,
                model: dto.model,
                seatingCapacity: dto.seatingCapacity,
                registrationDate: new Date(dto.registrationDate),
                insuranceExpiry: new Date(dto.insuranceExpiry),
                fitnessExpiry: new Date(dto.fitnessExpiry),
                permitExpiry: new Date(dto.permitExpiry),
                status: dto.status ?? client_1.VehicleStatus.AVAILABLE,
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
                {
                    vehicleNumber: {
                        contains: this.cleanVehicleNumber(query.search),
                        mode: 'insensitive',
                    },
                },
                { model: { contains: query.search, mode: 'insensitive' } },
                { vehicleType: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [total, data] = await Promise.all([
            this.prisma.vehicle.count({ where }),
            this.prisma.vehicle.findMany({
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
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
        });
        if (!vehicle) {
            throw new common_1.NotFoundException('Vehicle not found');
        }
        return vehicle;
    }
    async update(id, dto) {
        const vehicle = await this.findOne(id);
        let cleanedNumber = vehicle.vehicleNumber;
        if (dto.vehicleNumber) {
            cleanedNumber = this.cleanVehicleNumber(dto.vehicleNumber);
            if (cleanedNumber !== vehicle.vehicleNumber) {
                const existing = await this.prisma.vehicle.findFirst({
                    where: { vehicleNumber: cleanedNumber },
                });
                if (existing) {
                    throw new common_1.ConflictException('A vehicle with this registration plate already exists');
                }
            }
        }
        return this.prisma.vehicle.update({
            where: { id },
            data: {
                vehicleNumber: cleanedNumber,
                vehicleType: dto.vehicleType,
                model: dto.model,
                seatingCapacity: dto.seatingCapacity,
                registrationDate: dto.registrationDate
                    ? new Date(dto.registrationDate)
                    : undefined,
                insuranceExpiry: dto.insuranceExpiry
                    ? new Date(dto.insuranceExpiry)
                    : undefined,
                fitnessExpiry: dto.fitnessExpiry
                    ? new Date(dto.fitnessExpiry)
                    : undefined,
                permitExpiry: dto.permitExpiry ? new Date(dto.permitExpiry) : undefined,
                status: dto.status,
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.vehicle.delete({
            where: { id },
        });
    }
};
exports.VehiclesService = VehiclesService;
exports.VehiclesService = VehiclesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VehiclesService);
//# sourceMappingURL=vehicles.service.js.map