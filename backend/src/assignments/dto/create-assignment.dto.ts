import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID(4, { message: 'Booking ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Booking ID is required' })
  bookingId: string;

  @IsUUID(4, { message: 'Vehicle ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Vehicle ID is required' })
  vehicleId: string;

  @IsUUID(4, { message: 'Driver ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Driver ID is required' })
  driverId: string;
}
