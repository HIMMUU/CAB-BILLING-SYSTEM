import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentStatus, InvoiceStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch target invoice
      const invoice = await tx.invoice.findUnique({
        where: { id: dto.invoiceId },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // Check if invoice is already fully paid
      const dueAmount = Number(invoice.dueAmount);
      if (dueAmount <= 0) {
        throw new BadRequestException('Invoice is already fully paid');
      }

      if (dto.amount > dueAmount) {
        throw new BadRequestException('Payment amount exceeds outstanding due amount');
      }

      // 2. Create payment record
      const payment = await tx.payment.create({
        data: {
          tenantId: invoice.tenantId,
          invoiceId: dto.invoiceId,
          amount: dto.amount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          paymentMode: dto.paymentMode,
          transactionReference: dto.transactionReference,
          status: PaymentStatus.SUCCESS, // default to SUCCESS
        } as any,
      });

      // 3. Update Invoice paid / due amounts
      const newPaid = Number(invoice.paidAmount) + dto.amount;
      const newDue = Math.max(0, Number(invoice.totalAmount) - newPaid);
      
      let nextInvoiceStatus: InvoiceStatus = InvoiceStatus.PARTIALLY_PAID;
      if (newDue <= 0) {
        nextInvoiceStatus = InvoiceStatus.PAID;
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

  async findAll(query: { page?: number; limit?: number; search?: string; status?: PaymentStatus }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
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

  async findOne(id: string) {
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
      throw new NotFoundException('Payment transaction not found');
    }

    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { invoice: true },
      });
      if (!payment) {
        throw new NotFoundException('Payment transaction not found');
      }

      const oldStatus = payment.status;
      const newStatus = dto.status ?? oldStatus;

      const data: any = {};
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.transactionReference !== undefined) data.transactionReference = dto.transactionReference;

      const updatedPayment = await tx.payment.update({
        where: { id },
        data,
      });

      // Status transitions logic affecting Invoice amounts
      if (oldStatus !== PaymentStatus.SUCCESS && newStatus === PaymentStatus.SUCCESS) {
        // Transitioned to SUCCESS -> add amount
        const invoice = payment.invoice;
        const newPaid = Number(invoice.paidAmount) + Number(payment.amount);
        const newDue = Math.max(0, Number(invoice.totalAmount) - newPaid);
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaid,
            dueAmount: newDue,
            status: newDue <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
          },
        });
      } else if (oldStatus === PaymentStatus.SUCCESS && newStatus !== PaymentStatus.SUCCESS) {
        // Transitioned away from SUCCESS -> remove amount
        const invoice = payment.invoice;
        const newPaid = Math.max(0, Number(invoice.paidAmount) - Number(payment.amount));
        const newDue = Number(invoice.totalAmount) - newPaid;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaid,
            dueAmount: newDue,
            status: newPaid === 0 ? InvoiceStatus.UNPAID : InvoiceStatus.PARTIALLY_PAID,
          },
        });
      }

      return updatedPayment;
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { invoice: true },
      });
      if (!payment) {
        throw new NotFoundException('Payment transaction not found');
      }

      // Revert invoice balances if the deleted payment was SUCCESS
      if (payment.status === PaymentStatus.SUCCESS) {
        const invoice = payment.invoice;
        const newPaid = Math.max(0, Number(invoice.paidAmount) - Number(payment.amount));
        const newDue = Number(invoice.totalAmount) - newPaid;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaid,
            dueAmount: newDue,
            status: newPaid === 0 ? InvoiceStatus.UNPAID : InvoiceStatus.PARTIALLY_PAID,
          },
        });
      }

      return tx.payment.delete({
        where: { id },
      });
    });
  }
}
