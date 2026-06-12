import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceDto {
  @IsEnum(InvoiceStatus, { message: 'Invalid invoice status' })
  @IsOptional()
  status?: InvoiceStatus;

  @IsNumber({}, { message: 'Paid amount must be a number' })
  @Min(0, { message: 'Paid amount cannot be negative' })
  @IsOptional()
  paidAmount?: number;
}
