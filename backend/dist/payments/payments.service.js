"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let PaymentsService = class PaymentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id: dto.invoiceId },
            });
            if (!invoice) {
                throw new common_1.NotFoundException('Invoice not found');
            }
            const dueAmount = Number(invoice.dueAmount);
            if (dueAmount <= 0) {
                throw new common_1.BadRequestException('Invoice is already fully paid');
            }
            if (dto.amount > dueAmount) {
                throw new common_1.BadRequestException('Payment amount exceeds outstanding due amount');
            }
            const payment = await tx.payment.create({
                data: {
                    tenantId: invoice.tenantId,
                    invoiceId: dto.invoiceId,
                    amount: dto.amount,
                    paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
                    paymentMode: dto.paymentMode,
                    transactionReference: dto.transactionReference,
                    status: client_1.PaymentStatus.SUCCESS,
                },
            });
            const newPaid = Number(invoice.paidAmount) + dto.amount;
            const newDue = Math.max(0, Number(invoice.totalAmount) - newPaid);
            let nextInvoiceStatus = client_1.InvoiceStatus.PARTIALLY_PAID;
            if (newDue <= 0) {
                nextInvoiceStatus = client_1.InvoiceStatus.PAID;
            }
            await tx.invoice.update({
                where: { id: dto.invoiceId },
                data: {
                    paidAmount: newPaid,
                    dueAmount: newDue,
                    status: nextInvoiceStatus,
                },
            });
            return payment;
        });
    }
    async findAll(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        if (query.search) {
            where.OR = [
                { transactionReference: { contains: query.search, mode: 'insensitive' } },
                {
                    invoice: {
                        invoiceNumber: { contains: query.search, mode: 'insensitive' },
                    },
                },
            ];
        }
        const [total, data] = await Promise.all([
            this.prisma.payment.count({ where }),
            this.prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    invoice: {
                        include: {
                            customer: true,
                        },
                    },
                },
            }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const payment = await this.prisma.payment.findUnique({
            where: { id },
            include: {
                invoice: {
                    include: {
                        customer: true,
                    },
                },
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment transaction not found');
        }
        return payment;
    }
    async update(id, dto) {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id },
                include: { invoice: true },
            });
            if (!payment) {
                throw new common_1.NotFoundException('Payment transaction not found');
            }
            const oldStatus = payment.status;
            const newStatus = dto.status ?? oldStatus;
            const data = {};
            if (dto.status !== undefined)
                data.status = dto.status;
            if (dto.transactionReference !== undefined)
                data.transactionReference = dto.transactionReference;
            const updatedPayment = await tx.payment.update({
                where: { id },
                data,
            });
            if (oldStatus !== client_1.PaymentStatus.SUCCESS && newStatus === client_1.PaymentStatus.SUCCESS) {
                const invoice = payment.invoice;
                const newPaid = Number(invoice.paidAmount) + Number(payment.amount);
                const newDue = Math.max(0, Number(invoice.totalAmount) - newPaid);
                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        paidAmount: newPaid,
                        dueAmount: newDue,
                        status: newDue <= 0 ? client_1.InvoiceStatus.PAID : client_1.InvoiceStatus.PARTIALLY_PAID,
                    },
                });
            }
            else if (oldStatus === client_1.PaymentStatus.SUCCESS && newStatus !== client_1.PaymentStatus.SUCCESS) {
                const invoice = payment.invoice;
                const newPaid = Math.max(0, Number(invoice.paidAmount) - Number(payment.amount));
                const newDue = Number(invoice.totalAmount) - newPaid;
                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        paidAmount: newPaid,
                        dueAmount: newDue,
                        status: newPaid === 0 ? client_1.InvoiceStatus.UNPAID : client_1.InvoiceStatus.PARTIALLY_PAID,
                    },
                });
            }
            return updatedPayment;
        });
    }
    async remove(id) {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id },
                include: { invoice: true },
            });
            if (!payment) {
                throw new common_1.NotFoundException('Payment transaction not found');
            }
            if (payment.status === client_1.PaymentStatus.SUCCESS) {
                const invoice = payment.invoice;
                const newPaid = Math.max(0, Number(invoice.paidAmount) - Number(payment.amount));
                const newDue = Number(invoice.totalAmount) - newPaid;
                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        paidAmount: newPaid,
                        dueAmount: newDue,
                        status: newPaid === 0 ? client_1.InvoiceStatus.UNPAID : client_1.InvoiceStatus.PARTIALLY_PAID,
                    },
                });
            }
            return tx.payment.delete({
                where: { id },
            });
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map