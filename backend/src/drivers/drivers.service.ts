import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverStatus, AssignmentStatus } from '@prisma/client';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDriverDto) {
    // Check mobile uniqueness per tenant
    const existingMobile = await this.prisma.driver.findFirst({
      where: { mobile: dto.mobile },
    });
    if (existingMobile) {
      throw new ConflictException(
        'A driver with this mobile number already exists',
      );
    }

    // Check license uniqueness per tenant
    const existingLicense = await this.prisma.driver.findFirst({
      where: { licenseNumber: dto.licenseNumber },
    });
    if (existingLicense) {
      throw new ConflictException(
        'A driver with this license number already exists',
      );
    }

    return this.prisma.driver.create({
      data: {
        name: dto.name,
        mobile: dto.mobile,
        licenseNumber: dto.licenseNumber,
        licenseExpiry: new Date(dto.licenseExpiry),
        address: dto.address,
        emergencyContact: dto.emergencyContact,
        status: dto.status ?? DriverStatus.AVAILABLE,
      } as any,
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: DriverStatus;
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

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async update(id: string, dto: UpdateDriverDto) {
    const driver = await this.findOne(id);

    if (dto.mobile && dto.mobile !== driver.mobile) {
      const existingMobile = await this.prisma.driver.findFirst({
        where: { mobile: dto.mobile },
      });
      if (existingMobile) {
        throw new ConflictException(
          'A driver with this mobile number already exists',
        );
      }
    }

    if (dto.licenseNumber && dto.licenseNumber !== driver.licenseNumber) {
      const existingLicense = await this.prisma.driver.findFirst({
        where: { licenseNumber: dto.licenseNumber },
      });
      if (existingLicense) {
        throw new ConflictException(
          'A driver with this license number already exists',
        );
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

  async remove(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
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
      throw new NotFoundException('Driver not found');
    }

    if (driver.assignments.length > 0) {
      throw new BadRequestException(
        'Cannot delete driver while they have active trip dispatches. Please complete or cancel their active trips first.',
      );
    }

    const hasHistory =
      driver._count.assignments > 0 || driver._count.dutySlips > 0;

    if (hasHistory) {
      return this.prisma.driver.update({
        where: { id },
        data: { status: DriverStatus.INACTIVE },
      });
    }

    return this.prisma.driver.delete({
      where: { id },
    });
  }
}
