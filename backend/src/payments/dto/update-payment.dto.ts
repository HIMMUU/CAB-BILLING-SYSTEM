import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus, { message: 'Invalid payment status' })
  @IsOptional()
  status?: PaymentStatus;

  @IsString({ message: 'Transaction reference must be a string' })
  @IsOptional()
  transactionReference?: string;
}
