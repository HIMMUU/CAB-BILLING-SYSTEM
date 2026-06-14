import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export enum GstType {
  INTRASTATE = 'INTRASTATE',
  INTERSTATE = 'INTERSTATE',
}

export class CreateInvoiceDto {
  @IsUUID(4, { message: 'Trip ID must be a valid UUID' })
  @IsOptional()
  tripId?: string;

  @IsUUID(4, { each: true, message: 'Each Trip ID must be a valid UUID' })
  @IsOptional()
  tripIds?: string[];

  @IsDateString({}, { message: 'Invoice date must be a valid ISO date string' })
  @IsOptional()
  invoiceDate?: string;

  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  @IsOptional()
  dueDate?: string;

  @IsEnum(GstType, { message: 'GST Type must be INTRASTATE or INTERSTATE' })
  @IsNotEmpty({ message: 'GST Type is required' })
  gstType: GstType;

  @IsNumber({}, { message: 'GST Rate must be a number' })
  @Min(0, { message: 'GST Rate cannot be negative' })
  @IsOptional()
  gstRate?: number;

  @IsOptional()
  isRcm?: boolean;
}
