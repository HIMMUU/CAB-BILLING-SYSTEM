import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmailAutomationDto, UpdateEmailAutomationDto } from './dto/email-automation.dto';
import { AutomationTrigger } from '@prisma/client';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.emailAutomation.findMany({
      where: { tenantId },
      include: {
        template: { select: { id: true, name: true, key: true, subject: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const auto = await this.prisma.emailAutomation.findFirst({
      where: { id, tenantId },
      include: { template: true },
    });
    if (!auto) throw new NotFoundException('Automation rule not found');
    return auto;
  }

  async create(tenantId: string, dto: CreateEmailAutomationDto) {
    return this.prisma.emailAutomation.create({
      data: {
        tenantId,
        ...dto,
      },
      include: { template: true },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateEmailAutomationDto) {
    return this.prisma.emailAutomation.update({
      where: { id },
      data: { ...dto },
      include: { template: true },
    });
  }

  async delete(id: string, tenantId: string) {
    return this.prisma.emailAutomation.delete({
      where: { id },
    });
  }

  /**
   * Channel-Agnostic Event Listener Trigger
   * Can be invoked whenever a Booking is created, Invoice is generated, Duty Slip is filled, etc.
   */
  async handleEventTrigger(tenantId: string, trigger: AutomationTrigger, entityData: Record<string, any>) {
    const automations = await this.prisma.emailAutomation.findMany({
      where: { tenantId, trigger, isActive: true },
      include: { template: true },
    });

    if (automations.length === 0) return;

    this.logger.log(`Found ${automations.length} active automation rules for trigger: ${trigger}`);

    // Processes active automation rules
    for (const rule of automations) {
      if (!rule.template) continue;
      this.logger.log(`Processing automation rule: "${rule.name}" for trigger "${trigger}"`);
      // Future-proofed dispatch queue for Email / SMS / WhatsApp
    }
  }
}
