import { InvoiceStatus } from '@prisma/client';
export declare class UpdateInvoiceDto {
    status?: InvoiceStatus;
    paidAmount?: number;
    invoiceDate?: string;
    dueDate?: string;
    isRcm?: boolean;
    cgstRate?: number;
    sgstRate?: number;
    igstRate?: number;
}
