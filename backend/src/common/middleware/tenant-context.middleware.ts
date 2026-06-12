import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../context/tenant-context.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        // We configure verify to read the JWT secret via process.env in JwtModule setup
        const payload = this.jwtService.verify(token);
        const store = {
          tenantId: payload.tenantId,
          user: {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            tenantId: payload.tenantId,
          },
        };
        // Attach user to req for current-user decorator and standard NestJS guards
        (req as any).user = store.user;
        return this.tenantContextService.runWithContext(store, () => next());

      } catch (error) {
        // Token verification failed or expired - run with empty context, guard will catch
        return this.tenantContextService.runWithContext({}, () => next());
      }
    }

    return this.tenantContextService.runWithContext({}, () => next());
  }
}
