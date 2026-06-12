import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../common/context/tenant-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
            ];

            const anyArgs = args as any;

            if (tenantIsolatedModels.includes(model)) {
              let tenantId = tenantContext.getTenantId();

              if (!tenantId && ['create', 'createMany', 'upsert'].includes(operation)) {
                let providedTenantId: string | undefined;
                if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
                  providedTenantId = anyArgs.data[0]?.tenantId;
                } else if (operation === 'upsert') {
                  providedTenantId = anyArgs.create?.tenantId || anyArgs.create?.tenant?.connect?.id;
                } else {
                  providedTenantId = anyArgs.data?.tenantId || anyArgs.data?.tenant?.connect?.id;
                }

                if (providedTenantId) {
                  tenantId = providedTenantId;
                } else {
                  const firstTenant = await self.tenant.findFirst({ select: { id: true } });
                  if (firstTenant) {
                    tenantId = firstTenant.id;
                  }
                }
              }

              if (tenantId) {
                // 1. Query filters (read/update/delete)
                if (
                  [
                    'findFirst',
                    'findMany',
                    'findUnique',
                    'findUniqueOrThrow',
                    'findFirstOrThrow',
                    'count',
                    'aggregate',
                    'groupBy',
                  ].includes(operation)
                ) {
                  anyArgs.where = anyArgs.where || {};
                  anyArgs.where.tenantId = tenantId;
                } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
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
        if (
          typeof prop === 'symbol' ||
          localProps.includes(prop as string)
        ) {
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
