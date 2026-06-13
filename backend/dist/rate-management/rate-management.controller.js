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
exports.RateManagementController = void 0;
const common_1 = require("@nestjs/common");
const rate_management_service_1 = require("./rate-management.service");
const create_rate_card_dto_1 = require("./dto/create-rate-card.dto");
const update_rate_card_dto_1 = require("./dto/update-rate-card.dto");
const create_tax_config_dto_1 = require("./dto/create-tax-config.dto");
const update_tax_config_dto_1 = require("./dto/update-tax-config.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_1 = require("../common/constants/permissions");
let RateManagementController = class RateManagementController {
    constructor(rateManagementService) {
        this.rateManagementService = rateManagementService;
    }
    findAllCategories() {
        return this.rateManagementService.findAllCategories();
    }
    createRateCard(createRateCardDto) {
        return this.rateManagementService.createRateCard(createRateCardDto);
    }
    findAllRateCards(page, limit, search, clientType, customerId, vehicleCategoryId, effectiveDate) {
        return this.rateManagementService.findAllRateCards({
            page,
            limit,
            search,
            clientType,
            customerId,
            vehicleCategoryId,
            effectiveDate,
        });
    }
    exportRateCards() {
        return this.rateManagementService.exportRateCardsToCsv();
    }
    findOneRateCard(id) {
        return this.rateManagementService.findOneRateCard(id);
    }
    updateRateCard(id, updateRateCardDto) {
        return this.rateManagementService.updateRateCard(id, updateRateCardDto);
    }
    cloneRateCard(id) {
        return this.rateManagementService.cloneRateCard(id);
    }
    removeRateCard(id) {
        return this.rateManagementService.removeRateCard(id);
    }
    createTaxConfig(createTaxConfigDto) {
        return this.rateManagementService.createTaxConfig(createTaxConfigDto);
    }
    findAllTaxConfigs() {
        return this.rateManagementService.findAllTaxConfigs();
    }
    findOneTaxConfig(id) {
        return this.rateManagementService.findOneTaxConfig(id);
    }
    updateTaxConfig(id, updateTaxConfigDto) {
        return this.rateManagementService.updateTaxConfig(id, updateTaxConfigDto);
    }
    activateTaxConfig(id) {
        return this.rateManagementService.activateTaxConfig(id);
    }
    removeTaxConfig(id) {
        return this.rateManagementService.removeTaxConfig(id);
    }
    findAuditLogs() {
        return this.rateManagementService.findAuditLogs();
    }
};
exports.RateManagementController = RateManagementController;
__decorate([
    (0, common_1.Get)('categories'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_VIEW),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "findAllCategories", null);
__decorate([
    (0, common_1.Post)('rate-cards'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_rate_card_dto_1.CreateRateCardDto]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "createRateCard", null);
__decorate([
    (0, common_1.Get)('rate-cards'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_VIEW),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('clientType')),
    __param(4, (0, common_1.Query)('customerId')),
    __param(5, (0, common_1.Query)('vehicleCategoryId')),
    __param(6, (0, common_1.Query)('effectiveDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "findAllRateCards", null);
__decorate([
    (0, common_1.Get)('rate-cards/export'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_VIEW),
    (0, common_1.Header)('Content-Type', 'text/csv'),
    (0, common_1.Header)('Content-Disposition', 'attachment; filename="rate_cards.csv"'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "exportRateCards", null);
__decorate([
    (0, common_1.Get)('rate-cards/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_VIEW),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "findOneRateCard", null);
__decorate([
    (0, common_1.Patch)('rate-cards/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_rate_card_dto_1.UpdateRateCardDto]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "updateRateCard", null);
__decorate([
    (0, common_1.Post)('rate-cards/:id/clone'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "cloneRateCard", null);
__decorate([
    (0, common_1.Delete)('rate-cards/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "removeRateCard", null);
__decorate([
    (0, common_1.Post)('tax-configs'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tax_config_dto_1.CreateTaxConfigDto]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "createTaxConfig", null);
__decorate([
    (0, common_1.Get)('tax-configs'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_VIEW),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "findAllTaxConfigs", null);
__decorate([
    (0, common_1.Get)('tax-configs/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_VIEW),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "findOneTaxConfig", null);
__decorate([
    (0, common_1.Patch)('tax-configs/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_tax_config_dto_1.UpdateTaxConfigDto]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "updateTaxConfig", null);
__decorate([
    (0, common_1.Post)('tax-configs/:id/activate'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "activateTaxConfig", null);
__decorate([
    (0, common_1.Delete)('tax-configs/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_CRUD),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "removeTaxConfig", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.RATE_VIEW),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RateManagementController.prototype, "findAuditLogs", null);
exports.RateManagementController = RateManagementController = __decorate([
    (0, common_1.Controller)('rate-management'),
    __metadata("design:paramtypes", [rate_management_service_1.RateManagementService])
], RateManagementController);
//# sourceMappingURL=rate-management.controller.js.map