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
exports.UpdateVehicleDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class UpdateVehicleDto {
}
exports.UpdateVehicleDto = UpdateVehicleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVehicleDto.prototype, "vehicleNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVehicleDto.prototype, "vehicleType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVehicleDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: 'Seating capacity must be a whole number' }),
    (0, class_validator_1.Min)(1, { message: 'Seating capacity must be at least 1' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateVehicleDto.prototype, "seatingCapacity", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Registration date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVehicleDto.prototype, "registrationDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Insurance expiry date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVehicleDto.prototype, "insuranceExpiry", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Fitness expiry date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVehicleDto.prototype, "fitnessExpiry", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Permit expiry date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVehicleDto.prototype, "permitExpiry", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.VehicleStatus, { message: 'Status must be AVAILABLE, ON_TRIP, MAINTENANCE, or INACTIVE' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVehicleDto.prototype, "status", void 0);
//# sourceMappingURL=update-vehicle.dto.js.map