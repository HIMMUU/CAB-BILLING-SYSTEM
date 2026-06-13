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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_1 = require("../common/constants/permissions");
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
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map