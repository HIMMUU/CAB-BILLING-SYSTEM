import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
