"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutySlipsModule = void 0;
const common_1 = require("@nestjs/common");
const duty_slips_service_1 = require("./duty-slips.service");
const duty_slips_controller_1 = require("./duty-slips.controller");
const prisma_module_1 = require("../prisma/prisma.module");
let DutySlipsModule = class DutySlipsModule {
};
exports.DutySlipsModule = DutySlipsModule;
exports.DutySlipsModule = DutySlipsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [duty_slips_controller_1.DutySlipsController],
        providers: [duty_slips_service_1.DutySlipsService],
        exports: [duty_slips_service_1.DutySlipsService],
    })
], DutySlipsModule);
//# sourceMappingURL=duty-slips.module.js.map