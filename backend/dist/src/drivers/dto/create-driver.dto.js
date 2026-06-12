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
exports.CreateDriverDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateDriverDto {
    name;
    mobile;
    licenseNumber;
    licenseExpiry;
    address;
    emergencyContact;
    status;
}
exports.CreateDriverDto = CreateDriverDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Name is required' }),
    __metadata("design:type", String)
], CreateDriverDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Mobile number is required' }),
    (0, class_validator_1.Matches)(/^\+?[0-9]{10,15}$/, { message: 'Mobile number must be a valid 10-15 digit string' }),
    __metadata("design:type", String)
], CreateDriverDto.prototype, "mobile", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'License number is required' }),
    __metadata("design:type", String)
], CreateDriverDto.prototype, "licenseNumber", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'License expiry must be a valid ISO date string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'License expiry date is required' }),
    __metadata("design:type", String)
], CreateDriverDto.prototype, "licenseExpiry", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Address is required' }),
    __metadata("design:type", String)
], CreateDriverDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Emergency contact details are required' }),
    __metadata("design:type", String)
], CreateDriverDto.prototype, "emergencyContact", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.DriverStatus, { message: 'Status must be AVAILABLE, ON_TRIP, or INACTIVE' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateDriverDto.prototype, "status", void 0);
//# sourceMappingURL=create-driver.dto.js.map