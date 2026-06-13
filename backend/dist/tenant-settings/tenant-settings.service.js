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
};
exports.TenantSettingsService = TenantSettingsService;
exports.TenantSettingsService = TenantSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenant_context_service_1.TenantContextService])
], TenantSettingsService);
//# sourceMappingURL=tenant-settings.service.js.map