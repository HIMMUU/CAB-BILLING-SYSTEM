import { PaymentStatus } from '@prisma/client';
export declare class UpdatePaymentDto {
    status?: PaymentStatus;
    transactionReference?: string;
}
