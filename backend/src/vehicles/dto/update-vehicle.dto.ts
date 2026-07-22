import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { VehicleStatus } from '@prisma/client';

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsInt({ message: 'Seating capacity must be a whole number' })
  @Min(1, { message: 'Seating capacity must be at least 1' })
  @IsOptional()
  seatingCapacity?: number;

  @IsDateString(
    {},
    { message: 'Registration date must be a valid ISO date string' },
  )
  @IsOptional()
  registrationDate?: string;

  @IsDateString(
    {},
    { message: 'Insurance expiry date must be a valid ISO date string' },
  )
  @IsOptional()
  insuranceExpiry?: string;

  @IsDateString(
    {},
    { message: 'Fitness expiry date must be a valid ISO date string' },
  )
  @IsOptional()
  fitnessExpiry?: string;

  @IsDateString(
    {},
    { message: 'Permit expiry date must be a valid ISO date string' },
  )
  @IsOptional()
  permitExpiry?: string;

  @IsEnum(VehicleStatus, {
    message: 'Status must be AVAILABLE, ON_TRIP, MAINTENANCE, or INACTIVE',
  })
  @IsOptional()
  status?: VehicleStatus;
}
