import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from './smtp.service';
import { TemplateService } from './template.service';
import { SendEmailDto } from './dto/send-email.dto';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smtpService: SmtpService,
    private readonly templateService: TemplateService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async sendEmail(tenantId: string, dto: SendEmailDto) {
    const { transporter, account } = await this.smtpService.getTransporterForTenant(tenantId, dto.smtpAccountId);

    const attachments: any[] = [];
    let attachmentName: string | undefined = undefined;

    // Handle PDF attachments
    if (dto.attachType === 'INVOICE' && dto.invoiceId) {
      try {
        const pdfBuffer = await this.invoicesService.generatePdfBuffer(dto.invoiceId, tenantId);
        const invoice = await this.prisma.invoice.findFirst({ where: { id: dto.invoiceId, tenantId } });
        const fileName = `${invoice?.invoiceNumber || 'Invoice'}.pdf`;
        attachments.push({
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
        attachmentName = fileName;
      } catch (err: any) {
        this.logger.error(`Failed to generate Invoice PDF attachment: ${err.message}`);
      }
    }

    const logRecord = await this.prisma.emailLog.create({
      data: {
        tenantId,
        smtpAccountId: account.id,
        recipient: dto.to,
        cc: dto.cc || null,
        bcc: dto.bcc || null,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        status: 'QUEUED',
        bookingId: dto.bookingId || null,
        dutySlipId: dto.dutySlipId || null,
        invoiceId: dto.invoiceId || null,
        attachmentName: attachmentName || null,
      },
    });

    try {
      const mailOptions: any = {
        from: `"${account.fromName}" <${account.fromEmail}>`,
        to: dto.to,
        subject: dto.subject,
        html: dto.htmlBody,
      };

      if (dto.cc) mailOptions.cc = dto.cc;
      if (dto.bcc) mailOptions.bcc = dto.bcc;
      if (account.replyTo) mailOptions.replyTo = account.replyTo;
      if (attachments.length > 0) mailOptions.attachments = attachments;

      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${dto.to}: MessageId ${info.messageId}`);

      await this.prisma.emailLog.update({
        where: { id: logRecord.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      return { success: true, messageId: info.messageId, logId: logRecord.id };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${dto.to}: ${error.message}`);
      await this.prisma.emailLog.update({
        where: { id: logRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Unknown SMTP error',
        },
      });

      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  async resendEmail(logId: string, tenantId: string) {
    const log = await this.prisma.emailLog.findFirst({
      where: { id: logId, tenantId },
    });
    if (!log) throw new NotFoundException('Email log entry not found');

    return this.sendEmail(tenantId, {
      to: log.recipient,
      cc: log.cc || undefined,
      bcc: log.bcc || undefined,
      subject: log.subject,
      htmlBody: log.htmlBody || '',
      smtpAccountId: log.smtpAccountId || undefined,
      bookingId: log.bookingId || undefined,
      dutySlipId: log.dutySlipId || undefined,
      invoiceId: log.invoiceId || undefined,
      attachType: log.invoiceId ? 'INVOICE' : 'NONE',
    });
  }

  async getLogs(tenantId: string, search?: string, status?: string) {
    const where: any = { tenantId };
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { recipient: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        smtpAccount: { select: { accountName: true, fromEmail: true } },
      },
    });
  }

  async getAnalytics(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [sentToday, totalSent, totalFailed, totalQueued] = await Promise.all([
      this.prisma.emailLog.count({ where: { tenantId, status: 'SENT', createdAt: { gte: startOfToday } } }),
      this.prisma.emailLog.count({ where: { tenantId, status: 'SENT' } }),
      this.prisma.emailLog.count({ where: { tenantId, status: 'FAILED' } }),
      this.prisma.emailLog.count({ where: { tenantId, status: 'QUEUED' } }),
    ]);

    const totalCount = totalSent + totalFailed + totalQueued;
    const deliveryRate = totalCount > 0 ? ((totalSent / totalCount) * 100).toFixed(1) : '100.0';

    return {
      sentToday,
      totalSent,
      totalFailed,
      totalQueued,
      deliveryRate: `${deliveryRate}%`,
    };
  }
}
