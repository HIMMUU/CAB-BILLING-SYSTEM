import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  IsDateString,
} from 'class-validator';

export class CloseTripDto {
  @IsUUID(4, { message: 'Duty Slip ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Duty Slip ID is required' })
  dutySlipId: string;

  @IsNumber({}, { message: 'End KM must be a number' })
  @Min(0, { message: 'End KM must be at least 0' })
  @IsNotEmpty({ message: 'End KM is required' })
  endKm: number;

  @IsNumber({}, { message: 'Toll must be a number' })
  @Min(0, { message: 'Toll must be at least 0' })
  @IsOptional()
  toll?: number;

  @IsNumber({}, { message: 'Parking must be a number' })
  @Min(0, { message: 'Parking must be at least 0' })
  @IsOptional()
  parking?: number;

  @IsNumber({}, { message: 'Driver allowance must be a number' })
  @Min(0, { message: 'Driver allowance must be at least 0' })
  @IsOptional()
  driverAllowance?: number;

  @IsNumber({}, { message: 'Night charges must be a number' })
  @Min(0, { message: 'Night charges must be at least 0' })
  @IsOptional()
  nightCharges?: number;

  @IsNumber({}, { message: 'Extra charges must be a number' })
  @Min(0, { message: 'Extra charges must be at least 0' })
  @IsOptional()
  extraCharges?: number;

  @IsNumber({}, { message: 'Base fare charged must be a number' })
  @Min(0, { message: 'Base fare charged must be at least 0' })
  @IsOptional()
  baseFareCharged?: number;

  @IsNumber({}, { message: 'Extra KM charged must be a number' })
  @Min(0, { message: 'Extra KM charged must be at least 0' })
  @IsOptional()
  extraKmCharged?: number;

  @IsNumber({}, { message: 'Extra hours charged must be a number' })
  @Min(0, { message: 'Extra hours charged must be at least 0' })
  @IsOptional()
  extraHoursCharged?: number;

  @IsNumber({}, { message: 'Misc charges charged must be a number' })
  @Min(0, { message: 'Misc charges charged must be at least 0' })
  @IsOptional()
  miscChargesCharged?: number;

  @IsNumber({}, { message: 'Total amount must be a number' })
  @Min(0, { message: 'Total amount must be at least 0' })
  @IsOptional()
  totalAmount?: number;

  @IsDateString(
    {},
    { message: 'Start date time must be a valid ISO date string' },
  )
  @IsOptional()
  startDateTime?: string;

  @IsDateString(
    {},
    { message: 'End date time must be a valid ISO date string' },
  )
  @IsOptional()
  endDateTime?: string;

  @IsNumber({}, { message: 'State Tax must be a number' })
  @Min(0, { message: 'State Tax must be at least 0' })
  @IsOptional()
  stateTax?: number;

  @IsNumber({}, { message: 'MCD must be a number' })
  @Min(0, { message: 'MCD must be at least 0' })
  @IsOptional()
  mcd?: number;
}
