import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentStatus } from '@prisma/client';
export declare class PaymentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreatePaymentDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        invoiceId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentDate: Date;
        paymentMode: import(".prisma/client").$Enums.PaymentMode;
        transactionReference: string | null;
    }>;
    findAll(query: {
        page?: number;
        limit?: number;
        search?: string;
        status?: PaymentStatus;
    }): Promise<{
        data: ({
            invoice: {
                customer: {
                    id: string;
                    name: string;
                    status: string;
                    createdAt: Date;
                    updatedAt: Date;
                    tenantId: string;
                    email: string | null;
                    companyName: string | null;
                    type: import(".prisma/client").$Enums.CustomerType;
                    gstNumber: string | null;
                    phone: string;
                    billingAddress: string;
                    creditLimit: import("@prisma/client/runtime/library").Decimal;
                    paymentTerms: string | null;
                    clientType: string;
                    cgstRate: import("@prisma/client/runtime/library").Decimal;
                    sgstRate: import("@prisma/client/runtime/library").Decimal;
                    igstRate: import("@prisma/client/runtime/library").Decimal;
                };
            } & {
                id: string;
                status: import(".prisma/client").$Enums.InvoiceStatus;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                cgstRate: import("@prisma/client/runtime/library").Decimal;
                sgstRate: import("@prisma/client/runtime/library").Decimal;
                igstRate: import("@prisma/client/runtime/library").Decimal;
                customerId: string;
                s3Url: string | null;
                toll: import("@prisma/client/runtime/library").Decimal;
                parking: import("@prisma/client/runtime/library").Decimal;
                nightCharges: import("@prisma/client/runtime/library").Decimal;
                stateTax: import("@prisma/client/runtime/library").Decimal;
                mcd: import("@prisma/client/runtime/library").Decimal;
                totalAmount: import("@prisma/client/runtime/library").Decimal;
                invoiceNumber: string;
                invoiceDate: Date;
                dueDate: Date;
                baseFare: import("@prisma/client/runtime/library").Decimal;
                extraKmCharges: import("@prisma/client/runtime/library").Decimal;
                miscCharges: import("@prisma/client/runtime/library").Decimal;
                subtotal: import("@prisma/client/runtime/library").Decimal;
                cgstAmount: import("@prisma/client/runtime/library").Decimal;
                sgstAmount: import("@prisma/client/runtime/library").Decimal;
                igstAmount: import("@prisma/client/runtime/library").Decimal;
                totalTax: import("@prisma/client/runtime/library").Decimal;
                paidAmount: import("@prisma/client/runtime/library").Decimal;
                dueAmount: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            invoiceId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            paymentDate: Date;
            paymentMode: import(".prisma/client").$Enums.PaymentMode;
            transactionReference: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        invoice: {
            customer: {
                id: string;
                name: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                email: string | null;
                companyName: string | null;
                type: import(".prisma/client").$Enums.CustomerType;
                gstNumber: string | null;
                phone: string;
                billingAddress: string;
                creditLimit: import("@prisma/client/runtime/library").Decimal;
                paymentTerms: string | null;
                clientType: string;
                cgstRate: import("@prisma/client/runtime/library").Decimal;
                sgstRate: import("@prisma/client/runtime/library").Decimal;
                igstRate: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            cgstRate: import("@prisma/client/runtime/library").Decimal;
            sgstRate: import("@prisma/client/runtime/library").Decimal;
            igstRate: import("@prisma/client/runtime/library").Decimal;
            customerId: string;
            s3Url: string | null;
            toll: import("@prisma/client/runtime/library").Decimal;
            parking: import("@prisma/client/runtime/library").Decimal;
            nightCharges: import("@prisma/client/runtime/library").Decimal;
            stateTax: import("@prisma/client/runtime/library").Decimal;
            mcd: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            invoiceNumber: string;
            invoiceDate: Date;
            dueDate: Date;
            baseFare: import("@prisma/client/runtime/library").Decimal;
            extraKmCharges: import("@prisma/client/runtime/library").Decimal;
            miscCharges: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            cgstAmount: import("@prisma/client/runtime/library").Decimal;
            sgstAmount: import("@prisma/client/runtime/library").Decimal;
            igstAmount: import("@prisma/client/runtime/library").Decimal;
            totalTax: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            dueAmount: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        invoiceId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentDate: Date;
        paymentMode: import(".prisma/client").$Enums.PaymentMode;
        transactionReference: string | null;
    }>;
    update(id: string, dto: UpdatePaymentDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        invoiceId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentDate: Date;
        paymentMode: import(".prisma/client").$Enums.PaymentMode;
        transactionReference: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        invoiceId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentDate: Date;
        paymentMode: import(".prisma/client").$Enums.PaymentMode;
        transactionReference: string | null;
    }>;
}
