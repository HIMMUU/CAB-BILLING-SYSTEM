import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { DriverStatus } from '@prisma/client';

export class UpdateDriverDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Mobile number must be a valid 10-15 digit string',
  })
  mobile?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsDateString(
    {},
    { message: 'License expiry must be a valid ISO date string' },
  )
  @IsOptional()
  licenseExpiry?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsEnum(DriverStatus, {
    message: 'Status must be AVAILABLE, ON_TRIP, or INACTIVE',
  })
  @IsOptional()
  status?: DriverStatus;
}
