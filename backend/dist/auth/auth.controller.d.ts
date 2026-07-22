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
        user: unknown;
    }>;
    login(loginDto: LoginDto, response: Response): Promise<{
        accessToken: string;
        expiresIn: number;
        user: unknown;
    }>;
    refresh(request: Request, response: Response): Promise<{
        accessToken: string;
        expiresIn: number;
        user: unknown;
    }>;
    logout(response: Response): {
        message: string;
    };
    private setCookie;
}
