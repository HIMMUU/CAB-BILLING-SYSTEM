import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { TemplateService } from './template.service';
import { EmailService } from './email.service';
import { AutomationService } from './automation.service';
import { CreateSmtpAccountDto, UpdateSmtpAccountDto, TestSmtpConnectionDto } from './dto/smtp-account.dto';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto/email-template.dto';
import { CreateEmailAutomationDto, UpdateEmailAutomationDto } from './dto/email-automation.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('communication')
@UseGuards(TenantGuard)
export class CommunicationController {
  constructor(
    private readonly smtpService: SmtpService,
    private readonly templateService: TemplateService,
    private readonly emailService: EmailService,
    private readonly automationService: AutomationService,
  ) {}

  // ─── Analytics & Email Dispatch ───
  @Get('analytics')
  async getAnalytics(@Req() req: any) {
    return this.emailService.getAnalytics(req.tenantId);
  }

  @Post('send')
  async sendEmail(@Req() req: any, @Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(req.tenantId, dto);
  }

  @Post('resend/:id')
  async resendEmail(@Req() req: any, @Param('id') id: string) {
    return this.emailService.resendEmail(id, req.tenantId);
  }

  @Get('logs')
  async getLogs(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.emailService.getLogs(req.tenantId, search, status);
  }

  // ─── SMTP Accounts ───
  @Get('smtp')
  async getSmtpAccounts(@Req() req: any) {
    return this.smtpService.findAll(req.tenantId);
  }

  @Post('smtp/test')
  async testSmtpConnection(@Body() dto: TestSmtpConnectionDto) {
    return this.smtpService.testConnection(dto);
  }

  @Post('smtp')
  async createSmtpAccount(@Req() req: any, @Body() dto: CreateSmtpAccountDto) {
    return this.smtpService.create(req.tenantId, dto);
  }

  @Put('smtp/:id')
  async updateSmtpAccount(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSmtpAccountDto,
  ) {
    return this.smtpService.update(id, req.tenantId, dto);
  }

  @Delete('smtp/:id')
  async deleteSmtpAccount(@Req() req: any, @Param('id') id: string) {
    return this.smtpService.delete(id, req.tenantId);
  }

  // ─── Email Templates ───
  @Get('templates')
  async getTemplates(@Req() req: any) {
    return this.templateService.findAll(req.tenantId);
  }

  @Post('templates')
  async createTemplate(@Req() req: any, @Body() dto: CreateEmailTemplateDto) {
    return this.templateService.create(req.tenantId, dto);
  }

  @Put('templates/:id')
  async updateTemplate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.templateService.update(id, req.tenantId, dto);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Req() req: any, @Param('id') id: string) {
    return this.templateService.delete(id, req.tenantId);
  }

  // ─── Automations ───
  @Get('automations')
  async getAutomations(@Req() req: any) {
    return this.automationService.findAll(req.tenantId);
  }

  @Post('automations')
  async createAutomation(@Req() req: any, @Body() dto: CreateEmailAutomationDto) {
    return this.automationService.create(req.tenantId, dto);
  }

  @Put('automations/:id')
  async updateAutomation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmailAutomationDto,
  ) {
    return this.automationService.update(id, req.tenantId, dto);
  }

  @Delete('automations/:id')
  async deleteAutomation(@Req() req: any, @Param('id') id: string) {
    return this.automationService.delete(id, req.tenantId);
  }
}
