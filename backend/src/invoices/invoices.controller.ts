import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { InvoiceStatus } from '@prisma/client';
import * as express from 'express';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Permissions(Permission.INVOICE_CRUD)
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Get('uninvoiced-trips')
  @Permissions(Permission.INVOICE_CRUD)
  findUninvoicedTrips() {
    return this.invoicesService.findUninvoicedTrips();
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.invoicesService.findAll({ page, limit, search, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @Permissions(Permission.INVOICE_CRUD)
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, updateInvoiceDto);
  }

  @Delete(':id')
  @Permissions(Permission.INVOICE_CRUD)
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: express.Response) {
    const pdfBuffer = await this.invoicesService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
