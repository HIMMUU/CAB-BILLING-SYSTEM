import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Enforce 100 tenants limit
    const tenantCount = await this.prisma.tenant.count();
    if (tenantCount >= 100) {
      throw new BadRequestException(
        'SaaS instance has reached its limit of 100 tenants.',
      );
    }

    // 2. Validate email uniqueness globally
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: dto.email,
          mode: 'insensitive',
        },
      },
    });
    if (existingUser) {
      throw new ConflictException(
        'A user with this email address already exists.',
      );
    }

    // 3. Create Tenant and User inside a transaction
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const slug =
      dto.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Math.floor(1000 + Math.random() * 9000);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug,
          companyEmail: dto.companyEmail,
          companyPhone: dto.companyPhone,
          companyAddress: dto.companyAddress || '',
          companyGst: dto.companyGst || null,
          subscriptionPlan: dto.subscriptionPlan || 'Starter',
          sacNo: '9966',
          serviceCategory: 'Rent-A-Cab',
          status: 'ACTIVE',
        },
      });

      // Initialize defaults for the tenant: default GST config
      await tx.taxConfiguration.create({
        data: {
          tenantId: tenant.id,
          taxName: 'GST (Local Cabs)',
          cgst: 2.5,
          sgst: 2.5,
          igst: 5.0,
          isActive: true,
          effectiveFrom: new Date(),
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'OPERATOR_ADMIN',
          status: 'ACTIVE',
        },
        include: {
          tenant: true,
        },
      });

      return user;
    });

    return this.generateTokensAndUser(result);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: dto.email,
          mode: 'insensitive',
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        `User account is ${user.status.toLowerCase()}`,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokensAndUser(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          tenant: true,
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User no longer exists or is inactive');
      }

      return this.generateTokensAndUser(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private generateTokensAndUser(user: any) {
    const accessPayload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      type: 'access',
    };

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name || null,
      },
    };
  }
}
