import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateTaxConfigDto {
  @IsString()
  @IsOptional()
  taxName?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  cgst?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  sgst?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  igst?: number;

  @IsDateString({}, { message: 'Effective date must be a valid ISO date string' })
  @IsOptional()
  effectiveFrom?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
