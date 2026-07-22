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
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const tenant_context_service_1 = require("../common/context/tenant-context.service");
let PrismaService = class PrismaService extends client_1.PrismaClient {
    constructor(tenantContext) {
        super();
        this.tenantContext = tenantContext;
        const self = this;
        this._extendedClient = this.$extends({
            query: {
                $allModels: {
                    async $allOperations({ model, operation, args, query }) {
                        const tenantIsolatedModels = [
                            'Customer',
                            'RateCard',
                            'Driver',
                            'DriverDocument',
                            'Vehicle',
                            'Booking',
                            'Assignment',
                            'DutySlip',
                            'Trip',
                            'Invoice',
                            'InvoiceItem',
                            'Payment',
                            'AuditLog',
                            'User',
                            'TaxConfiguration',
                        ];
                        const anyArgs = args;
                        if (tenantIsolatedModels.includes(model)) {
                            let tenantId = tenantContext.getTenantId();
                            if (!tenantId &&
                                ['create', 'createMany', 'upsert'].includes(operation)) {
                                let providedTenantId;
                                if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
                                    providedTenantId = anyArgs.data[0]?.tenantId;
                                }
                                else if (operation === 'upsert') {
                                    providedTenantId =
                                        anyArgs.create?.tenantId ||
                                            anyArgs.create?.tenant?.connect?.id;
                                }
                                else {
                                    providedTenantId =
                                        anyArgs.data?.tenantId || anyArgs.data?.tenant?.connect?.id;
                                }
                                if (providedTenantId) {
                                    tenantId = providedTenantId;
                                }
                                else {
                                    const firstTenant = await self.tenant.findFirst({
                                        select: { id: true },
                                    });
                                    if (firstTenant) {
                                        tenantId = firstTenant.id;
                                    }
                                }
                            }
                            if (tenantId) {
                                if (operation === 'findUnique' ||
                                    operation === 'findUniqueOrThrow') {
                                    const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
                                    const extendedModel = self._extendedClient[modelKey];
                                    if (extendedModel) {
                                        const newArgs = { ...args };
                                        const whereKeys = Object.keys(newArgs.where || {});
                                        const hasValidUniqueKey = whereKeys.some((key) => newArgs.where[key] !== undefined &&
                                            newArgs.where[key] !== null);
                                        if (!hasValidUniqueKey) {
                                            return query(anyArgs);
                                        }
                                        newArgs.where = { ...(newArgs.where || {}), tenantId };
                                        if (operation === 'findUnique') {
                                            return extendedModel.findFirst(newArgs);
                                        }
                                        else {
                                            return extendedModel.findFirstOrThrow(newArgs);
                                        }
                                    }
                                }
                                if (operation === 'update' || operation === 'delete') {
                                    const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
                                    const extendedModel = self._extendedClient[modelKey];
                                    const dbModel = self[modelKey];
                                    if (extendedModel && dbModel) {
                                        const whereKeys = Object.keys(args?.where || {});
                                        const hasValidUniqueKey = whereKeys.some((key) => args.where[key] !== undefined &&
                                            args.where[key] !== null);
                                        if (!hasValidUniqueKey) {
                                            return query(anyArgs);
                                        }
                                        const exists = await extendedModel.findFirst({
                                            where: { ...(args?.where || {}) },
                                            select: { id: true },
                                        });
                                        if (!exists) {
                                            const error = new Error(`Record to ${operation} not found.`);
                                            error.code = 'P2025';
                                            throw error;
                                        }
                                        return dbModel[operation](args);
                                    }
                                }
                                if ([
                                    'findFirst',
                                    'findMany',
                                    'findFirstOrThrow',
                                    'count',
                                    'aggregate',
                                    'groupBy',
                                ].includes(operation)) {
                                    anyArgs.where = anyArgs.where || {};
                                    anyArgs.where.tenantId = tenantId;
                                }
                                else if (['updateMany', 'deleteMany'].includes(operation)) {
                                    anyArgs.where = anyArgs.where || {};
                                    anyArgs.where.tenantId = tenantId;
                                }
                                else if (operation === 'create') {
                                    anyArgs.data = anyArgs.data || {};
                                    anyArgs.data.tenantId = tenantId;
                                }
                                else if (operation === 'createMany') {
                                    if (Array.isArray(anyArgs.data)) {
                                        anyArgs.data.forEach((item) => {
                                            item.tenantId = tenantId;
                                        });
                                    }
                                    else {
                                        anyArgs.data = anyArgs.data || {};
                                        anyArgs.data.tenantId = tenantId;
                                    }
                                }
                                else if (operation === 'upsert') {
                                    anyArgs.where = anyArgs.where || {};
                                    anyArgs.where.tenantId = tenantId;
                                    anyArgs.create = anyArgs.create || {};
                                    anyArgs.create.tenantId = tenantId;
                                    anyArgs.update = anyArgs.update || {};
                                    anyArgs.update.tenantId = tenantId;
                                }
                            }
                        }
                        return query(anyArgs);
                    },
                },
            },
        });
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                const localProps = [
                    'onModuleInit',
                    'onModuleDestroy',
                    'tenantContext',
                    '_extendedClient',
                    'constructor',
                    'then',
                ];
                if (typeof prop === 'symbol' || localProps.includes(prop)) {
                    const value = Reflect.get(target, prop, receiver);
                    if (typeof value === 'function') {
                        return value.bind(target);
                    }
                    return value;
                }
                const value = Reflect.get(target._extendedClient, prop);
                if (typeof value === 'function') {
                    return value.bind(target._extendedClient);
                }
                return value;
            },
        });
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map