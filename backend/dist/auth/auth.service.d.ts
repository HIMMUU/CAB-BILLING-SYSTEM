import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
            role: any;
            tenantId: any;
            tenantName: any;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
            role: any;
            tenantId: any;
            tenantName: any;
        };
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
            role: any;
            tenantId: any;
            tenantName: any;
        };
    }>;
    private generateTokensAndUser;
}
