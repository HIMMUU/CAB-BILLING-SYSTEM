import { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../context/tenant-context.service';
export declare class TenantContextMiddleware implements NestMiddleware {
    private readonly jwtService;
    private readonly tenantContextService;
    constructor(jwtService: JwtService, tenantContextService: TenantContextService);
    use(req: Request, res: Response, next: NextFunction): void;
}
