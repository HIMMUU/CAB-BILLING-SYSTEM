"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TenantContextService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContextService = void 0;
const common_1 = require("@nestjs/common");
const async_hooks_1 = require("async_hooks");
let TenantContextService = class TenantContextService {
    static { TenantContextService_1 = this; }
    static asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
    runWithContext(store, callback) {
        return TenantContextService_1.asyncLocalStorage.run(store, callback);
    }
    getStore() {
        return TenantContextService_1.asyncLocalStorage.getStore();
    }
    getTenantId() {
        return this.getStore()?.tenantId;
    }
    getUser() {
        return this.getStore()?.user;
    }
};
exports.TenantContextService = TenantContextService;
exports.TenantContextService = TenantContextService = TenantContextService_1 = __decorate([
    (0, common_1.Injectable)()
], TenantContextService);
//# sourceMappingURL=tenant-context.service.js.map