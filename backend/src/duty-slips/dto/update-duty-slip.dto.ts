import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DutySlipStatus } from '@prisma/client';

export class UpdateDutySlipDto {
  @IsDateString(
    {},
    { message: 'Reporting time must be a valid ISO date string' },
  )
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

  @IsEnum(DutySlipStatus, {
    message: 'Status must be DRAFT, FILLED, or CLOSED',
  })
  @IsOptional()
  status?: DutySlipStatus;

  @IsDateString(
    {},
    { message: 'Start date time must be a valid ISO date string' },
  )
  @IsOptional()
  startDateTime?: string;

  @IsDateString(
    {},
    { message: 'End date time must be a valid ISO date string' },
  )
  @IsOptional()
  endDateTime?: string;

  @IsNumber({}, { message: 'State Tax must be a number' })
  @Min(0, { message: 'State Tax must be at least 0' })
  @IsOptional()
  stateTax?: number;

  @IsNumber({}, { message: 'MCD must be a number' })
  @Min(0, { message: 'MCD must be at least 0' })
  @IsOptional()
  mcd?: number;

  @IsString({ message: 'Employee ID must be a string' })
  @IsOptional()
  employeeId?: string;

  @IsString({ message: 'Driver ID must be a string' })
  @IsOptional()
  driverId?: string;

  @IsString({ message: 'Vehicle ID must be a string' })
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  guestName?: string;

  @IsString()
  @IsOptional()
  guestSalutation?: string;

  @IsString()
  @IsOptional()
  bookingBy?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
