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
exports.AssignmentsController = void 0;
const common_1 = require("@nestjs/common");
const assignments_service_1 = require("./assignments.service");
const create_assignment_dto_1 = require("./dto/create-assignment.dto");
const update_assignment_status_dto_1 = require("./dto/update-assignment-status.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_1 = require("../common/constants/permissions");
const client_1 = require("@prisma/client");
let AssignmentsController = class AssignmentsController {
    constructor(assignmentsService) {
        this.assignmentsService = assignmentsService;
    }
    create(createAssignmentDto) {
        return this.assignmentsService.create(createAssignmentDto);
    }
    findAll(page, limit, search, status) {
        return this.assignmentsService.findAll({ page, limit, search, status });
    }
    findAvailableResources(bookingId) {
        return this.assignmentsService.findAvailableResources(bookingId);
    }
    updateStatus(id, updateAssignmentStatusDto) {
        return this.assignmentsService.updateStatus(id, updateAssignmentStatusDto);
    }
};
exports.AssignmentsController = AssignmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.ASSIGN_RESOURCES),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_assignment_dto_1.CreateAssignmentDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('available-resources'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.ASSIGN_RESOURCES),
    __param(0, (0, common_1.Query)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "findAvailableResources", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.ASSIGN_RESOURCES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_assignment_status_dto_1.UpdateAssignmentStatusDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "updateStatus", null);
exports.AssignmentsController = AssignmentsController = __decorate([
    (0, common_1.Controller)('assignments'),
    __metadata("design:paramtypes", [assignments_service_1.AssignmentsService])
], AssignmentsController);
//# sourceMappingURL=assignments.controller.js.map