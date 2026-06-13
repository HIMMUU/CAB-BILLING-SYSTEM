import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

@Injectable()
export class TenantSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getSettings() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('No active tenant context found');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateSettings(dto: UpdateTenantSettingsDto) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('No active tenant context found');
    }

    // Auto-derive PAN from GSTIN if GSTIN is updated and PAN is not explicitly provided
    if (dto.companyGst && !dto.companyPan) {
      // PAN is characters 3 to 12 (0-indexed 2 to 12) of a 15-character Indian GSTIN
      if (dto.companyGst.length === 15) {
        dto.companyPan = dto.companyGst.substring(2, 12);
      }
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });

    return updated;
  }
}
