import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../context/tenant-context.service';
export declare class TenantGuard implements CanActivate {
    private readonly reflector;
    private readonly tenantContext;
    constructor(reflector: Reflector, tenantContext: TenantContextService);
    canActivate(context: ExecutionContext): boolean;
}
