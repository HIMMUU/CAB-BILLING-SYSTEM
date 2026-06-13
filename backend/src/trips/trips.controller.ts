import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CloseTripDto } from './dto/close-trip.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @Permissions(Permission.CLOSE_TRIP)
  closeTrip(@Body() closeTripDto: CloseTripDto) {
    return this.tripsService.closeTrip(closeTripDto);
  }

  @Get('calculate')
  @Permissions(Permission.CLOSE_TRIP)
  calculate(
    @Query('dutySlipId') dutySlipId: string,
    @Query('endKm') endKm: number,
    @Query('startDateTime') startDateTime?: string,
    @Query('endDateTime') endDateTime?: string,
  ) {
    const start = startDateTime ? new Date(startDateTime) : undefined;
    const end = endDateTime ? new Date(endDateTime) : undefined;
    return this.tripsService.calculateTripCharges(dutySlipId, Number(endKm), start, end);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tripsService.findAll({ page, limit });
  }
}
