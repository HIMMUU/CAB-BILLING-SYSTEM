import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TripType, BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @IsUUID(4, { message: 'Customer ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: string;

  @IsString()
  @IsNotEmpty({ message: 'Pickup location is required' })
  pickupLocation: string;

  @IsString()
  @IsNotEmpty({ message: 'Drop location is required' })
  dropLocation: string;

  @IsDateString({}, { message: 'Pickup date must be a valid ISO date string' })
  @IsNotEmpty({ message: 'Pickup date is required' })
  pickupDate: string;

  @IsString()
  @IsNotEmpty({ message: 'Pickup time is required' })
  pickupTime: string;

  @IsEnum(TripType, {
    message:
      'Trip type must be LOCAL, AIRPORT_TRANSFER, OUTSTATION, or HOURLY_RENTAL',
  })
  @IsNotEmpty({ message: 'Trip type is required' })
  tripType: TripType;

  @IsString()
  @IsNotEmpty({ message: 'Vehicle type required is required' })
  vehicleTypeRequired: string;

  @IsEnum(BookingStatus, {
    message:
      'Status must be PENDING, ASSIGNED, STARTED, COMPLETED, or CANCELLED',
  })
  @IsOptional()
  status?: BookingStatus;

  @IsString()
  @IsOptional()
  employeeId?: string;

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

  @IsUUID(4, { message: 'Driver ID must be a valid UUID' })
  @IsOptional()
  driverId?: string;

  @IsUUID(4, { message: 'Vehicle ID must be a valid UUID' })
  @IsOptional()
  vehicleId?: string;
}
