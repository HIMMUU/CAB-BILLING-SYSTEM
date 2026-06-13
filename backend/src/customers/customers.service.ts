import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerType } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException('A customer with this phone number already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: dto.name,
          companyName: dto.companyName,
          type: dto.type,
          gstNumber: dto.type === CustomerType.CORPORATE ? dto.gstNumber : null,
          email: dto.email,
          phone: dto.phone,
          billingAddress: dto.billingAddress,
          creditLimit: dto.creditLimit ?? 0,
          paymentTerms: dto.paymentTerms,
          clientType: dto.clientType || 'Individual',
          cgstRate: dto.cgstRate ?? 0,
          sgstRate: dto.sgstRate ?? 0,
          igstRate: dto.igstRate ?? 0,
        } as any,
      });

      if (dto.rateCards && Array.isArray(dto.rateCards)) {
        for (const card of dto.rateCards) {
          let catId = card.vehicleCategoryId;
          if (!catId && card.vehicleCategoryName) {
            let category = await tx.vehicleCategory.findFirst({
              where: { name: { equals: card.vehicleCategoryName, mode: 'insensitive' } },
            });
            if (!category) {
              category = await tx.vehicleCategory.create({
                data: { name: card.vehicleCategoryName },
              });
            }
            catId = category.id;
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
                effectiveFrom: card.effectiveFrom ? new Date(card.effectiveFrom) : new Date(),
                status: card.status || 'ACTIVE',
              },
            });
          }
        }
      }

      return customer;
    });
  }


  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    type?: CustomerType;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

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

  async findOne(id: string) {
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
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.findOne(id);

    if (dto.phone && dto.phone !== customer.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone },
      });

      if (existing) {
        throw new ConflictException('A customer with this phone number already exists');
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
          gstNumber: type === CustomerType.CORPORATE ? (dto.gstNumber ?? customer.gstNumber) : null,
          email: dto.email,
          phone: dto.phone,
          billingAddress: dto.billingAddress,
          creditLimit: dto.creditLimit,
          paymentTerms: dto.paymentTerms,
          clientType: dto.clientType,
          cgstRate: dto.cgstRate,
          sgstRate: dto.sgstRate,
          igstRate: dto.igstRate,
        },
      });

      if (dto.rateCards && Array.isArray(dto.rateCards)) {
        // Clear existing rate cards for this customer
        await tx.rateCard.deleteMany({
          where: { customerId: id },
        });

        // Insert new ones
        for (const card of dto.rateCards) {
          let catId = card.vehicleCategoryId;
          if (!catId && card.vehicleCategoryName) {
            let category = await tx.vehicleCategory.findFirst({
              where: { name: { equals: card.vehicleCategoryName, mode: 'insensitive' } },
            });
            if (!category) {
              category = await tx.vehicleCategory.create({
                data: { name: card.vehicleCategoryName },
              });
            }
            catId = category.id;
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
                effectiveFrom: card.effectiveFrom ? new Date(card.effectiveFrom) : new Date(),
                status: card.status || 'ACTIVE',
              },
            });
          }
        }
      }

      return updated;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async getHistory(id: string) {
    await this.findOne(id);
    return this.prisma.booking.findMany({
      where: { customerId: id },
      include: {
        trip: true,
      },
      orderBy: { pickupDate: 'desc' },
    });
  }
}
