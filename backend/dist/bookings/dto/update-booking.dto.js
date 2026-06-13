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
exports.UpdateBookingDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class UpdateBookingDto {
}
exports.UpdateBookingDto = UpdateBookingDto;
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Customer ID must be a valid UUID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "customerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "pickupLocation", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "dropLocation", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Pickup date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "pickupDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "pickupTime", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.TripType, { message: 'Trip type must be LOCAL, AIRPORT_TRANSFER, OUTSTATION, or HOURLY_RENTAL' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "tripType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "vehicleTypeRequired", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.BookingStatus, { message: 'Status must be PENDING, ASSIGNED, STARTED, COMPLETED, or CANCELLED' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "guestName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "guestSalutation", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "bookingBy", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBookingDto.prototype, "remarks", void 0);
//# sourceMappingURL=update-booking.dto.js.map