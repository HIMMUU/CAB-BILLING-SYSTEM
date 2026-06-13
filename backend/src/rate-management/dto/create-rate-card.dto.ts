import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRateCardDto {
  @IsUUID(4, { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Client type is required' })
  clientType: string;

  @IsUUID(4, { message: 'Vehicle Category ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Vehicle Category is required' })
  vehicleCategoryId: string;

  @IsNumber()
  @IsOptional()
  halfDayRate?: number;

  @IsNumber()
  @IsOptional()
  fullDayRate?: number;

  @IsNumber()
  @IsOptional()
  includedKm?: number;

  @IsNumber()
  @IsOptional()
  extraKmRate?: number;

  @IsNumber()
  @IsOptional()
  extraHourRate?: number;

  @IsNumber()
  @IsOptional()
  minKmPerDay?: number;

  @IsNumber()
  @IsOptional()
  outstationRatePerKm?: number;

  @IsNumber()
  @IsOptional()
  driverAllowance?: number;

  @IsNumber()
  @IsOptional()
  nightCharge?: number;

  @IsString()
  @IsOptional()
  nightStartTime?: string;

  @IsString()
  @IsOptional()
  nightEndTime?: string;

  @IsDateString({}, { message: 'Effective date must be a valid ISO date string' })
  @IsOptional()
  effectiveFrom?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  minHr?: number;

  @IsNumber()
  @IsOptional()
  minKm?: number;

  @IsNumber()
  @IsOptional()
  fullHr?: number;

  @IsNumber()
  @IsOptional()
  fullKm?: number;

  @IsNumber()
  @IsOptional()
  outstationNightCharge?: number;
}
