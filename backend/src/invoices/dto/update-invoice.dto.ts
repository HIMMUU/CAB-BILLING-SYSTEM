import { IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceDto {
  @IsEnum(InvoiceStatus, { message: 'Invalid invoice status' })
  @IsOptional()
  status?: InvoiceStatus;

  @IsNumber({}, { message: 'Paid amount must be a number' })
  @Min(0, { message: 'Paid amount cannot be negative' })
  @IsOptional()
  paidAmount?: number;

  @IsDateString({}, { message: 'Invalid invoice date' })
  @IsOptional()
  invoiceDate?: string;

  @IsDateString({}, { message: 'Invalid due date' })
  @IsOptional()
  dueDate?: string;

  @IsBoolean()
  @IsOptional()
  isRcm?: boolean;

  @IsNumber()
  @IsOptional()
  cgstRate?: number;

  @IsNumber()
  @IsOptional()
  sgstRate?: number;

  @IsNumber()
  @IsOptional()
  igstRate?: number;
}
