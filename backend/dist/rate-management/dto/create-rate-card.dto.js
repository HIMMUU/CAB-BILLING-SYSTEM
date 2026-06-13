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
exports.CreateRateCardDto = void 0;
const class_validator_1 = require("class-validator");
class CreateRateCardDto {
}
exports.CreateRateCardDto = CreateRateCardDto;
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Customer ID must be a valid UUID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "customerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Client type is required' }),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "clientType", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Vehicle Category ID must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Vehicle Category is required' }),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "vehicleCategoryId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "halfDayRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "fullDayRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "includedKm", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "extraKmRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "extraHourRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "minKmPerDay", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "outstationRatePerKm", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "driverAllowance", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "nightCharge", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "nightStartTime", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "nightEndTime", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Effective date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "effectiveFrom", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRateCardDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "minHr", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "minKm", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "fullHr", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "fullKm", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRateCardDto.prototype, "outstationNightCharge", void 0);
//# sourceMappingURL=create-rate-card.dto.js.map