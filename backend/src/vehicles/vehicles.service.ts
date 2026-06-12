import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleStatus } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private cleanVehicleNumber(num: string): string {
    return num.replace(/[\s-]/g, '').toUpperCase();
  }

  async create(dto: CreateVehicleDto) {
    const cleanedNumber = this.cleanVehicleNumber(dto.vehicleNumber);

    const existing = await this.prisma.vehicle.findFirst({
      where: { vehicleNumber: cleanedNumber },
    });

    if (existing) {
      throw new ConflictException('A vehicle with this registration plate already exists');
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
        status: dto.status ?? VehicleStatus.AVAILABLE,
      } as any,
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: VehicleStatus;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { vehicleNumber: { contains: this.cleanVehicleNumber(query.search), mode: 'insensitive' } },
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

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);

    let cleanedNumber = vehicle.vehicleNumber;
    if (dto.vehicleNumber) {
      cleanedNumber = this.cleanVehicleNumber(dto.vehicleNumber);
      if (cleanedNumber !== vehicle.vehicleNumber) {
        const existing = await this.prisma.vehicle.findFirst({
          where: { vehicleNumber: cleanedNumber },
        });

        if (existing) {
          throw new ConflictException('A vehicle with this registration plate already exists');
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
        registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : undefined,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        fitnessExpiry: dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : undefined,
        permitExpiry: dto.permitExpiry ? new Date(dto.permitExpiry) : undefined,
        status: dto.status,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.delete({
      where: { id },
    });
  }
}
