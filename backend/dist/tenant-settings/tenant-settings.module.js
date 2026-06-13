"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantSettingsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const tenant_settings_service_1 = require("./tenant-settings.service");
const tenant_settings_controller_1 = require("./tenant-settings.controller");
let TenantSettingsModule = class TenantSettingsModule {
};
exports.TenantSettingsModule = TenantSettingsModule;
exports.TenantSettingsModule = TenantSettingsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [tenant_settings_service_1.TenantSettingsService],
        controllers: [tenant_settings_controller_1.TenantSettingsController],
        exports: [tenant_settings_service_1.TenantSettingsService],
    })
], TenantSettingsModule);
//# sourceMappingURL=tenant-settings.module.js.map