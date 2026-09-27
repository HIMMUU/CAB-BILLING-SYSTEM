import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class RatePackageDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @Min(0.01)
  includedKm: number;

  @IsNumber()
  @Min(0.01)
  includedHours: number;

  @IsNumber()
  @Min(0.01)
  rate: number;
}
