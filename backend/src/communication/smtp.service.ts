import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { CreateSmtpAccountDto, UpdateSmtpAccountDto } from './dto/smtp-account.dto';

@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);

  constructor(private readonly prisma: PrismaService) {}

  async testConnection(accountData: CreateSmtpAccountDto): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = nodemailer.createTransport({
        host: accountData.host,
        port: Number(accountData.port) || 587,
        secure: accountData.port === 465 || accountData.encryption === 'SSL',
        auth: {
          user: accountData.username,
          pass: accountData.password,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      await transporter.verify();
      return { success: true, message: 'SMTP server connected successfully!' };
    } catch (error: any) {
      this.logger.error(`SMTP Connection Test Failed: ${error.message}`);
      return { success: false, message: error.message || 'Failed to connect to SMTP server' };
    }
  }

  async getTransporterForTenant(tenantId: string, customSmtpAccountId?: string): Promise<{ transporter: nodemailer.Transporter; account: any }> {
    let account: any = null;

    if (customSmtpAccountId) {
      account = await this.prisma.smtpAccount.findFirst({
        where: { id: customSmtpAccountId, tenantId, isActive: true },
      });
    }

    if (!account) {
      account = await this.prisma.smtpAccount.findFirst({
        where: { tenantId, isDefault: true, isActive: true },
      });
    }

    if (!account) {
      account = await this.prisma.smtpAccount.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!account) {
      throw new BadRequestException('No active SMTP account configured. Please add an SMTP account under Communication > Settings.');
    }

    const transporter = nodemailer.createTransport({
      host: account.host,
      port: account.port,
      secure: account.port === 465 || account.encryption === 'SSL',
      auth: {
        user: account.username,
        pass: account.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    return { transporter, account };
  }

  async findAll(tenantId: string) {
    return this.prisma.smtpAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: CreateSmtpAccountDto) {
    if (dto.isDefault) {
      await this.prisma.smtpAccount.updateMany({
        where: { tenantId },
        data: { isDefault: false },
      });
    }

    return this.prisma.smtpAccount.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateSmtpAccountDto) {
    if (dto.isDefault) {
      await this.prisma.smtpAccount.updateMany({
        where: { tenantId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.smtpAccount.update({
      where: { id },
      data: { ...dto },
    });
  }

  async delete(id: string, tenantId: string) {
    return this.prisma.smtpAccount.delete({
      where: { id },
    });
  }
}
