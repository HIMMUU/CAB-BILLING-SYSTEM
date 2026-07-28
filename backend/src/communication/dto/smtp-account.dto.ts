import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { SmtpProvider } from '@prisma/client';

export class CreateSmtpAccountDto {
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsEnum(SmtpProvider)
  provider: SmtpProvider;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  port: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  encryption?: string;

  @IsString()
  @IsNotEmpty()
  fromName: string;

  @IsString()
  @IsNotEmpty()
  fromEmail: string;

  @IsString()
  @IsOptional()
  replyTo?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateSmtpAccountDto extends CreateSmtpAccountDto {}

export class TestSmtpConnectionDto extends CreateSmtpAccountDto {}
