"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateManagementModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const rate_management_controller_1 = require("./rate-management.controller");
const rate_management_service_1 = require("./rate-management.service");
let RateManagementModule = class RateManagementModule {
};
exports.RateManagementModule = RateManagementModule;
exports.RateManagementModule = RateManagementModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [rate_management_controller_1.RateManagementController],
        providers: [rate_management_service_1.RateManagementService],
        exports: [rate_management_service_1.RateManagementService],
    })
], RateManagementModule);
//# sourceMappingURL=rate-management.module.js.map