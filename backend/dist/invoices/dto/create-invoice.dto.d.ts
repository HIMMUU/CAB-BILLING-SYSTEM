export declare enum GstType {
    INTRASTATE = "INTRASTATE",
    INTERSTATE = "INTERSTATE"
}
export declare class CreateInvoiceDto {
    tripId?: string;
    tripIds?: string[];
    invoiceDate?: string;
    dueDate?: string;
    gstType: GstType;
    gstRate?: number;
    isRcm?: boolean;
}
