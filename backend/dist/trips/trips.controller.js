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
exports.TripsController = void 0;
const common_1 = require("@nestjs/common");
const trips_service_1 = require("./trips.service");
const close_trip_dto_1 = require("./dto/close-trip.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_1 = require("../common/constants/permissions");
const fs = __importStar(require("fs"));
let TripsController = class TripsController {
    constructor(tripsService) {
        this.tripsService = tripsService;
    }
    async closeTrip(closeTripDto) {
        try {
            fs.appendFileSync('/Users/mac/.gemini/antigravity-ide/scratch/error.log', `Received closeTripDto: ${JSON.stringify(closeTripDto)}\n`);
            return await this.tripsService.closeTrip(closeTripDto);
        }
        catch (err) {
            console.error('ERROR IN CLOSE TRIP:', err.message, err.stack);
            throw err;
        }
    }
    calculate(dutySlipId, endKm, startDateTime, endDateTime) {
        const start = startDateTime ? new Date(startDateTime) : undefined;
        const end = endDateTime ? new Date(endDateTime) : undefined;
        return this.tripsService.calculateTripCharges(dutySlipId, Number(endKm), start, end);
    }
    findAll(page, limit) {
        return this.tripsService.findAll({ page, limit });
    }
};
exports.TripsController = TripsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.CLOSE_TRIP),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [close_trip_dto_1.CloseTripDto]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "closeTrip", null);
__decorate([
    (0, common_1.Get)('calculate'),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.CLOSE_TRIP),
    __param(0, (0, common_1.Query)('dutySlipId')),
    __param(1, (0, common_1.Query)('endKm')),
    __param(2, (0, common_1.Query)('startDateTime')),
    __param(3, (0, common_1.Query)('endDateTime')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String, String]),
    __metadata("design:returntype", void 0)
], TripsController.prototype, "calculate", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], TripsController.prototype, "findAll", null);
exports.TripsController = TripsController = __decorate([
    (0, common_1.Controller)('trips'),
    __metadata("design:paramtypes", [trips_service_1.TripsService])
], TripsController);
//# sourceMappingURL=trips.controller.js.map