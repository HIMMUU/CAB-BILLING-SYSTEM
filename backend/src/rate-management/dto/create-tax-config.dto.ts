import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTaxConfigDto {
  @IsString()
  @IsNotEmpty({ message: 'Tax name is required' })
  taxName: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  cgst: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  sgst: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  igst: number;

  @IsDateString({}, { message: 'Effective date must be a valid ISO date string' })
  @IsOptional()
  effectiveFrom?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
