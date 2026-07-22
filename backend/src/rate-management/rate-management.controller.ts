import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Header,
} from '@nestjs/common';
import { RateManagementService } from './rate-management.service';
import { CreateRateCardDto } from './dto/create-rate-card.dto';
import { UpdateRateCardDto } from './dto/update-rate-card.dto';
import { CreateTaxConfigDto } from './dto/create-tax-config.dto';
import { UpdateTaxConfigDto } from './dto/update-tax-config.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';

@Controller('rate-management')
export class RateManagementController {
  constructor(private readonly rateManagementService: RateManagementService) {}

  // =========================================================================
  // VEHICLE CATEGORIES
  // =========================================================================

  @Get('categories')
  @Permissions(Permission.RATE_VIEW)
  findAllCategories() {
    return this.rateManagementService.findAllCategories();
  }

  // =========================================================================
  // RATE CARDS
  // =========================================================================

  @Post('rate-cards')
  @Permissions(Permission.RATE_CRUD)
  createRateCard(@Body() createRateCardDto: CreateRateCardDto) {
    return this.rateManagementService.createRateCard(createRateCardDto);
  }

  @Get('rate-cards')
  @Permissions(Permission.RATE_VIEW)
  findAllRateCards(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('clientType') clientType?: string,
    @Query('customerId') customerId?: string,
    @Query('vehicleCategoryId') vehicleCategoryId?: string,
    @Query('effectiveDate') effectiveDate?: string,
  ) {
    return this.rateManagementService.findAllRateCards({
      page,
      limit,
      search,
      clientType,
      customerId,
      vehicleCategoryId,
      effectiveDate,
    });
  }

  @Get('rate-cards/export')
  @Permissions(Permission.RATE_VIEW)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="rate_cards.csv"')
  exportRateCards() {
    return this.rateManagementService.exportRateCardsToCsv();
  }

  @Get('rate-cards/:id')
  @Permissions(Permission.RATE_VIEW)
  findOneRateCard(@Param('id') id: string) {
    return this.rateManagementService.findOneRateCard(id);
  }

  @Patch('rate-cards/:id')
  @Permissions(Permission.RATE_CRUD)
  updateRateCard(
    @Param('id') id: string,
    @Body() updateRateCardDto: UpdateRateCardDto,
  ) {
    return this.rateManagementService.updateRateCard(id, updateRateCardDto);
  }

  @Post('rate-cards/:id/clone')
  @Permissions(Permission.RATE_CRUD)
  cloneRateCard(@Param('id') id: string) {
    return this.rateManagementService.cloneRateCard(id);
  }

  @Delete('rate-cards/:id')
  @Permissions(Permission.RATE_CRUD)
  removeRateCard(@Param('id') id: string) {
    return this.rateManagementService.removeRateCard(id);
  }

  // =========================================================================
  // TAX CONFIGURATIONS
  // =========================================================================

  @Post('tax-configs')
  @Permissions(Permission.RATE_CRUD)
  createTaxConfig(@Body() createTaxConfigDto: CreateTaxConfigDto) {
    return this.rateManagementService.createTaxConfig(createTaxConfigDto);
  }

  @Get('tax-configs')
  @Permissions(Permission.RATE_VIEW)
  findAllTaxConfigs() {
    return this.rateManagementService.findAllTaxConfigs();
  }

  @Get('tax-configs/:id')
  @Permissions(Permission.RATE_VIEW)
  findOneTaxConfig(@Param('id') id: string) {
    return this.rateManagementService.findOneTaxConfig(id);
  }

  @Patch('tax-configs/:id')
  @Permissions(Permission.RATE_CRUD)
  updateTaxConfig(
    @Param('id') id: string,
    @Body() updateTaxConfigDto: UpdateTaxConfigDto,
  ) {
    return this.rateManagementService.updateTaxConfig(id, updateTaxConfigDto);
  }

  @Post('tax-configs/:id/activate')
  @Permissions(Permission.RATE_CRUD)
  activateTaxConfig(@Param('id') id: string) {
    return this.rateManagementService.activateTaxConfig(id);
  }

  @Delete('tax-configs/:id')
  @Permissions(Permission.RATE_CRUD)
  removeTaxConfig(@Param('id') id: string) {
    return this.rateManagementService.removeTaxConfig(id);
  }

  // =========================================================================
  // AUDIT LOGS
  // =========================================================================

  @Get('audit-logs')
  @Permissions(Permission.RATE_VIEW)
  findAuditLogs() {
    return this.rateManagementService.findAuditLogs();
  }
}
