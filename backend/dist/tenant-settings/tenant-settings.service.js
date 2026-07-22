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
exports.TenantSettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tenant_context_service_1 = require("../common/context/tenant-context.service");
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dletrtogt',
    api_key: process.env.CLOUDINARY_API_KEY || '332573535758619',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'NIq4rqo-RcgvVdAndbxfwB5T12s',
});
let TenantSettingsService = class TenantSettingsService {
    constructor(prisma, tenantContext) {
        this.prisma = prisma;
        this.tenantContext = tenantContext;
    }
    async getSettings() {
        const tenantId = this.tenantContext.getTenantId();
        if (!tenantId) {
            throw new common_1.NotFoundException('No active tenant context found');
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        return tenant;
    }
    async updateSettings(dto) {
        const tenantId = this.tenantContext.getTenantId();
        if (!tenantId) {
            throw new common_1.NotFoundException('No active tenant context found');
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
            dto.companyGst = null;
        }
        if (dto.companyPan === '') {
            dto.companyPan = null;
        }
        if (dto.companyGst && !dto.companyPan) {
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
    async uploadImage(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: 'tenant_uploads',
            }, (error, result) => {
                if (error) {
                    return reject(new common_1.BadRequestException(`Cloudinary upload failed: ${error.message}`));
                }
                if (!result) {
                    return reject(new common_1.BadRequestException('Cloudinary upload returned no result'));
                }
                resolve({ url: result.secure_url });
            });
            const stream = new stream_1.Readable();
            stream.push(file.buffer);
            stream.push(null);
            stream.pipe(uploadStream);
        });
    }
    async resetFiscalYear(body) {
        const tenantId = this.tenantContext.getTenantId();
        if (!tenantId) {
            throw new common_1.NotFoundException('No active tenant context found');
        }
        const data = {};
        if (body.newFiscalYear) {
            data.currentFiscalYear = body.newFiscalYear;
        }
        if (body.resetInvoices !== false) {
            data.invoiceStartingNumber = body.newInvoiceStartingNumber !== undefined ? body.newInvoiceStartingNumber : 1001;
            if (body.newInvoicePrefix)
                data.invoicePrefix = body.newInvoicePrefix;
        }
        if (body.resetBookings !== false) {
            data.bookingStartingNumber = body.newBookingStartingNumber !== undefined ? body.newBookingStartingNumber : 1001;
            if (body.newBookingPrefix)
                data.bookingPrefix = body.newBookingPrefix;
        }
        if (body.resetDutySlips !== false) {
            data.dutySlipStartingNumber = body.newDutySlipStartingNumber !== undefined ? body.newDutySlipStartingNumber : 1001;
            if (body.newDutySlipPrefix)
                data.dutySlipPrefix = body.newDutySlipPrefix;
        }
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data,
        });
    }
};
exports.TenantSettingsService = TenantSettingsService;
exports.TenantSettingsService = TenantSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenant_context_service_1.TenantContextService])
], TenantSettingsService);
//# sourceMappingURL=tenant-settings.service.js.map