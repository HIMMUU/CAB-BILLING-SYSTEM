import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDutySlipDto {
  @IsUUID(4, { message: 'Booking ID must be a valid UUID' })
  @IsOptional()
  bookingId?: string;

  @IsDateString({}, { message: 'Reporting time must be a valid ISO date string' })
  @IsNotEmpty({ message: 'Reporting time is required' })
  reportingTime: string;

  @IsNumber({}, { message: 'Start KM must be a number' })
  @Min(0, { message: 'Start KM must be at least 0' })
  @IsNotEmpty({ message: 'Start KM is required' })
  startKm: number;

  @IsUUID(4, { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @IsUUID(4, { message: 'Driver ID must be a valid UUID' })
  @IsOptional()
  driverId?: string;

  @IsUUID(4, { message: 'Vehicle ID must be a valid UUID' })
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @IsOptional()
  dropLocation?: string;

  @IsString()
  @IsOptional()
  tripType?: string;

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
