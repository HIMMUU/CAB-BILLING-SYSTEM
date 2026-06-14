"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_1 = require("../common/constants/permissions");
const express = __importStar(require("express"));
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    getRevenueReport(startDate, endDate) {
        return this.reportsService.getRevenueReport(startDate, endDate);
    }
    getBookingReport(startDate, endDate) {
        return this.reportsService.getBookingReport(startDate, endDate);
    }
    getVehicleUtilization(startDate, endDate) {
        return this.reportsService.getVehicleUtilizationReport(startDate, endDate);
    }
    getDriversReport(startDate, endDate) {
        return this.reportsService.getDriverReport(startDate, endDate);
    }
    getOutstandingReport() {
        return this.reportsService.getOutstandingReport();
    }
    getBillRegister(gstOption, customerId, state, city, guestName, employeeId, billDateFrom, billDateTo, dutyDateFrom, dutyDateTo, monthOf, billCoverNo) {
        return this.reportsService.getBillRegisterData({
            gstOption,
            customerId,
            state,
            city,
            guestName,
            employeeId,
            billDateFrom,
            billDateTo,
            dutyDateFrom,
            dutyDateTo,
            monthOf,
            billCoverNo,
        });
    }
    async getBillRegisterPdf(gstOption, customerId, state, city, guestName, employeeId, billDateFrom, billDateTo, dutyDateFrom, dutyDateTo, monthOf, billCoverNo, res) {
        const pdfBuffer = await this.reportsService.generateBillRegisterPdf({
            gstOption,
            customerId,
            state,
            city,
            guestName,
            employeeId,
            billDateFrom,
            billDateTo,
            dutyDateFrom,
            dutyDateTo,
            monthOf,
            billCoverNo,
        });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="bill-register-${Date.now()}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });
        res.end(pdfBuffer);
    }
    getDutySlipRegister(customerId, driverId, vehicleId, status, startDate, endDate, guestName, employeeId, dutySlipFrom, dutySlipTo, vehicleOwnership, billingStatus, dutyType, state, city) {
        return this.reportsService.getDutySlipRegisterData({
            customerId,
            driverId,
            vehicleId,
            status,
            startDate,
            endDate,
            guestName,
            employeeId,
            dutySlipFrom,
            dutySlipTo,
            vehicleOwnership,
            billingStatus,
            dutyType,
            state,
            city,
        });
    }
    async getDutySlipRegisterPdf(customerId, driverId, vehicleId, status, startDate, endDate, guestName, employeeId, dutySlipFrom, dutySlipTo, vehicleOwnership, billingStatus, dutyType, state, city, res) {
        const pdfBuffer = await this.reportsService.generateDutySlipRegisterPdf({
            customerId,
            driverId,
            vehicleId,
            status,
            startDate,
            endDate,
            guestName,
            employeeId,
            dutySlipFrom,
            dutySlipTo,
            vehicleOwnership,
            billingStatus,
            dutyType,
            state,
            city,
        });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="duty-slip-register-${Date.now()}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });
        res.end(pdfBuffer);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('revenue'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.FINANCIAL_REPORTS),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getRevenueReport", null);
__decorate([
    (0, common_1.Get)('bookings'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.OPERATIONS_REPORTS),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getBookingReport", null);
__decorate([
    (0, common_1.Get)('vehicle-utilization'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.OPERATIONS_REPORTS),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getVehicleUtilization", null);
__decorate([
    (0, common_1.Get)('drivers'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.OPERATIONS_REPORTS),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getDriversReport", null);
__decorate([
    (0, common_1.Get)('outstanding'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.FINANCIAL_REPORTS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getOutstandingReport", null);
__decorate([
    (0, common_1.Get)('bill-register'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.FINANCIAL_REPORTS),
    __param(0, (0, common_1.Query)('gstOption')),
    __param(1, (0, common_1.Query)('customerId')),
    __param(2, (0, common_1.Query)('state')),
    __param(3, (0, common_1.Query)('city')),
    __param(4, (0, common_1.Query)('guestName')),
    __param(5, (0, common_1.Query)('employeeId')),
    __param(6, (0, common_1.Query)('billDateFrom')),
    __param(7, (0, common_1.Query)('billDateTo')),
    __param(8, (0, common_1.Query)('dutyDateFrom')),
    __param(9, (0, common_1.Query)('dutyDateTo')),
    __param(10, (0, common_1.Query)('monthOf')),
    __param(11, (0, common_1.Query)('billCoverNo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getBillRegister", null);
__decorate([
    (0, common_1.Get)('bill-register/pdf'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.FINANCIAL_REPORTS),
    __param(0, (0, common_1.Query)('gstOption')),
    __param(1, (0, common_1.Query)('customerId')),
    __param(2, (0, common_1.Query)('state')),
    __param(3, (0, common_1.Query)('city')),
    __param(4, (0, common_1.Query)('guestName')),
    __param(5, (0, common_1.Query)('employeeId')),
    __param(6, (0, common_1.Query)('billDateFrom')),
    __param(7, (0, common_1.Query)('billDateTo')),
    __param(8, (0, common_1.Query)('dutyDateFrom')),
    __param(9, (0, common_1.Query)('dutyDateTo')),
    __param(10, (0, common_1.Query)('monthOf')),
    __param(11, (0, common_1.Query)('billCoverNo')),
    __param(12, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getBillRegisterPdf", null);
__decorate([
    (0, common_1.Get)('duty-slip-register'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.OPERATIONS_REPORTS),
    __param(0, (0, common_1.Query)('customerId')),
    __param(1, (0, common_1.Query)('driverId')),
    __param(2, (0, common_1.Query)('vehicleId')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('guestName')),
    __param(7, (0, common_1.Query)('employeeId')),
    __param(8, (0, common_1.Query)('dutySlipFrom')),
    __param(9, (0, common_1.Query)('dutySlipTo')),
    __param(10, (0, common_1.Query)('vehicleOwnership')),
    __param(11, (0, common_1.Query)('billingStatus')),
    __param(12, (0, common_1.Query)('dutyType')),
    __param(13, (0, common_1.Query)('state')),
    __param(14, (0, common_1.Query)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getDutySlipRegister", null);
__decorate([
    (0, common_1.Get)('duty-slip-register/pdf'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.OPERATIONS_REPORTS),
    __param(0, (0, common_1.Query)('customerId')),
    __param(1, (0, common_1.Query)('driverId')),
    __param(2, (0, common_1.Query)('vehicleId')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('guestName')),
    __param(7, (0, common_1.Query)('employeeId')),
    __param(8, (0, common_1.Query)('dutySlipFrom')),
    __param(9, (0, common_1.Query)('dutySlipTo')),
    __param(10, (0, common_1.Query)('vehicleOwnership')),
    __param(11, (0, common_1.Query)('billingStatus')),
    __param(12, (0, common_1.Query)('dutyType')),
    __param(13, (0, common_1.Query)('state')),
    __param(14, (0, common_1.Query)('city')),
    __param(15, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getDutySlipRegisterPdf", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map