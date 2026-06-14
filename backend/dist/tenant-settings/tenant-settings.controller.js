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
exports.TenantSettingsController = void 0;
const common_1 = require("@nestjs/common");
const tenant_settings_service_1 = require("./tenant-settings.service");
const update_tenant_settings_dto_1 = require("./dto/update-tenant-settings.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_1 = require("../common/constants/permissions");
const platform_express_1 = require("@nestjs/platform-express");
let TenantSettingsController = class TenantSettingsController {
    constructor(tenantSettingsService) {
        this.tenantSettingsService = tenantSettingsService;
    }
    getSettings() {
        return this.tenantSettingsService.getSettings();
    }
    updateSettings(dto) {
        return this.tenantSettingsService.updateSettings(dto);
    }
    uploadFile(file) {
        return this.tenantSettingsService.uploadImage(file);
    }
};
exports.TenantSettingsController = TenantSettingsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_VIEW),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TenantSettingsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)(),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_tenant_settings_dto_1.UpdateTenantSettingsDto]),
    __metadata("design:returntype", void 0)
], TenantSettingsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenantSettingsController.prototype, "uploadFile", null);
exports.TenantSettingsController = TenantSettingsController = __decorate([
    (0, common_1.Controller)('tenant-settings'),
    __metadata("design:paramtypes", [tenant_settings_service_1.TenantSettingsService])
], TenantSettingsController);
//# sourceMappingURL=tenant-settings.controller.js.map