import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID(4, { message: 'Booking ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Booking ID is required' })
  bookingId: string;

  @IsUUID(4, { message: 'Vehicle ID must be a valid UUID' })
  @IsOptional()
  vehicleId?: string;

  @IsUUID(4, { message: 'Driver ID must be a valid UUID' })
  @IsOptional()
  driverId?: string;

  @IsString()
  @IsOptional()
  manualDriverName?: string;

  @IsString()
  @IsOptional()
  manualDriverMobile?: string;

  @IsString()
  @IsOptional()
  manualVehicleNumber?: string;

  @IsString()
  @IsOptional()
  manualVehicleType?: string;
}
