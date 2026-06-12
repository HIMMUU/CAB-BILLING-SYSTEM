import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { DriverStatus } from '@prisma/client';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @Permissions(Permission.DRIVER_CRUD)
  create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto);
  }

  @Get()
  @Permissions(Permission.DRIVER_VIEW)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: DriverStatus,
  ) {
    return this.driversService.findAll({ page, limit, search, status });
  }

  @Get(':id')
  @Permissions(Permission.DRIVER_VIEW)
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id')
  @Permissions(Permission.DRIVER_CRUD)
  update(@Param('id') id: string, @Body() updateDriverDto: UpdateDriverDto) {
    return this.driversService.update(id, updateDriverDto);
  }

  @Delete(':id')
  @Permissions(Permission.DRIVER_CRUD)
  remove(@Param('id') id: string) {
    return this.driversService.remove(id);
  }
}
