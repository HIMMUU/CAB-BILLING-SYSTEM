import { Module } from '@nestjs/common';
import { DutySlipsService } from './duty-slips.service';
import { DutySlipsController } from './duty-slips.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DutySlipsController],
  providers: [DutySlipsService],
  exports: [DutySlipsService],
})
export class DutySlipsModule {}
