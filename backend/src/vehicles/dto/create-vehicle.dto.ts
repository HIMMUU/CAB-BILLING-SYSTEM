import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty({ message: 'Vehicle number is required' })
  vehicleNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Vehicle type is required' })
  vehicleType: string;

  @IsString()
  @IsNotEmpty({ message: 'Vehicle model is required' })
  model: string;

  @IsInt({ message: 'Seating capacity must be a whole number' })
  @Min(1, { message: 'Seating capacity must be at least 1' })
  seatingCapacity: number;

  @IsDateString(
    {},
    { message: 'Registration date must be a valid ISO date string' },
  )
  @IsNotEmpty({ message: 'Registration date is required' })
  registrationDate: string;

  @IsDateString(
    {},
    { message: 'Insurance expiry date must be a valid ISO date string' },
  )
  @IsNotEmpty({ message: 'Insurance expiry date is required' })
  insuranceExpiry: string;

  @IsDateString(
    {},
    { message: 'Fitness expiry date must be a valid ISO date string' },
  )
  @IsNotEmpty({ message: 'Fitness expiry date is required' })
  fitnessExpiry: string;

  @IsDateString(
    {},
    { message: 'Permit expiry date must be a valid ISO date string' },
  )
  @IsNotEmpty({ message: 'Permit expiry date is required' })
  permitExpiry: string;

  @IsEnum(VehicleStatus, {
    message: 'Status must be AVAILABLE, ON_TRIP, MAINTENANCE, or INACTIVE',
  })
  @IsOptional()
  status?: VehicleStatus;
}
