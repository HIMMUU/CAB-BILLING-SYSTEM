import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/public.decorator';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);
    this.setCookie(response, result.refreshToken);

    const { refreshToken, ...rest } = result;
    return rest;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setCookie(response, result.refreshToken);
    
    // Omit refreshToken from the json response body for security
    const { refreshToken, ...rest } = result;
    return rest;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const result = await this.authService.refresh(refreshToken);
    this.setCookie(response, result.refreshToken);

    const { refreshToken: _, ...rest } = result;
    return rest;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: false, // set to true in production with HTTPS
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  private setCookie(response: Response, token: string) {
    response.cookie('refreshToken', token, {
      httpOnly: true,
      secure: false, // set to true in production with HTTPS
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
