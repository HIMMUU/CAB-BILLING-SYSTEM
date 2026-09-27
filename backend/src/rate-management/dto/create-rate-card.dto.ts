import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RatePackageDto } from './rate-package.dto';

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatePackageDto)
  @IsOptional()
  customPackages?: RatePackageDto[];
}
