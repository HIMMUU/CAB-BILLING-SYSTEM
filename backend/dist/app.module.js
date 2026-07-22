"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const customers_module_1 = require("./customers/customers.module");
const drivers_module_1 = require("./drivers/drivers.module");
const vehicles_module_1 = require("./vehicles/vehicles.module");
const bookings_module_1 = require("./bookings/bookings.module");
const assignments_module_1 = require("./assignments/assignments.module");
const duty_slips_module_1 = require("./duty-slips/duty-slips.module");
const trips_module_1 = require("./trips/trips.module");
const invoices_module_1 = require("./invoices/invoices.module");
const payments_module_1 = require("./payments/payments.module");
const reports_module_1 = require("./reports/reports.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const rate_management_module_1 = require("./rate-management/rate-management.module");
const tenant_settings_module_1 = require("./tenant-settings/tenant-settings.module");
const tenant_context_middleware_1 = require("./common/middleware/tenant-context.middleware");
const tenant_guard_1 = require("./common/guards/tenant.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const permissions_guard_1 = require("./common/guards/permissions.guard");
const super_admin_module_1 = require("./super-admin/super-admin.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(tenant_context_middleware_1.TenantContextMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            customers_module_1.CustomersModule,
            drivers_module_1.DriversModule,
            vehicles_module_1.VehiclesModule,
            bookings_module_1.BookingsModule,
            assignments_module_1.AssignmentsModule,
            duty_slips_module_1.DutySlipsModule,
            trips_module_1.TripsModule,
            invoices_module_1.InvoicesModule,
            payments_module_1.PaymentsModule,
            reports_module_1.ReportsModule,
            dashboard_module_1.DashboardModule,
            rate_management_module_1.RateManagementModule,
            tenant_settings_module_1.TenantSettingsModule,
            super_admin_module_1.SuperAdminModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: tenant_guard_1.TenantGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: permissions_guard_1.PermissionsGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map