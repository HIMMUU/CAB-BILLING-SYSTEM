import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RateManagementController } from './rate-management.controller';
import { RateManagementService } from './rate-management.service';

@Module({
  imports: [PrismaModule],
  controllers: [RateManagementController],
  providers: [RateManagementService],
  exports: [RateManagementService],
})
export class RateManagementModule {}
