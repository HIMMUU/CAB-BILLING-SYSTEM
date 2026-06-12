import { CustomerType } from '@prisma/client';
export declare class UpdateCustomerDto {
    name?: string;
    companyName?: string;
    type?: CustomerType;
    gstNumber?: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
    creditLimit?: number;
    paymentTerms?: string;
}
