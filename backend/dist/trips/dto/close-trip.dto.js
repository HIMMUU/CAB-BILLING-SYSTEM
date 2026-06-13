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
exports.CloseTripDto = void 0;
const class_validator_1 = require("class-validator");
class CloseTripDto {
}
exports.CloseTripDto = CloseTripDto;
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Duty Slip ID must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Duty Slip ID is required' }),
    __metadata("design:type", String)
], CloseTripDto.prototype, "dutySlipId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'End KM must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'End KM must be at least 0' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'End KM is required' }),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "endKm", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Toll must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Toll must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "toll", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Parking must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Parking must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "parking", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Driver allowance must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Driver allowance must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "driverAllowance", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Night charges must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Night charges must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "nightCharges", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Extra charges must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Extra charges must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "extraCharges", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Base fare charged must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Base fare charged must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "baseFareCharged", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Extra KM charged must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Extra KM charged must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "extraKmCharged", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Extra hours charged must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Extra hours charged must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "extraHoursCharged", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Misc charges charged must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Misc charges charged must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "miscChargesCharged", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Total amount must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Total amount must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "totalAmount", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Start date time must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CloseTripDto.prototype, "startDateTime", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'End date time must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CloseTripDto.prototype, "endDateTime", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'State Tax must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'State Tax must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "stateTax", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'MCD must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'MCD must be at least 0' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CloseTripDto.prototype, "mcd", void 0);
//# sourceMappingURL=close-trip.dto.js.map