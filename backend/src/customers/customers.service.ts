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

    return this.prisma.customer.create({
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
      } as any,
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

    return this.prisma.customer.update({
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
      },
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
