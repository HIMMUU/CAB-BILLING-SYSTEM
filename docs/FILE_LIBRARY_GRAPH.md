# Relevant File-to-Library Graph

This file summarizes the most important source files and the primary libraries/frameworks they depend on.

## Backend runtime graph

```mermaid
graph TD
  main[backend/src/main.ts] --> nest[NestJS Core]
  main --> appmod[backend/src/app.module.ts]
  appmod --> config[@nestjs/config]
  appmod --> throttler[@nestjs/throttler]
  appmod --> prisma[backend/src/prisma/prisma.module.ts]
  appmod --> auth[backend/src/auth/auth.module.ts]
  appmod --> bookings[backend/src/bookings/bookings.module.ts]
  appmod --> customers[backend/src/customers/customers.module.ts]
  appmod --> drivers[backend/src/drivers/drivers.module.ts]
  appmod --> vehicles[backend/src/vehicles/vehicles.module.ts]
  appmod --> assignments[backend/src/assignments/assignments.module.ts]
  appmod --> invoice[backend/src/invoices/invoices.module.ts]
  appmod --> payment[backend/src/payments/payments.module.ts]
  appmod --> reports[backend/src/reports/reports.module.ts]
  appmod --> dashboard[backend/src/dashboard/dashboard.module.ts]
  appmod --> rate[backend/src/rate-management/rate-management.module.ts]
  appmod --> tenantSettings[backend/src/tenant-settings/tenant-settings.module.ts]
  appmod --> superAdmin[backend/src/super-admin/super-admin.module.ts]
  appmod --> health[backend/src/health/health.module.ts]

  auth --> jwt[@nestjs/jwt]
  auth --> bcrypt[bcryptjs]
  auth --> prismaSvc[backend/src/prisma/prisma.service.ts]
  auth --> usermod[backend/src/auth/auth.service.ts]

  prisma --> prismaSvc
  prismaSvc --> prismaClient[@prisma/client]
  prismaSvc --> tenantctx[backend/src/common/context/tenant-context.service.ts]

  bookings --> bookingSvc[backend/src/bookings/bookings.service.ts]
  bookingSvc --> prismaSvc
  bookingSvc --> prismaEnums[@prisma/client]

  customers --> custSvc[backend/src/customers/customers.service.ts]
  drivers --> driverSvc[backend/src/drivers/drivers.service.ts]
  vehicles --> vehicleSvc[backend/src/vehicles/vehicles.service.ts]
  assignments --> assignSvc[backend/src/assignments/assignments.service.ts]
  invoices --> invoiceSvc[backend/src/invoices/invoices.service.ts]
  payments --> paymentSvc[backend/src/payments/payments.service.ts]
  reports --> reportSvc[backend/src/reports/reports.service.ts]
  dashboard --> dashSvc[backend/src/dashboard/dashboard.service.ts]
  rate --> rateSvc[backend/src/rate-management/rate-management.service.ts]
  tenantSettings --> tenantSvc[backend/src/tenant-settings/tenant-settings.service.ts]
  superAdmin --> superSvc[backend/src/super-admin/super-admin.controller.ts]
  health --> healthC[backend/src/health/health.controller.ts]
```

## Frontend runtime graph

```mermaid
graph TD
  page[frontend/src/app/* pages] --> api[frontend/src/lib/api.ts]
  login[frontend/src/app/login/page.tsx] --> api
  register[frontend/src/app/register/page.tsx] --> api
  dashboard[frontend/src/app/dashboard/* pages] --> api
  settings[frontend/src/app/dashboard/settings/page.tsx] --> api
  reports[frontend/src/app/dashboard/reports/page.tsx] --> api

  api --> fetch[fetch / browser API]
  api --> localStorage[localStorage]
  api --> authRefresh[/auth/refresh]
  api --> backend[Backend REST API /api/v1]
  backend --> controllers[Backend controllers]
  controllers --> services[Backend services]
  services --> prisma[backend/src/prisma/prisma.service.ts]
  prisma --> db[(Database)]
```

## Key security and tenant context layer

```mermaid
graph TD
  middleware[backend/src/common/middleware/tenant-context.middleware.ts] --> jwt[@nestjs/jwt]
  middleware --> tenantCtx[backend/src/common/context/tenant-context.service.ts]
  tenantCtx --> prismaSvc[backend/src/prisma/prisma.service.ts]

  guardRole[backend/src/common/guards/roles.guard.ts] --> tenantCtx
  guardPerm[backend/src/common/guards/permissions.guard.ts] --> tenantCtx
  guardTenant[backend/src/common/guards/tenant.guard.ts] --> tenantCtx

  decoratorRole[backend/src/common/decorators/roles.decorator.ts] --> guardRole
  decoratorPerm[backend/src/common/decorators/permissions.decorator.ts] --> guardPerm
```

## File / library mapping summary

| File | Primary library/framework | Role |
|---|---|---|
| backend/src/main.ts | NestJS Core | Bootstraps the application |
| backend/src/app.module.ts | NestJS | Root module and global middleware/guards |
| backend/src/prisma/prisma.service.ts | Prisma Client | Tenant-aware database access layer |
| backend/src/auth/auth.service.ts | NestJS JWT + bcryptjs | Auth, tenant creation, token issuance |
| backend/src/bookings/bookings.service.ts | Prisma Client + NestJS | Booking lifecycle + assignment + duty slip logic |
| backend/src/common/context/tenant-context.service.ts | Node AsyncLocalStorage | Request-scoped tenant/user context |
| backend/src/common/middleware/tenant-context.middleware.ts | NestJS + JWT | Parses bearer tokens and sets tenant context |
| backend/src/common/guards/roles.guard.ts | NestJS | Role enforcement |
| backend/src/common/guards/permissions.guard.ts | NestJS | Permission enforcement |
| backend/src/common/guards/tenant.guard.ts | NestJS | Tenant access enforcement |
| frontend/src/lib/api.ts | fetch + browser storage | Shared API client and token refresh logic |
| frontend/src/app/login/page.tsx | Next.js + api client | Login UI |
| frontend/src/app/register/page.tsx | Next.js + api client | Registration UI |
| frontend/src/app/dashboard/* | Next.js + api client | Dashboard feature pages |
| prisma/schema.prisma | Prisma ORM | Database schema and model definitions |
| backend/prisma/schema.prisma | Prisma ORM | Backend Prisma schema mirror |
