import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('super-admin')
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tenants')
  async getTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch('tenants/:id')
  async updateTenant(
    @Param('id') id: string,
    @Body() body: { status?: string; subscriptionPlan?: string },
  ) {
    return this.prisma.tenant.update({
      where: { id },
      data: body,
    });
  }

  @Get('metrics')
  async getMetrics() {
    const tenants = await this.prisma.tenant.findMany();
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;
    const suspendedTenants = tenants.filter((t) => t.status === 'SUSPENDED').length;

    // Calculate MRR based on active plans
    let mrr = 0;
    tenants.forEach((t) => {
      if (t.status === 'ACTIVE') {
        if (t.subscriptionPlan === 'Starter') mrr += 2999;
        else if (t.subscriptionPlan === 'Growth') mrr += 6999;
        else if (t.subscriptionPlan === 'Enterprise') mrr += 14999;
      }
    });

    const totalUsers = await this.prisma.user.count();
    const totalBookings = await this.prisma.booking.count();
    const totalInvoices = await this.prisma.invoice.count();

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      mrr,
      totalUsers,
      totalBookings,
      totalInvoices,
    };
  }
}
