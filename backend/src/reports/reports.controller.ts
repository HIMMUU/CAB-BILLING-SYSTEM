import { Controller, Get, Query, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import * as express from 'express';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @Permissions(Permission.FINANCIAL_REPORTS)
  getRevenueReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getRevenueReport(startDate, endDate);
  }

  @Get('bookings')
  @Permissions(Permission.OPERATIONS_REPORTS)
  getBookingReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getBookingReport(startDate, endDate);
  }

  @Get('vehicle-utilization')
  @Permissions(Permission.OPERATIONS_REPORTS)
  getVehicleUtilization(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getVehicleUtilizationReport(startDate, endDate);
  }

  @Get('drivers')
  @Permissions(Permission.OPERATIONS_REPORTS)
  getDriversReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDriverReport(startDate, endDate);
  }

  @Get('outstanding')
  @Permissions(Permission.FINANCIAL_REPORTS)
  getOutstandingReport() {
    return this.reportsService.getOutstandingReport();
  }

  @Get('bill-register')
  @Permissions(Permission.FINANCIAL_REPORTS)
  getBillRegister(
    @Query('gstOption') gstOption?: string,
    @Query('customerId') customerId?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('guestName') guestName?: string,
    @Query('employeeId') employeeId?: string,
    @Query('billDateFrom') billDateFrom?: string,
    @Query('billDateTo') billDateTo?: string,
    @Query('dutyDateFrom') dutyDateFrom?: string,
    @Query('dutyDateTo') dutyDateTo?: string,
    @Query('monthOf') monthOf?: string,
    @Query('billCoverNo') billCoverNo?: string,
  ) {
    return this.reportsService.getBillRegisterData({
      gstOption,
      customerId,
      state,
      city,
      guestName,
      employeeId,
      billDateFrom,
      billDateTo,
      dutyDateFrom,
      dutyDateTo,
      monthOf,
      billCoverNo,
    });
  }

  @Get('bill-register/pdf')
  @Permissions(Permission.FINANCIAL_REPORTS)
  async getBillRegisterPdf(
    @Query('gstOption') gstOption: string,
    @Query('customerId') customerId: string,
    @Query('state') state: string,
    @Query('city') city: string,
    @Query('guestName') guestName: string,
    @Query('employeeId') employeeId: string,
    @Query('billDateFrom') billDateFrom: string,
    @Query('billDateTo') billDateTo: string,
    @Query('dutyDateFrom') dutyDateFrom: string,
    @Query('dutyDateTo') dutyDateTo: string,
    @Query('monthOf') monthOf: string,
    @Query('billCoverNo') billCoverNo: string,
    @Res() res: express.Response,
  ) {
    const pdfBuffer = await this.reportsService.generateBillRegisterPdf({
      gstOption,
      customerId,
      state,
      city,
      guestName,
      employeeId,
      billDateFrom,
      billDateTo,
      dutyDateFrom,
      dutyDateTo,
      monthOf,
      billCoverNo,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bill-register-${Date.now()}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('duty-slip-register')
  @Permissions(Permission.OPERATIONS_REPORTS)
  getDutySlipRegister(
    @Query('customerId') customerId?: string,
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('guestName') guestName?: string,
    @Query('employeeId') employeeId?: string,
    @Query('dutySlipFrom') dutySlipFrom?: string,
    @Query('dutySlipTo') dutySlipTo?: string,
    @Query('vehicleOwnership') vehicleOwnership?: string,
    @Query('billingStatus') billingStatus?: string,
    @Query('dutyType') dutyType?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
  ) {
    return this.reportsService.getDutySlipRegisterData({
      customerId,
      driverId,
      vehicleId,
      status,
      startDate,
      endDate,
      guestName,
      employeeId,
      dutySlipFrom,
      dutySlipTo,
      vehicleOwnership,
      billingStatus,
      dutyType,
      state,
      city,
    });
  }

  @Get('duty-slip-register/pdf')
  @Permissions(Permission.OPERATIONS_REPORTS)
  async getDutySlipRegisterPdf(
    @Query('customerId') customerId: string,
    @Query('driverId') driverId: string,
    @Query('vehicleId') vehicleId: string,
    @Query('status') status: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('guestName') guestName: string,
    @Query('employeeId') employeeId: string,
    @Query('dutySlipFrom') dutySlipFrom: string,
    @Query('dutySlipTo') dutySlipTo: string,
    @Query('vehicleOwnership') vehicleOwnership: string,
    @Query('billingStatus') billingStatus: string,
    @Query('dutyType') dutyType: string,
    @Query('state') state: string,
    @Query('city') city: string,
    @Res() res: express.Response,
  ) {
    const pdfBuffer = await this.reportsService.generateDutySlipRegisterPdf({
      customerId,
      driverId,
      vehicleId,
      status,
      startDate,
      endDate,
      guestName,
      employeeId,
      dutySlipFrom,
      dutySlipTo,
      vehicleOwnership,
      billingStatus,
      dutyType,
      state,
      city,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="duty-slip-register-${Date.now()}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
