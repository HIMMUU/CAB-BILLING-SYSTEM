import { IsDateString, IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateDutySlipDto {
  @IsUUID(4, { message: 'Booking ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Booking ID is required' })
  bookingId: string;

  @IsDateString({}, { message: 'Reporting time must be a valid ISO date string' })
  @IsNotEmpty({ message: 'Reporting time is required' })
  reportingTime: string;

  @IsNumber({}, { message: 'Start KM must be a number' })
  @Min(0, { message: 'Start KM must be at least 0' })
  @IsNotEmpty({ message: 'Start KM is required' })
  startKm: number;
}
