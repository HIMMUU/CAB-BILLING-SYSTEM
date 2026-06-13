import { InvoiceStatus } from '@prisma/client';
export declare class UpdateInvoiceDto {
    status?: InvoiceStatus;
    paidAmount?: number;
}
