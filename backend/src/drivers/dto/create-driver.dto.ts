import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { DriverStatus } from '@prisma/client';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Mobile number must be a valid 10-15 digit string' })
  mobile: string;

  @IsString()
  @IsNotEmpty({ message: 'License number is required' })
  licenseNumber: string;

  @IsDateString({}, { message: 'License expiry must be a valid ISO date string' })
  @IsNotEmpty({ message: 'License expiry date is required' })
  licenseExpiry: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @IsString()
  @IsNotEmpty({ message: 'Emergency contact details are required' })
  emergencyContact: string;

  @IsEnum(DriverStatus, { message: 'Status must be AVAILABLE, ON_TRIP, or INACTIVE' })
  @IsOptional()
  status?: DriverStatus;
}
