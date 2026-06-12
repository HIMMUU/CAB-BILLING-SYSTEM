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
exports.UpdateDutySlipDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class UpdateDutySlipDto {
    reportingTime;
    startKm;
    endKm;
    toll;
    parking;
    nightCharges;
    driverAllowance;
    extraCharges;
    status;
}
exports.UpdateDutySlipDto = UpdateDutySlipDto;
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Reporting time must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateDutySlipDto.prototype, "reportingTime", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Start KM must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Start KM must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateDutySlipDto.prototype, "startKm", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'End KM must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'End KM must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateDutySlipDto.prototype, "endKm", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Toll must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Toll must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateDutySlipDto.prototype, "toll", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Parking must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Parking must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateDutySlipDto.prototype, "parking", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Night charges must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Night charges must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateDutySlipDto.prototype, "nightCharges", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Driver allowance must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Driver allowance must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateDutySlipDto.prototype, "driverAllowance", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Extra charges must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Extra charges must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateDutySlipDto.prototype, "extraCharges", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.DutySlipStatus, { message: 'Status must be DRAFT, FILLED, or CLOSED' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateDutySlipDto.prototype, "status", void 0);
//# sourceMappingURL=update-duty-slip.dto.js.map