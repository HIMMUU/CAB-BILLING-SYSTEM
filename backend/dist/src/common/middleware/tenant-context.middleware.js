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
exports.TenantContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const tenant_context_service_1 = require("../context/tenant-context.service");
let TenantContextMiddleware = class TenantContextMiddleware {
    jwtService;
    tenantContextService;
    constructor(jwtService, tenantContextService) {
        this.jwtService = jwtService;
        this.tenantContextService = tenantContextService;
    }
    use(req, res, next) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = this.jwtService.verify(token);
                const store = {
                    tenantId: payload.tenantId,
                    user: {
                        id: payload.sub,
                        email: payload.email,
                        role: payload.role,
                        tenantId: payload.tenantId,
                    },
                };
                req.user = store.user;
                return this.tenantContextService.runWithContext(store, () => next());
            }
            catch (error) {
                return this.tenantContextService.runWithContext({}, () => next());
            }
        }
        return this.tenantContextService.runWithContext({}, () => next());
    }
};
exports.TenantContextMiddleware = TenantContextMiddleware;
exports.TenantContextMiddleware = TenantContextMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        tenant_context_service_1.TenantContextService])
], TenantContextMiddleware);
//# sourceMappingURL=tenant-context.middleware.js.map