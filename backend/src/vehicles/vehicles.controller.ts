import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { VehicleStatus } from '@prisma/client';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Permissions(Permission.VEHICLE_CRUD)
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  @Permissions(Permission.VEHICLE_VIEW)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: VehicleStatus,
  ) {
    return this.vehiclesService.findAll({ page, limit, search, status });
  }

  @Get(':id')
  @Permissions(Permission.VEHICLE_VIEW)
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @Permissions(Permission.VEHICLE_CRUD)
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  @Permissions(Permission.VEHICLE_CRUD)
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
