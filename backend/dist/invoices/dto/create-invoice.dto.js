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
exports.CreateInvoiceDto = exports.GstType = void 0;
const class_validator_1 = require("class-validator");
var GstType;
(function (GstType) {
    GstType["INTRASTATE"] = "INTRASTATE";
    GstType["INTERSTATE"] = "INTERSTATE";
})(GstType || (exports.GstType = GstType = {}));
class CreateInvoiceDto {
}
exports.CreateInvoiceDto = CreateInvoiceDto;
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Trip ID must be a valid UUID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "tripId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(4, { each: true, message: 'Each Trip ID must be a valid UUID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateInvoiceDto.prototype, "tripIds", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Invoice date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "invoiceDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Due date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(GstType, { message: 'GST Type must be INTRASTATE or INTERSTATE' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'GST Type is required' }),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "gstType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'GST Rate must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'GST Rate cannot be negative' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateInvoiceDto.prototype, "gstRate", void 0);
//# sourceMappingURL=create-invoice.dto.js.map