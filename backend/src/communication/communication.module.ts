import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { SmtpService } from './smtp.service';
import { TemplateService } from './template.service';
import { EmailService } from './email.service';
import { AutomationService } from './automation.service';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [InvoicesModule],
  controllers: [CommunicationController],
  providers: [SmtpService, TemplateService, EmailService, AutomationService],
  exports: [SmtpService, TemplateService, EmailService, AutomationService],
})
export class CommunicationModule {}
