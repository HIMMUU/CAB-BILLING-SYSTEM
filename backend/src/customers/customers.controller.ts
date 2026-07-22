import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { CustomerType } from '@prisma/client';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Permissions(Permission.CUSTOMER_CRUD)
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @Permissions(Permission.CUSTOMER_VIEW)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('type') type?: CustomerType,
  ) {
    return this.customersService.findAll({ page, limit, search, type });
  }

  @Get(':id')
  @Permissions(Permission.CUSTOMER_VIEW)
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Permissions(Permission.CUSTOMER_CRUD)
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @Permissions(Permission.CUSTOMER_CRUD)
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Get(':id/history')
  @Permissions(Permission.CUSTOMER_VIEW)
  getHistory(@Param('id') id: string) {
    return this.customersService.getHistory(id);
  }
}
