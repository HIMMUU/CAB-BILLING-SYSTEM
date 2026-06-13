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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let SuperAdminController = class SuperAdminController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTenants() {
        return this.prisma.tenant.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateTenant(id, body) {
        return this.prisma.tenant.update({
            where: { id },
            data: body,
        });
    }
    async getMetrics() {
        const tenants = await this.prisma.tenant.findMany();
        const totalTenants = tenants.length;
        const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;
        const suspendedTenants = tenants.filter((t) => t.status === 'SUSPENDED').length;
        let mrr = 0;
        tenants.forEach((t) => {
            if (t.status === 'ACTIVE') {
                if (t.subscriptionPlan === 'Starter')
                    mrr += 2999;
                else if (t.subscriptionPlan === 'Growth')
                    mrr += 6999;
                else if (t.subscriptionPlan === 'Enterprise')
                    mrr += 14999;
            }
        });
        const totalUsers = await this.prisma.user.count();
        const totalBookings = await this.prisma.booking.count();
        const totalInvoices = await this.prisma.invoice.count();
        return {
            totalTenants,
            activeTenants,
            suspendedTenants,
            mrr,
            totalUsers,
            totalBookings,
            totalInvoices,
        };
    }
};
exports.SuperAdminController = SuperAdminController;
__decorate([
    (0, common_1.Get)('tenants'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getTenants", null);
__decorate([
    (0, common_1.Patch)('tenants/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateTenant", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getMetrics", null);
exports.SuperAdminController = SuperAdminController = __decorate([
    (0, common_1.Controller)('super-admin'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuperAdminController);
//# sourceMappingURL=super-admin.controller.js.map