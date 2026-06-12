export interface TenantContextStore {
    tenantId?: string;
    user?: {
        id: string;
        email: string;
        role: string;
        tenantId?: string;
    };
}
export declare class TenantContextService {
    private static readonly asyncLocalStorage;
    runWithContext<T>(store: TenantContextStore, callback: () => T): T;
    getStore(): TenantContextStore | undefined;
    getTenantId(): string | undefined;
    getUser(): {
        id: string;
        email: string;
        role: string;
        tenantId?: string;
    } | undefined;
}
