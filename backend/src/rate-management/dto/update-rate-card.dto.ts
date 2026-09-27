import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { RatePackageDto } from './rate-package.dto';

export class UpdateRateCardDto {
  @IsUUID(4, { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  clientType?: string;

  @IsUUID(4, { message: 'Vehicle Category ID must be a valid UUID' })
  @IsOptional()
  vehicleCategoryId?: string;

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
