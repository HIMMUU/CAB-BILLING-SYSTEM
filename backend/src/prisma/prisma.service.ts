import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../common/context/tenant-context.service';
import * as fs from 'fs';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private _extendedClient: any;

  constructor(private readonly tenantContext: TenantContextService) {
    super();
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

            const anyArgs = args as any;

            if (tenantIsolatedModels.includes(model)) {
              let tenantId = tenantContext.getTenantId();

              if (
                !tenantId &&
                ['create', 'createMany', 'upsert'].includes(operation)
              ) {
                let providedTenantId: string | undefined;
                if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
                  providedTenantId = anyArgs.data[0]?.tenantId;
                } else if (operation === 'upsert') {
                  providedTenantId =
                    anyArgs.create?.tenantId ||
                    anyArgs.create?.tenant?.connect?.id;
                } else {
                  providedTenantId =
                    anyArgs.data?.tenantId || anyArgs.data?.tenant?.connect?.id;
                }

                if (providedTenantId) {
                  tenantId = providedTenantId;
                } else {
                  const firstTenant = await self.tenant.findFirst({
                    select: { id: true },
                  });
                  if (firstTenant) {
                    tenantId = firstTenant.id;
                  }
                }
              }

              if (tenantId) {
                // Intercept findUnique and findUniqueOrThrow to prevent Prisma validation error when adding tenantId
                if (
                  operation === 'findUnique' ||
                  operation === 'findUniqueOrThrow'
                ) {
                  const modelKey =
                    model.charAt(0).toLowerCase() + model.slice(1);
                  const extendedModel = self._extendedClient[modelKey];
                  if (extendedModel) {
                    const newArgs = { ...args };
                    // If no valid unique keys are specified (e.g. id is undefined), we do NOT match any record.
                    // This matches standard Prisma behavior where querying with undefined unique ID throws validation error,
                    // but we can check it explicitly here to prevent fetching the first record.
                    const whereKeys = Object.keys(newArgs.where || {});
                    const hasValidUniqueKey = whereKeys.some(
                      (key) =>
                        newArgs.where[key] !== undefined &&
                        newArgs.where[key] !== null,
                    );

                    if (!hasValidUniqueKey) {
                      // Let standard query proceed (which will throw Prisma validation error)
                      return query(anyArgs);
                    }

                    newArgs.where = { ...(newArgs.where || {}), tenantId };
                    if (operation === 'findUnique') {
                      return extendedModel.findFirst(newArgs);
                    } else {
                      return extendedModel.findFirstOrThrow(newArgs);
                    }
                  }
                }

                // Intercept update and delete to prevent Prisma validation error when adding tenantId
                if (operation === 'update' || operation === 'delete') {
                  const modelKey =
                    model.charAt(0).toLowerCase() + model.slice(1);
                  const extendedModel = self._extendedClient[modelKey];
                  const dbModel = (self as any)[modelKey];
                  if (extendedModel && dbModel) {
                    const whereKeys = Object.keys(args?.where || {});
                    const hasValidUniqueKey = whereKeys.some(
                      (key) =>
                        args.where[key] !== undefined &&
                        args.where[key] !== null,
                    );

                    if (!hasValidUniqueKey) {
                      return query(anyArgs);
                    }

                    // Check if record exists under this tenant using extended client (automatically filters by tenantId)
                    const exists = await extendedModel.findFirst({
                      where: { ...(args?.where || {}) },
                      select: { id: true },
                    });
                    if (!exists) {
                      const error = new Error(
                        `Record to ${operation} not found.`,
                      );
                      (error as any).code = 'P2025';
                      throw error;
                    }
                    // Run the update/delete on the unextended client using only the original unique criteria
                    return dbModel[operation](args);
                  }
                }

                // 1. Query filters (read/update/delete)
                if (
                  [
                    'findFirst',
                    'findMany',
                    'findFirstOrThrow',
                    'count',
                    'aggregate',
                    'groupBy',
                  ].includes(operation)
                ) {
                  anyArgs.where = anyArgs.where || {};
                  anyArgs.where.tenantId = tenantId;
                } else if (['updateMany', 'deleteMany'].includes(operation)) {
                  anyArgs.where = anyArgs.where || {};
                  anyArgs.where.tenantId = tenantId;
                }
                // 2. Data mutations (inserts)
                else if (operation === 'create') {
                  anyArgs.data = anyArgs.data || {};
                  anyArgs.data.tenantId = tenantId;
                } else if (operation === 'createMany') {
                  if (Array.isArray(anyArgs.data)) {
                    anyArgs.data.forEach((item: any) => {
                      item.tenantId = tenantId;
                    });
                  } else {
                    anyArgs.data = anyArgs.data || {};
                    anyArgs.data.tenantId = tenantId;
                  }
                } else if (operation === 'upsert') {
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

    // Proxy all property access to the extended client
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
}
