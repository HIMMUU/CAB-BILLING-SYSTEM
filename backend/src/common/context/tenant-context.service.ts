import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextStore {
  tenantId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
}

@Injectable()
export class TenantContextService {
  private static readonly asyncLocalStorage =
    new AsyncLocalStorage<TenantContextStore>();

  runWithContext<T>(store: TenantContextStore, callback: () => T): T {
    return TenantContextService.asyncLocalStorage.run(store, callback);
  }

  getStore(): TenantContextStore | undefined {
    return TenantContextService.asyncLocalStorage.getStore();
  }

  getTenantId(): string | undefined {
    return this.getStore()?.tenantId;
  }

  getUser() {
    return this.getStore()?.user;
  }
}
