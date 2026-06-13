import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TripType, BookingStatus } from '@prisma/client';

export class UpdateBookingDto {
  @IsUUID(4, { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @IsOptional()
  dropLocation?: string;

  @IsDateString({}, { message: 'Pickup date must be a valid ISO date string' })
  @IsOptional()
  pickupDate?: string;

  @IsString()
  @IsOptional()
  pickupTime?: string;

  @IsEnum(TripType, { message: 'Trip type must be LOCAL, AIRPORT_TRANSFER, OUTSTATION, or HOURLY_RENTAL' })
  @IsOptional()
  tripType?: TripType;

  @IsString()
  @IsOptional()
  vehicleTypeRequired?: string;

  @IsEnum(BookingStatus, { message: 'Status must be PENDING, ASSIGNED, STARTED, COMPLETED, or CANCELLED' })
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
}
