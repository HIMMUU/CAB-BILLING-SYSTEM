import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AutomationTrigger } from '@prisma/client';

export class CreateEmailAutomationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AutomationTrigger)
  trigger: AutomationTrigger;

  @IsString()
  @IsOptional()
  recipientType?: string; // CUSTOMER, DRIVER, OPERATOR, CUSTOM

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsString()
  @IsOptional()
  attachPdf?: string; // NONE, INVOICE, DUTY_SLIP

  @IsInt()
  @IsOptional()
  delayMinutes?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateEmailAutomationDto extends CreateEmailAutomationDto {}
