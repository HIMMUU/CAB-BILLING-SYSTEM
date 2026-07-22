import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dletrtogt',
  api_key: process.env.CLOUDINARY_API_KEY || '332573535758619',
  api_secret:
    process.env.CLOUDINARY_API_SECRET || 'NIq4rqo-RcgvVdAndbxfwB5T12s',
});

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

    if (dto.invoiceStartingNumber !== undefined && dto.invoiceStartingNumber !== null) {
      dto.invoiceStartingNumber = Number(dto.invoiceStartingNumber) || 1001;
    }
    if (dto.bookingStartingNumber !== undefined && dto.bookingStartingNumber !== null) {
      dto.bookingStartingNumber = Number(dto.bookingStartingNumber) || 1001;
    }
    if (dto.dutySlipStartingNumber !== undefined && dto.dutySlipStartingNumber !== null) {
      dto.dutySlipStartingNumber = Number(dto.dutySlipStartingNumber) || 1001;
    }
    if (dto.fiscalYearStartMonth !== undefined && dto.fiscalYearStartMonth !== null) {
      dto.fiscalYearStartMonth = Number(dto.fiscalYearStartMonth) || 4;
    }

    if (dto.companyGst === '') {
      dto.companyGst = null as any;
    }
    if (dto.companyPan === '') {
      dto.companyPan = null as any;
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

  async uploadImage(file: any): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'tenant_uploads',
        },
        (error, result) => {
          if (error) {
            return reject(
              new BadRequestException(
                `Cloudinary upload failed: ${error.message}`,
              ),
            );
          }
          if (!result) {
            return reject(
              new BadRequestException('Cloudinary upload returned no result'),
            );
          }
          resolve({ url: result.secure_url });
        },
      );

      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  async resetFiscalYear(body: {
    newFiscalYear?: string;
    resetInvoices?: boolean;
    newInvoiceStartingNumber?: number;
    newInvoicePrefix?: string;
    resetBookings?: boolean;
    newBookingStartingNumber?: number;
    newBookingPrefix?: string;
    resetDutySlips?: boolean;
    newDutySlipStartingNumber?: number;
    newDutySlipPrefix?: string;
  }) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('No active tenant context found');
    }

    const data: any = {};
    if (body.newFiscalYear) {
      data.currentFiscalYear = body.newFiscalYear;
    }

    if (body.resetInvoices !== false) {
      data.invoiceStartingNumber = body.newInvoiceStartingNumber !== undefined ? body.newInvoiceStartingNumber : 1001;
      if (body.newInvoicePrefix) data.invoicePrefix = body.newInvoicePrefix;
    }

    if (body.resetBookings !== false) {
      data.bookingStartingNumber = body.newBookingStartingNumber !== undefined ? body.newBookingStartingNumber : 1001;
      if (body.newBookingPrefix) data.bookingPrefix = body.newBookingPrefix;
    }

    if (body.resetDutySlips !== false) {
      data.dutySlipStartingNumber = body.newDutySlipStartingNumber !== undefined ? body.newDutySlipStartingNumber : 1001;
      if (body.newDutySlipPrefix) data.dutySlipPrefix = body.newDutySlipPrefix;
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }
}
