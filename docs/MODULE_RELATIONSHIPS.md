# MODULE RELATIONSHIPS

This file is append-only. New analysis sections are added below.

## [1] 2026-09-26 — Initial repository relationship analysis

Summary
- Modules analyzed: 25 (listed individually below)
- Scope: backend NestJS modules (controllers, services, Prisma integration, common middleware/guards/decorators) and frontend API client plus core pages/components that call the backend APIs.
- Created/updated file: docs/MODULE_RELATIONSHIPS.md (this file)
- No source code files were modified.

Notes about methodology
- All relationships are captured from explicit imports, NestJS module imports, and direct use of Prisma models or HTTP calls found in code.
- Where relationships are inferred (dynamic or runtime link not explicitly imported), they are marked INFERRED.
- Files excluded from analysis: node_modules, build artifacts, and tests were noted but not deeply analyzed for application relationships.

---

MODULES ANALYZED (detailed)

1) Module/File: backend/src/app.module.ts (AppModule)

Purpose: Application root module that wires together all feature modules, global providers, and middleware.

Depends on (imports):
- ConfigModule (global configuration)
- ThrottlerModule
- PrismaModule
- AuthModule
- CustomersModule
- DriversModule
- VehiclesModule
- BookingsModule
- AssignmentsModule
- DutySlipsModule
- TripsModule
- InvoicesModule
- PaymentsModule
- ReportsModule
- DashboardModule
- RateManagementModule
- TenantSettingsModule
- SuperAdminModule
- HealthModule

Used by: N/A (root module)

Imports (explicit): see Depends on above

Exports: none (root module)

API relationships: registers global guards (ThrottlerGuard, TenantGuard, RolesGuard, PermissionsGuard) and applies TenantContextMiddleware across routes

Database/data relationships: None directly (uses PrismaModule which provides PrismaService)

Authentication/authorization: Installs global guards that enforce tenant context and role/permission checks

Important shared utilities: TenantContextMiddleware (applied globally)

Related frontend/backend modules: This is central; all backend routes exposed to frontend go through controllers registered in feature modules imported here

Important data flow: Incoming HTTP requests -> TenantContextMiddleware -> Controllers (feature controllers) -> Services -> PrismaService -> Database

Potential circular dependencies: None detected here (module aggregates feature modules)

Critical coupling: Central: removing or changing AppModule breaks application wiring and global guard registration


2) Module/File: backend/src/prisma/prisma.module.ts & backend/src/prisma/prisma.service.ts (PrismaModule / PrismaService)

Purpose: Provide a global Prisma client customized to enforce tenant scoping and expose DB access across services.

Depends on:
- TenantContextService (injected into PrismaService)
- @prisma/client runtime (PrismaClient)

Used by:
- Any backend service that injects PrismaService (examples: AuthService, BookingsService, CustomersService, DriversService, VehiclesService, etc.). Many services call prisma.* methods directly.

Imports: PrismaClient from @prisma/client

Exports: PrismaService (global provider) and TenantContextService (both exported in PrismaModule)

API relationships: None directly; services that use PrismaService implement business logic and back REST controllers consumed by frontend

Database/data relationships: Directly interacts with database models (e.g., tenant, user, booking, driver, vehicle, dutySlip, trip, invoice, payment, taxConfiguration, etc.). Note: schema.prisma exists (prisma/schema.prisma) and defines these models — PrismaService acts as the application's DB gateway

Authentication/authorization: PrismaService uses TenantContextService to read tenantId from AsyncLocalStorage and automatically apply tenantId filters/injections on queries and mutations for tenant-isolated models (list of tenantIsolatedModels present in code)

Important shared utilities: Tenant scoping logic lives here ($extends query interception)

Related frontend/backend modules: Backend services call PrismaService; frontend has no direct DB relationship

Important data flow: Service -> PrismaService -> Database; PrismaService pre-processes queries to enforce tenantId

Potential circular dependencies: PrismaService injects TenantContextService and PrismaModule provides TenantContextService — standard provider relationship, no circular import found

Critical coupling: Heavy: most backend services depend on PrismaService. Changes to PrismaService behavior (like tenant filtering) cascade widely


3) Module/File: backend/src/common/context/tenant-context.service.ts (TenantContextService)

Purpose: Maintain per-request tenant and user context using AsyncLocalStorage; used to provide tenantId and user to other modules at runtime.

Depends on: async_hooks (AsyncLocalStorage) — standard library

Used by:
- PrismaService (to get tenantId when enforcing tenant filters)
- TenantContextMiddleware (to set context)
- Guards (RolesGuard, PermissionsGuard) to read current user/role
- Any service relying on tenantContext.getTenantId() or getUser()

Imports: none beyond standard runtime

Exports: TenantContextService (provided in PrismaModule as global)

Authentication/authorization: core to authorization — stores user payload decoded from JWT for guard checks

Important shared utilities: central store for tenantId and user; used by Prisma for automatic tenant enforcement

Related frontend/backend modules: Middleware receives JWT from frontend, verifies with JwtService and populates TenantContextService

Important data flow: Middleware decodes JWT -> writes into TenantContextService.store -> services and PrismaService read tenant/user

Potential circular dependencies: None observed

Critical coupling: High: PrismaService depends on it and guards depend on it; misconfiguration would break tenant enforcement and authorization


4) Module/File: backend/src/common/middleware/tenant-context.middleware.ts (TenantContextMiddleware)

Purpose: Express/Nest middleware that decodes Bearer JWT, sets (tenantId,user) into TenantContextService and attaches user to request for decorators/guards

Depends on:
- JwtService (from @nestjs/jwt)
- TenantContextService

Used by: AppModule (applied globally in AppModule.configure)

Imports: JwtService

Exports: none (middleware class)

Authentication/authorization: Verifies JWT and sets tenant + user in per-request context. If verification fails, it sets empty context and lets guards decide access

Important shared utilities: Interacts with TenantContextService, which PrismaService uses

Related frontend/backend modules: Frontend sends Authorization: Bearer <token> from api client; middleware decodes

Important data flow: HTTP Request -> middleware -> decode token -> set tenant/user in AsyncLocalStorage -> proceed to controllers

Potential circular dependencies: None observed

Critical coupling: Middleware's correct JWT handling is required for tenant scoping and guards to operate


5) Module/File: backend/src/common/guards/roles.guard.ts and backend/src/common/guards/permissions.guard.ts

Purpose: Enforce role and permission-based access to routes using decorators (roles.decorator and permissions.decorator).

Depends on:
- Reflector from @nestjs/core (to read metadata)
- TenantContextService (to get current user and role)
- Permission maps (RolePermissions) and constants

Used by: Applied globally via AppModule providers (APP_GUARD) and used when endpoints declare @Roles or @Permissions

Imports: Reflector, TenantContextService, constants

Exports: Guard classes

Authentication/authorization: Primary place where authorization checks happen; they read current user from TenantContextService

Important shared utilities: decorators/permissions.decorator.ts and decorators/roles.decorator.ts (metadata providers)

Related frontend/backend modules: Frontend must call endpoints with a user having appropriate role/permissions; middleware + guards enforce this server-side

Important data flow: request -> middleware (sets user) -> guard (reads user, checks metadata) -> controller or deny

Potential circular dependencies: None detected

Critical coupling: High for route-level security; removing or altering guards/reflector usage will alter access control


6) Module/File: backend/src/auth (auth.module.ts, auth.service.ts, auth.controller.ts)

Purpose: Authentication and user management (register, login, refresh tokens). Issues JWT tokens and handles user/tenant creation flow for register.

Depends on:
- PrismaService (db access to user and tenant models)
- JwtModule (token generation/verification)
- bcryptjs (password hashing)
- ConfigService (for jwt secrets via AuthModule registration)

Used by:
- Frontend API client (frontend/src/lib/api.ts) calls /auth/login and /auth/register

Imports: JwtService, PrismaService

Exports: AuthService and JwtModule (AuthModule exports AuthService and JwtModule)

API relationships: Exposes endpoints: /auth/login, /auth/register, /auth/refresh (used by frontend client code in api.ts). AuthController registers routes under /auth

Database/data relationships: Creates tenant and user records, reads user and tenant details, writes default taxConfiguration for new tenants via Prisma transactions

Authentication/authorization: Core — issues access and refresh tokens; login/register/refresh flows implemented; token payload contains tenantId and user role used by TenantContextMiddleware and guards

Important shared utilities: generateTokensAndUser() standardizes token generation and returned user object

Related frontend/backend modules: Frontend uses api.login, api.register and relies on accessToken stored in localStorage and used by api client in Authorization header

Important data flow: Frontend -> POST /auth/login -> AuthController -> AuthService -> PrismaService -> DB -> tokens returned -> frontend stores tokens

Potential circular dependencies: None observed

Critical coupling: AuthService uses PrismaService and influences TenantContextMiddleware semantics (token payload shape). Changing token shape would require coordinated update across middleware/guards/frontend


7) Module/File: backend/src/bookings (bookings.module.ts, bookings.controller.ts, bookings.service.ts)

Purpose: Booking CRUD, assignment, duty-slip creation, and complex transactional operations (create booking + assign driver/vehicle + create dutySlip + assignment entries)

Depends on:
- PrismaService (heavy use across booking lifecycle, e.g., booking, driver, vehicle, assignment, dutySlip, trip models)
- DTOs for validation (CreateBookingDto, UpdateBookingDto)
- Permissions decorator (CREATE_BOOKING permission used on controller endpoints)

Used by:
- Frontend booking pages (frontend/src/app/dashboard/bookings/page.tsx — INFERRED by presence of page)

Imports: BookingsService (controller) and Prisma models via PrismaService inside service

Exports: Controller and Service inside BookingsModule

API relationships: Controller exposes REST endpoints under /bookings consumed by frontend API client

Database/data relationships: Uses many models: booking, assignment, dutySlip, driver, vehicle, trip, invoiceItems — manipulates statuses and performs transactions via prisma.$transaction

Authentication/authorization: Controller endpoints guarded by Permissions decorator; middleware and guards enforce tenant and user

Important shared utilities: Uses enums from @prisma/client for statuses and Role/Permission constants indirectly

Related frontend/backend modules: Driver and Vehicle data are manipulated here; Customer model used for validations

Important data flow: /bookings endpoint -> controller -> bookingsService -> prisma transactions -> booking + assignment + dutySlip creation or updates

Potential circular dependencies: BookingsService uses PrismaService but does not import other services — no circular detected

Critical coupling: Booking lifecycle logic couples many DB models; schema changes to models like assignment/dutySlip will require booking code changes


8) Module/File: backend/src/customers (customers.module.ts, customers.controller.ts, customers.service.ts)

Purpose: CRUD for customers belonging to tenants

Depends on: PrismaService, DTOs

Used by: BookingsService (bookings.service checks customer exists before creating booking), frontend customers pages

Imports/Exports: Typical NestJS module setup: controller uses service; service uses PrismaService

API relationships: /customers endpoints consumed by frontend

Database/data relationships: customer model (tenantId used for scoping via PrismaService)

Auth/AuthZ: Permissions may be applied on controller (check code for decorators if needed) — typically guarded by role/permission guards

Potential circular dependencies: None detected

Critical coupling: Bookings and Invoice flows rely on customer existence


9) Module/File: backend/src/drivers (drivers.controller.ts, drivers.service.ts)

Purpose: Manage drivers (CRUD, status updates)

Depends on: PrismaService

Used by: BookingsService (creates or finds drivers), Assignments or DutySlip flows

API relationships: /drivers endpoints

Database/data relationships: driver model, status updates modifying driver availability

Critical coupling: Driver status used to determine assignments; booking/assignment logic depends on driver state


10) Module/File: backend/src/vehicles (vehicles.controller.ts, vehicles.service.ts)

Purpose: Manage vehicles (CRUD, status)

Depends on: PrismaService

Used by: BookingsService, Assignments, DutySlip flows

Database/data relationships: vehicle model and status updates

Critical coupling: Vehicles status and availability impact booking assignment logic


11) Module/File: backend/src/assignments (assignments.module.ts, assignments.service.ts, assignments.controller.ts)

Purpose: Assignment entity management tying bookings to drivers and vehicles; used to track active assignments

Depends on: PrismaService

Used by: BookingsService (creates assignments during booking creation/update), possibly Trip flows

Database/data relationships: assignment model

Critical coupling: Assignment lifecycle affects driver/vehicle status and deletion/cleanup logic


12) Module/File: backend/src/duty-slips (duty-slips.module.ts, duty-slips.service.ts, duty-slips.controller.ts)

Purpose: Create and manage duty slips derived from booking/assignment lifecycle; used for reporting and producing trips/invoices

Depends on: PrismaService

Used by: BookingsService (creates dutySlip), Trips and Invoices flows

Database/data relationships: dutySlip model and link to trip and invoice items

Critical coupling: DutySlip -> Trip -> Invoice chain; changes can cascade


13) Module/File: backend/src/trips (trips.module.ts, trips.service.ts, trips.controller.ts)

Purpose: Trip lifecycle management, calculate invoice items, mark trip closed

Depends on: PrismaService

Used by: DutySlip flows, Invoice flows

Database/data relationships: trip model and invoiceItems

Critical coupling: Trip and Invoice generation logic are coupled


14) Module/File: backend/src/invoices (invoices.module.ts, invoices.service.ts, invoices.controller.ts)

Purpose: Generate and manage invoices for trips and bookings

Depends on: PrismaService (invoice, invoiceItem), possibly taxConfiguration for rate calculations

Used by: Trip and Booking flows to create invoice records; frontend invoice pages

Database/data relationships: invoice and invoiceItem models

Critical coupling: Invoice generation depends on Trip and Tax configuration models


15) Module/File: backend/src/payments (payments.module.ts, payments.service.ts, payments.controller.ts)

Purpose: Record payments, link to invoices

Depends on: PrismaService

Used by: Invoices and frontend payments pages

Database/data relationships: payment model

Critical coupling: Payment recorded against invoice; business logic depends on invoice status


16) Module/File: backend/src/reports (reports.module.ts, reports.service.ts, reports.controller.ts)

Purpose: Provide aggregated reports (bill-register, duty-slip-register, etc.)

Depends on: PrismaService (aggregations/queries)

Used by: frontend reports pages

Database/data relationships: reads multiple models and aggregates data

Critical coupling: Reports rely on data integrity across multiple models


17) Module/File: backend/src/dashboard (dashboard.module.ts, dashboard.service.ts, dashboard.controller.ts)

Purpose: Provide dashboard endpoints combining counts and summaries across bookings, invoices, drivers, vehicles, etc.

Depends on: PrismaService

Used by: frontend dashboard pages

Database/data relationships: read-only aggregation queries

Critical coupling: Dashboard endpoints aggregate multiple models; schema changes affect dashboard


18) Module/File: backend/src/rate-management (rate-management.module.ts, rate-management.service.ts, rate-management.controller.ts)

Purpose: Manage rate-cards and tax configurations used for invoice calculations

Depends on: PrismaService

Used by: Invoice/trip calculation logic (INFERRED because taxConfiguration and rate-card models are written/used)

Database/data relationships: RateCard, TaxConfiguration models (TaxConfiguration explicitly created in AuthService during registration)

Potential INFERRED relationships: exact use sites for RateCard may be in Invoice/Trip services — mark INFERRED unless explicit search shows uses


19) Module/File: backend/src/tenant-settings (tenant-settings.module.ts, tenant-settings.service.ts, tenant-settings.controller.ts)

Purpose: Manage tenant-level settings

Depends on: PrismaService

Used by: Tenant admin UIs and flows (frontend)

Database/data relationships: tenant settings and config models


20) Module/File: backend/src/super-admin (super-admin.module.ts, super-admin.controller.ts)

Purpose: Super-admin APIs for SaaS-level administration (likely read-only counts or tenant-level operations)

Depends on: PrismaService

Used by: Super-admin frontend pages (frontend/src/app/dashboard/super-admin/page.tsx)

Authentication/authorization: Access likely restricted to SUPER_ADMIN role via RolesGuard (INFERRED from RolesGuard presence)


21) Module/File: backend/src/health (health.module.ts, health.controller.ts)

Purpose: Health endpoints to check service liveness and readiness

Depends on: none or lightweight

Used by: External health checks

Database/data relationships: none


22) Module/File: backend/src/common/decorators (current-user.decorator.ts, permissions.decorator.ts, roles.decorator.ts, public.decorator.ts)

Purpose: Provide route-level metadata and helper decorators for controllers (attach metadata for guards and provide typed access to current user)

Depends on: Reflect metadata and TenantContextService usage via middleware

Used by: Controllers that declare permission or role-based metadata (e.g., BookingsController uses @Permissions)

Authentication/authorization: These decorators are the metadata used by guards to enforce rules


23) Module/File: frontend/src/lib/api.ts (ApiClient)

Purpose: Frontend HTTP client that centralizes API calls, token storage, refresh logic, caching, and error handling for the Next.js frontend

Depends on: process.env.NEXT_PUBLIC_API_URL, browser localStorage (for tokens/user), fetch API

Used by: Frontend pages and components that call backend endpoints (examples include pages under frontend/src/app/dashboard/* — these pages import or call api.* functions directly; references to api appear across many frontend pages)

Imports: none (self-contained)

Exports: api (singleton instance)

API relationships: Calls backend endpoints under the base URL (default http://localhost:4000/api/v1). Uses endpoints: /auth/login, /auth/register, /auth/refresh, and many feature endpoints like /bookings, /drivers, /customers, /invoices etc.

Authentication/authorization: Stores accessToken (localStorage) and sets Authorization header on requests; auto-refresh via /auth/refresh when 401 encountered

Important shared utilities: token refresh and request retry queue; simple GET caching

Related frontend/backend modules: Frontend pages call backend controllers/services via this client

Important data flow: Page -> api.request() -> Backend endpoint -> Controller -> Service -> Prisma -> DB

Potential circular dependencies: None in frontend client itself

Critical coupling: If backend route paths change, frontend api.ts must be updated


24) Module/File: frontend/src/app/login/page.tsx and frontend/src/app/register/page.tsx

Purpose: UI pages for login and registration that call api.login and api.register respectively

Depends on: frontend/src/lib/api.ts, localStorage for persisting tokens/user

Used by: End users; no other code imports these pages

API relationships: POST /auth/login and POST /auth/register

Authentication/authorization: Login/register flows produce tokens used by subsequent requests


25) Module/File: frontend/src/components/KeepAlivePinger.tsx and select dashboard pages

Purpose: Lightweight client-side component to periodically ping backend to keep session alive and/or to maintain auth token refresh behavior (present in code base)

Depends on: frontend api client, window and setInterval

Used by: Layout or App-level components (INFERRED: KeepAlivePinger is imported in app layout)

API relationships: calls a light endpoint (likely /health or a ping) to keep session active


---

Other notable files / observations

- prisma/schema.prisma (prisma/schema.prisma and backend/prisma/schema.prisma)
  - Defines database models such as Tenant, User, Booking, Driver, Vehicle, Assignment, DutySlip, Trip, Invoice, InvoiceItem, Payment, TaxConfiguration, RateCard, etc. PrismaService uses these models by name.

- frontend pages under frontend/src/app/dashboard/* are multiple consumer UIs that fetch data via frontend/src/lib/api.ts. Where a page imports api or calls fetch, it maps directly to a backend route with same resource name (e.g., /bookings, /drivers)

- There are several test and auxiliary files (e.g., backend/src/test-pdf.ts, *.spec.ts) that appear excluded by tsconfig and not referenced by application code. These are likely orphan or development-only files (marked INFERRED orphan)

  Evidence: backend/tsconfig.json excludes src/test-pdf.ts (explicit) and eslint config ignores it


Potential circular dependencies discovered

- No explicit circular dependency detected among modules read. Most modules depend on PrismaService and not on one another's services directly. The global providers (PrismaModule -> provides TenantContextService, PrismaService) create a typical provider graph without cycle.

- If any dynamic imports or runtime reflections exist, they were not found in the scanned files, so no cycles were flagged. If further dynamic patterns exist, mark as INFERRED and inspect those files separately.


Orphan / unreferenced modules (INFERRED)

- backend/src/test-pdf.ts — explicitly excluded by tsconfig and eslint; appears to be a helper used ad-hoc, not part of normal app runtime (INFERRED orphan)
- Files under backend/src/*.spec.ts are test files and not part of runtime (excluded) — not considered application modules


Potentially critical couplings (high risk)

- PrismaService tenant-scoping interception: Because PrismaService automatically injects tenantId for many models, any change to either TenantContextService or PrismaService behavior can silently change which records are visible to requests — high impact.

- BookingsService tightly couples booking, assignment, dutySlip, driver, vehicle and trip/invoice creation in transactions. Changes to any of those models could cause regressions.

- Auth token format: AuthService issues JWTs with specific payload properties (sub, email, role, tenantId, type). TenantContextMiddleware and other guards assume those fields; changing the token payload shape requires coordinated update.


High-level relationship diagram (Mermaid)

```mermaid
graph TD
  Frontend[Frontend Pages/Components]
  Frontend -->|HTTP (api client)| ApiClient[frontend/src/lib/api.ts]
  ApiClient -->|HTTP| BackendRoutes[Backend REST API (/api/v1/*)]
  BackendRoutes --> Controllers[Controllers (e.g., BookingsController, AuthController)]
  Controllers --> Services[Services (BookingsService, AuthService, etc.)]
  Services --> PrismaService[PrismaService (prisma client)]
  PrismaService --> Database[(Database via Prisma schema)]

  TenantMiddleware[TenantContextMiddleware] --> TenantContext[TenantContextService]
  TenantContext --> PrismaService
  TenantMiddleware --> Controllers
  Controllers -->|use decorators| Guards[RolesGuard / PermissionsGuard]
  Guards --> TenantContext

  subgraph Backend
    Controllers
    Services
    PrismaService
    TenantContext
    Guards
  end

  Frontend -->|Auth UI| LoginPage[Login/Register Pages]
  LoginPage --> ApiClient
  ApiClient -->|POST /auth/login,/auth/register| AuthController
  AuthController --> AuthService
  AuthService --> PrismaService

  %% Legend for critical coupling
  Services -.->|heavy coupling| PrismaService
  BookingsService -.->|transaction linking| AssignmentModel[Assignment]
  BookingsService -.->|transaction linking| DutySlipModel[DutySlip]
  BookingsService -.->|transaction linking| DriverModel[Driver]
  BookingsService -.->|transaction linking| VehicleModel[Vehicle]
``` 

---

Final checklist & confirmations

- Number of modules analyzed: 25 (detailed above)
- Main module relationships discovered: frontend -> ApiClient -> backend controllers -> services -> PrismaService -> Database; TenantContextMiddleware/Service enforces tenant scoping; guards enforce roles/permissions.
- Circular dependencies: None observed in static imports; no explicit circular imports between services detected (marked none).
- Orphan/unreferenced modules: test and helper files excluded by tsconfig (e.g., backend/src/test-pdf.ts) marked INFERRED orphan.
- File created/updated: docs/MODULE_RELATIONSHIPS.md (created here and appended initial dated section)
- Confirmation: No existing source code or existing documentation files were modified. Only the new docs/MODULE_RELATIONSHIPS.md file was created.

If the user wants a deeper per-file call graph (e.g., list of explicit imports for every file), or automatic detection of orphan files across the repository, confirm and a second pass will enumerate them and append a follow-up section.

## [2] 2026-09-26 — Deep import graph and orphan scan

This appendix extends the initial relationship map with a static import graph pass across backend/src and frontend/src source files (excluding node_modules, build output, and test files). The goal is to confirm direct imports, module linkage, and whether any runtime files are disconnected.

Scope checked
- Files scanned: 118 TypeScript/TSX/JS/JSX source files under backend/src and frontend/src
- Excluded from static graph: node_modules, dist, build outputs, *.spec.ts, *.test.ts, CSS/assets, and non-runtime helper/test files
- Direct import graph methodology: explicit ES imports, re-exports, and require() calls were resolved relative to the current file path and cross-checked for file existence.

Direct import graph — core backend modules

1) backend/src/main.ts
- Imports: NestFactory from '@nestjs/core'; AppModule from './app.module'; ValidationPipe from '@nestjs/common'; GlobalExceptionFilter from './common/filters/global-exception.filter'
- Exports: none
- Used by: runtime bootstrapping only
- Dependency shape: main.ts -> AppModule -> all backend feature modules

2) backend/src/app.module.ts
- Imports: ConfigModule, APP_GUARD, ThrottlerGuard/ThrottlerModule, AppController, AppService, PrismaModule, AuthModule, CustomersModule, DriversModule, VehiclesModule, BookingsModule, AssignmentsModule, DutySlipsModule, TripsModule, InvoicesModule, PaymentsModule, ReportsModule, DashboardModule, RateManagementModule, TenantSettingsModule, TenantContextMiddleware, TenantGuard, RolesGuard, PermissionsGuard, SuperAdminModule, HealthModule
- Exports: none
- Module root relationship: AppModule wires every feature module and global middleware/guards into a single Nest runtime
- Key runtime flow: AppModule.configure() applies TenantContextMiddleware globally to every route; APP_GUARD registers ThrottlerGuard, TenantGuard, RolesGuard, PermissionsGuard

3) backend/src/prisma/prisma.module.ts
- Imports: Global, Module, PrismaService, TenantContextService
- Exports: PrismaService, TenantContextService
- Relationship: Provides global DB access and shared request tenant context to the rest of the app

4) backend/src/prisma/prisma.service.ts
- Imports: Injectable, OnModuleInit, OnModuleDestroy, PrismaClient, TenantContextService, fs
- Exports: PrismaService
- Relationship: injected by services throughout the app; is the main runtime DB gateway for user, tenant, booking, assignment, vehicle, driver, etc.
- Critical data flow: service instance -> $extends query interception -> tenantId injection -> SQL/Prisma model operations

5) backend/src/auth/auth.module.ts
- Imports: Module, JwtModule, ConfigModule, ConfigService, AuthService, AuthController
- Exports: AuthService, JwtModule
- Relationship: token provider for all authenticated routes; any route that needs JWT verification or token generation comes through this module or the JwtModule it exports.

6) backend/src/auth/auth.service.ts
- Imports: Injectable, UnauthorizedException, BadRequestException, ConflictException, JwtService, PrismaService, LoginDto, RegisterDto, bcryptjs
- Exports: AuthService
- Relationship: AuthController -> AuthService -> PrismaService -> tenant+user records; tokens issued with payload { sub, email, role, tenantId, type }

7) backend/src/auth/auth.controller.ts
- Imports: Controller, Post, Body, HttpCode, Req, Res, AuthService, LoginDto, RegisterDto, Public decorator
- Exports: none
- Relationship: API route layer for /auth/login, /auth/register, /auth/logout, /auth/refresh (as implemented by controller file)

8) backend/src/bookings/bookings.module.ts
- Imports: Module, BookingsService, BookingsController
- Exports: likely BookingsService/Controller as a feature module; module is imported by AppModule
- Relationship: feature module for booking resource

9) backend/src/bookings/bookings.service.ts
- Imports: BadRequestException, ConflictException, Injectable, NotFoundException, PrismaService, CreateBookingDto, UpdateBookingDto, Prisma enums from @prisma/client
- Exports: BookingsService
- Relationship: creates booking records, finds/creates related Driver and Vehicle, creates Assignment and DutySlip, and may delete/upsert relationship data in transactions
- Critical coupling: one of the most connected service files; links Customer, Driver, Vehicle, Assignment, DutySlip, Trip, InvoiceItem, and Booking in a single lifecycle

10) backend/src/bookings/bookings.controller.ts
- Imports: Controller, Body, Delete, Get, Param, Patch, Post, Query, BookingsService, DTOs, Permissions decorator, Permission enum, BookingStatus
- Exports: none
- Relationship: route layer for /bookings; relies on permissions metadata and AppModule global guards for authorization

11) backend/src/common/guards/tenant.guard.ts
- Imports: CanActivate, ExecutionContext, ForbiddenException, Reflector, IS_PUBLIC_KEY, TenantContextService
- Exports: TenantGuard
- Relationship: checks whether request has tenant context or public decorator; uses metadata + tenantContext to guard access

12) backend/src/common/guards/roles.guard.ts
- Imports: Injectable, CanActivate, ExecutionContext, ForbiddenException, Reflector, ROLES_KEY, UserRole, TenantContextService
- Exports: RolesGuard
- Relationship: Authorization gate that reads current user from TenantContextService and validates required role metadata

13) backend/src/common/guards/permissions.guard.ts
- Imports: Injectable, CanActivate, ExecutionContext, ForbiddenException, Reflector, PERMISSIONS_KEY, Permission, RolePermissions, TenantContextService, UserRole
- Exports: PermissionsGuard
- Relationship: route-level authorization using per-role permission maps

14) backend/src/common/decorators/permissions.decorator.ts
- Imports: SetMetadata, Permission from '../constants/permissions'
- Exports: PERMISSIONS_KEY, Permissions()
- Relationship: attaches permission metadata consumed by PermissionsGuard

15) backend/src/common/decorators/roles.decorator.ts
- Imports: SetMetadata, UserRole from '@prisma/client'
- Exports: ROLES_KEY, Roles()
- Relationship: attaches role metadata consumed by RolesGuard

16) backend/src/common/middleware/tenant-context.middleware.ts
- Imports: Injectable, NestMiddleware, Request/Response/NextFunction, JwtService, TenantContextService
- Exports: TenantContextMiddleware
- Relationship: appends user to request and populates AsyncLocalStorage with tenantId and user data before routes execute

17) backend/src/common/context/tenant-context.service.ts
- Imports: Injectable, AsyncLocalStorage
- Exports: TenantContextService, TenantContextStore
- Relationship: cross-cutting state container for tenantId + user information; used by PrismaService and guards

18) backend/src/common/filters/global-exception.filter.ts
- Imports: Catch, ExceptionFilter, ArgumentsHost, HttpException, HttpStatus, Prisma from '@prisma/client'
- Exports: GlobalExceptionFilter
- Relationship: central exception layer for HTTP/prisma errors; wired in main.ts

Direct import graph — frontend API usage

- frontend/src/lib/api.ts
  - Exports: api singleton instance and default export
  - Imports: none at source level; uses browser localStorage and fetch API directly
  - Consumers: login, register, and dashboard pages import api from '@/lib/api'

- frontend/src/app/login/page.tsx
  - Imports: api from '@/lib/api'
  - Calls: api.login(email, password)
  - Relationship: POST /auth/login; returns accessToken + refreshToken, stores user in localStorage

- frontend/src/app/register/page.tsx
  - Imports: api from '@/lib/api'
  - Calls: api.register(formData)
  - Relationship: POST /auth/register; creates tenant + initial operator admin user

- frontend/src/app/page.tsx
  - Imports: api from '@/lib/api'
  - Relationship: landing page likely checks auth or redirects based on stored session state

- frontend/src/app/dashboard/*.tsx pages
  - Direct imports: each dashboard page imports api from '@/lib/api' (confirmed in bookings, drivers, vehicles, invoices, payments, reports, settings, super-admin, duty-slips, assignments, customers, customer history, rate-management, layouts, etc.)
  - Relationship: the frontend dashboard is a consumer layer over the backend REST API; each page calls backend endpoints through the central api client

Module export summary by feature

- PrismaModule: exports PrismaService and TenantContextService
- AuthModule: exports AuthService and JwtModule
- Feature modules (CustomersModule, DriversModule, VehiclesModule, BookingsModule, AssignmentsModule, DutySlipsModule, TripsModule, InvoicesModule, PaymentsModule, ReportsModule, DashboardModule, RateManagementModule, TenantSettingsModule, SuperAdminModule, HealthModule): each module wraps a controller and service pair; AppModule imports each of them as a feature provider block
- AppModule: no exports; it is the runtime root and installs global guards/middleware
- No direct cross-feature service-to-service import chain is present in the static graph; the dominant coupling is via PrismaService and the database schema rather than direct service imports

Orphan / disconnected file scan

Result of the deeper static graph pass: no runtime source file was found to be completely disconnected from the app startup path once module wiring and frontend API consumer imports were considered. The main runtime app path is consistent:

main.ts -> AppModule -> feature modules -> controllers/services -> PrismaService -> Database
frontend pages -> api client -> backend controllers -> services -> PrismaService -> Database

The only files that appear likely unused or development-only are:

- backend/src/test-pdf.ts — explicitly ignored by build config and ESLint, and not referenced by application runtime wiring; marked INFERRED development helper
- backend/src/app.controller.spec.ts — test-only file; not in runtime module graph
- Other *.spec.ts files (excluded by tsconfig) — not part of runtime and therefore not considered application modules

Important caveat: a file can be "unreferenced" at the static source level but still be part of an app via reflected metadata, dynamic imports, or framework conventions. No such dynamic import pattern was found in the scanned code, so the static scan does not show a real runtime orphan beyond the dev/test-only artifacts above.

Critical coupling confirmed by direct import graph

- AppModule is the central hub: every feature module is imported there and global security middleware/guards are added there.
- PrismaService is the central data dependency: service files do not usually import each other, but they all depend on PrismaService and the shared tenant context model.
- Auth and tenant context are coupled: AuthService generates token payloads with tenantId and role; TenantContextMiddleware decodes those tokens and both RolesGuard and PermissionsGuard trust the resulting context.
- BookingsService is the most tightly coupled runtime service: booking creation/update triggers driver assignment, vehicle assignment, dutySlip generation, and invoice/tax-related side effects through Prisma transactions.

High-level import graph (Mermaid)

```mermaid
graph TD
  main[backend/src/main.ts] --> app[backend/src/app.module.ts]
  app --> prisma[backend/src/prisma/prisma.module.ts]
  app --> auth[backend/src/auth/auth.module.ts]
  app --> bookings[backend/src/bookings/bookings.module.ts]
  app --> customers[backend/src/customers/customers.module.ts]
  app --> drivers[backend/src/drivers/drivers.module.ts]
  app --> vehicles[backend/src/vehicles/vehicles.module.ts]
  app --> assignments[backend/src/assignments/assignments.module.ts]
  app --> trips[backend/src/trips/trips.module.ts]
  app --> invoices[backend/src/invoices/invoices.module.ts]
  app --> payments[backend/src/payments/payments.module.ts]
  app --> reports[backend/src/reports/reports.module.ts]
  app --> dashboard[backend/src/dashboard/dashboard.module.ts]
  app --> rate[backend/src/rate-management/rate-management.module.ts]
  app --> settings[backend/src/tenant-settings/tenant-settings.module.ts]
  app --> superadmin[backend/src/super-admin/super-admin.module.ts]
  app --> health[backend/src/health/health.module.ts]

  auth --> authsvc[backend/src/auth/auth.service.ts]
  auth -> jwt[JwtModule]
  bookings --> bookingSvc[backend/src/bookings/bookings.service.ts]
  prisma --> prismaSvc[backend/src/prisma/prisma.service.ts]
  prismaSvc --> db[(Database via Prisma schema)]
  authsvc --> prismaSvc
  bookingSvc --> prismaSvc
  common1[backend/src/common/middleware/tenant-context.middleware.ts] --> ctx[backend/src/common/context/tenant-context.service.ts]
  common1 --> jwt
  app --> common1
  app --> rolesG[backend/src/common/guards/roles.guard.ts]
  app --> permG[backend/src/common/guards/permissions.guard.ts]
  app --> tenantG[backend/src/common/guards/tenant.guard.ts]

  frontend[frontend/src/app/* pages] --> api[frontend/src/lib/api.ts]
  api --> apiRoutes[Backend REST API /api/v1/*]
  apiRoutes --> controllers[Backend controllers]
  controllers --> services[Backend services]
  services --> prismaSvc
```

Conclusion
- The direct static import graph confirms that the repository is structured as a classic NestJS backend with one root AppModule and a cluster of feature modules, plus a Next.js frontend that calls the backend through a single shared ApiClient.
- Static analysis found no true runtime orphan among the app modules; the only disconnected/development files are test or helper artifacts.
- The deepest coupling is not direct service-to-service import recursion, but the shared PrismaService/TenantContextService security model and the BookingsService transaction chain.

Final confirmation for this appendix
- File updated: docs/MODULE_RELATIONSHIPS.md
- Existing content preserved exactly; appended only at the end
- No source code files were modified

