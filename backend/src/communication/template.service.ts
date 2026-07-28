import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto/email-template.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const templates = await this.prisma.emailTemplate.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    if (templates.length === 0) {
      // Seed default system templates if none exist
      await this.seedDefaultTemplates(tenantId);
      return this.prisma.emailTemplate.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      });
    }

    return templates;
  }

  async findOne(id: string, tenantId: string) {
    const t = await this.prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async create(tenantId: string, dto: CreateEmailTemplateDto) {
    return this.prisma.emailTemplate.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateEmailTemplateDto) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data: { ...dto },
    });
  }

  async delete(id: string, tenantId: string) {
    return this.prisma.emailTemplate.delete({
      where: { id },
    });
  }

  replaceVariables(templateStr: string, variables: Record<string, any>): string {
    if (!templateStr) return '';
    let result = templateStr;
    for (const key of Object.keys(variables)) {
      const val = variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : '';
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, val);
    }
    return result;
  }

  private async seedDefaultTemplates(tenantId: string) {
    const defaults = [
      {
        name: 'Booking Confirmation',
        key: 'BOOKING_CONFIRMATION',
        subject: 'Booking Confirmation #{{booking_number}} - {{company_name}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #1E3A8A;">Booking Confirmation</h2>
            <p>Dear {{customer_name}},</p>
            <p>Thank you for booking with {{company_name}}. Here are your trip details:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Booking No:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{booking_number}}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Pickup Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{trip_date}}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Pickup Location:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{pickup}}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Drop Location:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{drop}}</td></tr>
            </table>
            <p>We wish you a pleasant journey!</p>
            <p>Best regards,<br><strong>{{company_name}}</strong></p>
          </div>
        `,
      },
      {
        name: 'Invoice Delivery',
        key: 'INVOICE_GENERATED',
        subject: 'Tax Invoice #{{invoice_number}} from {{company_name}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #1E3A8A;">Tax Invoice #{{invoice_number}}</h2>
            <p>Dear {{customer_name}},</p>
            <p>Please find attached your Tax Invoice for recent travel services.</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice_number}}</p>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹{{invoice_amount}}</p>
              <p style="margin: 5px 0;"><strong>Due Date:</strong> {{due_date}}</p>
            </div>
            <p>Kindly arrange the payment at your earliest convenience.</p>
            <p>Thank you for choosing {{company_name}}!</p>
          </div>
        `,
      },
      {
        name: 'Duty Slip Copy',
        key: 'DUTY_SLIP_GENERATED',
        subject: 'Trip Duty Slip #{{duty_slip_number}} - {{company_name}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #1E3A8A;">Duty Slip #{{duty_slip_number}}</h2>
            <p>Dear {{customer_name}},</p>
            <p>Please find attached the completed operational duty slip for your trip.</p>
            <p><strong>Driver:</strong> {{driver_name}} ({{driver_phone}})</p>
            <p><strong>Vehicle:</strong> {{vehicle}} ({{vehicle_number}})</p>
            <p>Thank you for traveling with {{company_name}}.</p>
          </div>
        `,
      },
    ];

    for (const item of defaults) {
      await this.prisma.emailTemplate.create({
        data: {
          tenantId,
          ...item,
        },
      });
    }
  }
}
