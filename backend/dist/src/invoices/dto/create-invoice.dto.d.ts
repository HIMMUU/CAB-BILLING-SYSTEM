export declare enum GstType {
    INTRASTATE = "INTRASTATE",
    INTERSTATE = "INTERSTATE"
}
export declare class CreateInvoiceDto {
    tripId: string;
    invoiceDate?: string;
    dueDate?: string;
    gstType: GstType;
    gstRate?: number;
}
