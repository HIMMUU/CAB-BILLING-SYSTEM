import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { DutySlipsService } from './duty-slips.service';
import { CreateDutySlipDto } from './dto/create-duty-slip.dto';
import { UpdateDutySlipDto } from './dto/update-duty-slip.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { DutySlipStatus } from '@prisma/client';
import * as express from 'express';

@Controller('duty-slips')
export class DutySlipsController {
  constructor(private readonly dutySlipsService: DutySlipsService) {}

  @Post()
  @Permissions(Permission.GENERATE_DUTY_SLIP)
  create(@Body() createDutySlipDto: CreateDutySlipDto) {
    return this.dutySlipsService.create(createDutySlipDto);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: DutySlipStatus,
  ) {
    return this.dutySlipsService.findAll({ page, limit, search, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dutySlipsService.findOne(id);
  }

  @Patch(':id')
  @Permissions(Permission.GENERATE_DUTY_SLIP)
  update(
    @Param('id') id: string,
    @Body() updateDutySlipDto: UpdateDutySlipDto,
  ) {
    return this.dutySlipsService.update(id, updateDutySlipDto);
  }

  @Delete(':id')
  @Permissions(Permission.GENERATE_DUTY_SLIP)
  remove(@Param('id') id: string) {
    return this.dutySlipsService.remove(id);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: express.Response) {
    const pdfBuffer = await this.dutySlipsService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="duty-slip-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
