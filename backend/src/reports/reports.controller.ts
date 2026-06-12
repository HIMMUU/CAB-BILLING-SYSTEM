import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';

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
}
