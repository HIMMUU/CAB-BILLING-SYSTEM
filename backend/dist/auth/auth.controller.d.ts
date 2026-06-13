import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto, response: Response): Promise<{
        accessToken: string;
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
    login(loginDto: LoginDto, response: Response): Promise<{
        accessToken: string;
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
    refresh(request: Request, response: Response): Promise<{
        accessToken: string;
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
    logout(response: Response): Promise<{
        message: string;
    }>;
    private setCookie;
}
