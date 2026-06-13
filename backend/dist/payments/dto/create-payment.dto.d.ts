import { PaymentMode } from '@prisma/client';
export declare class CreatePaymentDto {
    invoiceId: string;
    amount: number;
    paymentDate?: string;
    paymentMode: PaymentMode;
    transactionReference?: string;
}
