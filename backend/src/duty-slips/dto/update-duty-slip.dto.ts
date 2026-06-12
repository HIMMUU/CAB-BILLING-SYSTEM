import { IsDateString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { DutySlipStatus } from '@prisma/client';

export class UpdateDutySlipDto {
  @IsDateString({}, { message: 'Reporting time must be a valid ISO date string' })
  @IsOptional()
  reportingTime?: string;

  @IsNumber({}, { message: 'Start KM must be a number' })
  @Min(0, { message: 'Start KM must be at least 0' })
  @IsOptional()
  startKm?: number;

  @IsNumber({}, { message: 'End KM must be a number' })
  @Min(0, { message: 'End KM must be at least 0' })
  @IsOptional()
  endKm?: number;

  @IsNumber({}, { message: 'Toll must be a number' })
  @Min(0, { message: 'Toll must be at least 0' })
  @IsOptional()
  toll?: number;

  @IsNumber({}, { message: 'Parking must be a number' })
  @Min(0, { message: 'Parking must be at least 0' })
  @IsOptional()
  parking?: number;

  @IsNumber({}, { message: 'Night charges must be a number' })
  @Min(0, { message: 'Night charges must be at least 0' })
  @IsOptional()
  nightCharges?: number;

  @IsNumber({}, { message: 'Driver allowance must be a number' })
  @Min(0, { message: 'Driver allowance must be at least 0' })
  @IsOptional()
  driverAllowance?: number;

  @IsNumber({}, { message: 'Extra charges must be a number' })
  @Min(0, { message: 'Extra charges must be at least 0' })
  @IsOptional()
  extraCharges?: number;

  @IsEnum(DutySlipStatus, { message: 'Status must be DRAFT, FILLED, or CLOSED' })
  @IsOptional()
  status?: DutySlipStatus;
}
