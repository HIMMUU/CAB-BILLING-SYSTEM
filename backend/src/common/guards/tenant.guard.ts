import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TenantContextService } from '../context/tenant-context.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const user = this.tenantContext.getUser();
    if (!user) {
      throw new UnauthorizedException(
        'Authentication token is missing or invalid',
      );
    }

    // Tenant-specific check: if user role is not SUPER_ADMIN, they MUST have a tenantId
    if (user.role !== 'SUPER_ADMIN' && !user.tenantId) {
      throw new UnauthorizedException('Tenant context is missing');
    }

    return true;
  }
}
