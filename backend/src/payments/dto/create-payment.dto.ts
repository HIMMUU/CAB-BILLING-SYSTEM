import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMode } from '@prisma/client';

export class CreatePaymentDto {
  @IsUUID(4, { message: 'Invoice ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Invoice ID is required' })
  invoiceId: string;

  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount: number;

  @IsDateString({}, { message: 'Payment date must be a valid ISO date string' })
  @IsOptional()
  paymentDate?: string;

  @IsEnum(PaymentMode, { message: 'Invalid payment mode' })
  @IsNotEmpty({ message: 'Payment mode is required' })
  paymentMode: PaymentMode;

  @IsString({ message: 'Transaction reference must be a string' })
  @IsOptional()
  transactionReference?: string;
}
