import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantSettingsService } from './tenant-settings.service';
import { TenantSettingsController } from './tenant-settings.controller';

@Module({
  imports: [PrismaModule],
  providers: [TenantSettingsService],
  controllers: [TenantSettingsController],
  exports: [TenantSettingsService],
})
export class TenantSettingsModule {}
