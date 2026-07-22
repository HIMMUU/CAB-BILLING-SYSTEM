import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { CreateRateCardDto } from './dto/create-rate-card.dto';
import { UpdateRateCardDto } from './dto/update-rate-card.dto';
import { CreateTaxConfigDto } from './dto/create-tax-config.dto';
import { UpdateTaxConfigDto } from './dto/update-tax-config.dto';

@Injectable()
export class RateManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getUserId(): string | undefined {
    return this.tenantContext.getUser()?.id;
  }

  private getTenantId(): string {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    return tenantId;
  }

  private async writeAuditLog(
    action: string,
    entityName: string,
    entityId: string,
    oldValues: any,
    newValues: any,
  ) {
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
    } catch (e) {
      console.error('Failed to write audit log:', e);
    }
  }

  // =========================================================================
  // VEHICLE CATEGORIES
  // =========================================================================

  async findAllCategories() {
    return this.prisma.vehicleCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // =========================================================================
  // RATE CARDS
  // =========================================================================

  async createRateCard(dto: CreateRateCardDto) {
    const tenantId = this.getTenantId();

    // Validate customer existence if customerId is provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
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
        minHr: dto.minHr ?? 4.0,
        minKm: dto.minKm ?? 40.0,
        fullHr: dto.fullHr ?? 8.0,
        fullKm: dto.fullKm ?? 80.0,
        outstationNightCharge: dto.outstationNightCharge ?? 0,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : new Date(),
        status: dto.status || 'ACTIVE',
      },
      include: {
        customer: true,
        vehicleCategory: true,
      },
    });

    await this.writeAuditLog(
      'RATE_CARD_CREATE',
      'rate_cards',
      rateCard.id,
      null,
      rateCard,
    );
    return rateCard;
  }

  async findAllRateCards(query: {
    page?: number;
    limit?: number;
    search?: string;
    clientType?: string;
    customerId?: string;
    vehicleCategoryId?: string;
    effectiveDate?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

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

  async findOneRateCard(id: string) {
    const rateCard = await this.prisma.rateCard.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicleCategory: true,
      },
    });
    if (!rateCard) {
      throw new NotFoundException('Rate card not found');
    }
    return rateCard;
  }

  async updateRateCard(id: string, dto: UpdateRateCardDto) {
    const oldRateCard = await this.findOneRateCard(id);

    const updateData: any = {};
    if (dto.customerId !== undefined)
      updateData.customerId = dto.customerId || null;
    if (dto.clientType !== undefined) updateData.clientType = dto.clientType;
    if (dto.vehicleCategoryId !== undefined)
      updateData.vehicleCategoryId = dto.vehicleCategoryId;
    if (dto.halfDayRate !== undefined) updateData.halfDayRate = dto.halfDayRate;
    if (dto.fullDayRate !== undefined) updateData.fullDayRate = dto.fullDayRate;
    if (dto.includedKm !== undefined) updateData.includedKm = dto.includedKm;
    if (dto.extraKmRate !== undefined) updateData.extraKmRate = dto.extraKmRate;
    if (dto.extraHourRate !== undefined)
      updateData.extraHourRate = dto.extraHourRate;
    if (dto.minKmPerDay !== undefined) updateData.minKmPerDay = dto.minKmPerDay;
    if (dto.outstationRatePerKm !== undefined)
      updateData.outstationRatePerKm = dto.outstationRatePerKm;
    if (dto.driverAllowance !== undefined)
      updateData.driverAllowance = dto.driverAllowance;
    if (dto.nightCharge !== undefined) updateData.nightCharge = dto.nightCharge;
    if (dto.nightStartTime !== undefined)
      updateData.nightStartTime = dto.nightStartTime;
    if (dto.nightEndTime !== undefined)
      updateData.nightEndTime = dto.nightEndTime;
    if (dto.minHr !== undefined) updateData.minHr = dto.minHr;
    if (dto.minKm !== undefined) updateData.minKm = dto.minKm;
    if (dto.fullHr !== undefined) updateData.fullHr = dto.fullHr;
    if (dto.fullKm !== undefined) updateData.fullKm = dto.fullKm;
    if (dto.outstationNightCharge !== undefined)
      updateData.outstationNightCharge = dto.outstationNightCharge;
    if (dto.effectiveFrom !== undefined)
      updateData.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.status !== undefined) updateData.status = dto.status;

    const rateCard = await this.prisma.rateCard.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        vehicleCategory: true,
      },
    });

    await this.writeAuditLog(
      'RATE_CARD_UPDATE',
      'rate_cards',
      id,
      oldRateCard,
      rateCard,
    );
    return rateCard;
  }

  async cloneRateCard(id: string) {
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
        effectiveFrom: new Date(), // Set effective from now for cloned version
        status: 'ACTIVE',
      },
      include: {
        customer: true,
        vehicleCategory: true,
      },
    });

    await this.writeAuditLog(
      'RATE_CARD_CLONE',
      'rate_cards',
      cloned.id,
      rateCard,
      cloned,
    );
    return cloned;
  }

  async removeRateCard(id: string) {
    const rateCard = await this.findOneRateCard(id);

    // Business Rule Check: "Rate cards used in invoices cannot be deleted."
    if (rateCard.customerId) {
      const invoicesCount = await this.prisma.invoice.count({
        where: { customerId: rateCard.customerId },
      });
      if (invoicesCount > 0) {
        throw new BadRequestException(
          'This rate card cannot be deleted because invoices have been issued for this customer.',
        );
      }
    } else {
      // Default rate card check: check if any invoices are present in the system for this customer clientType and vehicle category
      const invoicesCount = await this.prisma.invoice.count({
        where: {
          customer: {
            type:
              rateCard.clientType === 'Individual' ? 'INDIVIDUAL' : 'CORPORATE',
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
        throw new BadRequestException(
          'This rate card cannot be deleted because invoices have been generated using this default vehicle category rate.',
        );
      }
    }

    await this.prisma.rateCard.delete({
      where: { id },
    });

    await this.writeAuditLog(
      'RATE_CARD_DELETE',
      'rate_cards',
      id,
      rateCard,
      null,
    );
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
      ...rows.map((row) =>
        row.map((val) => `"${val.replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    return csvContent;
  }

  // =========================================================================
  // TAX CONFIGURATIONS
  // =========================================================================

  async createTaxConfig(dto: CreateTaxConfigDto) {
    const tenantId = this.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      // If setting this as active, deactivate all other tax configs first
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
          effectiveFrom: dto.effectiveFrom
            ? new Date(dto.effectiveFrom)
            : new Date(),
          isActive: dto.isActive ?? false,
        },
      });

      await this.writeAuditLog(
        'TAX_CONFIG_CREATE',
        'tax_configurations',
        taxConfig.id,
        null,
        taxConfig,
      );
      return taxConfig;
    });
  }

  async findAllTaxConfigs() {
    return this.prisma.taxConfiguration.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneTaxConfig(id: string) {
    const taxConfig = await this.prisma.taxConfiguration.findUnique({
      where: { id },
    });
    if (!taxConfig) {
      throw new NotFoundException('Tax configuration not found');
    }
    return taxConfig;
  }

  async updateTaxConfig(id: string, dto: UpdateTaxConfigDto) {
    const oldTaxConfig = await this.findOneTaxConfig(id);
    const tenantId = this.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      // If toggling to active, deactivate others
      if (dto.isActive === true && !oldTaxConfig.isActive) {
        await tx.taxConfiguration.updateMany({
          where: { tenantId, isActive: true },
          data: { isActive: false },
        });
      }

      const updateData: any = {};
      if (dto.taxName !== undefined) updateData.taxName = dto.taxName;
      if (dto.cgst !== undefined) updateData.cgst = dto.cgst;
      if (dto.sgst !== undefined) updateData.sgst = dto.sgst;
      if (dto.igst !== undefined) updateData.igst = dto.igst;
      if (dto.effectiveFrom !== undefined)
        updateData.effectiveFrom = new Date(dto.effectiveFrom);
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      const taxConfig = await tx.taxConfiguration.update({
        where: { id },
        data: updateData,
      });

      await this.writeAuditLog(
        'TAX_CONFIG_UPDATE',
        'tax_configurations',
        id,
        oldTaxConfig,
        taxConfig,
      );
      return taxConfig;
    });
  }

  async activateTaxConfig(id: string) {
    const oldTaxConfig = await this.findOneTaxConfig(id);
    if (oldTaxConfig.isActive) {
      return oldTaxConfig;
    }

    const tenantId = this.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      // Deactivate all others
      await tx.taxConfiguration.updateMany({
        where: { tenantId, isActive: true },
        data: { isActive: false },
      });

      const taxConfig = await tx.taxConfiguration.update({
        where: { id },
        data: { isActive: true },
      });

      await this.writeAuditLog(
        'TAX_CONFIG_ACTIVATE',
        'tax_configurations',
        id,
        oldTaxConfig,
        taxConfig,
      );
      return taxConfig;
    });
  }

  async removeTaxConfig(id: string) {
    const taxConfig = await this.findOneTaxConfig(id);
    if (taxConfig.isActive) {
      throw new BadRequestException(
        'Active tax configurations cannot be deleted. Activate another configuration first.',
      );
    }

    await this.prisma.taxConfiguration.delete({
      where: { id },
    });

    await this.writeAuditLog(
      'TAX_CONFIG_DELETE',
      'tax_configurations',
      id,
      taxConfig,
      null,
    );
    return { success: true };
  }

  // =========================================================================
  // AUDIT LOGS
  // =========================================================================

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
      take: 50, // Limit to recent 50 changes
    });
  }
}
