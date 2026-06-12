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
exports.CreateDutySlipDto = void 0;
const class_validator_1 = require("class-validator");
class CreateDutySlipDto {
    bookingId;
    reportingTime;
    startKm;
}
exports.CreateDutySlipDto = CreateDutySlipDto;
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Booking ID must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Booking ID is required' }),
    __metadata("design:type", String)
], CreateDutySlipDto.prototype, "bookingId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Reporting time must be a valid ISO date string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Reporting time is required' }),
    __metadata("design:type", String)
], CreateDutySlipDto.prototype, "reportingTime", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'Start KM must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Start KM must be at least 0' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Start KM is required' }),
    __metadata("design:type", Number)
], CreateDutySlipDto.prototype, "startKm", void 0);
//# sourceMappingURL=create-duty-slip.dto.js.map