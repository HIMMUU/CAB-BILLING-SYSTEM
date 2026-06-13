import { Body, Controller, Get, Patch } from '@nestjs/common';
import { TenantSettingsService } from './tenant-settings.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';

@Controller('tenant-settings')
export class TenantSettingsController {
  constructor(private readonly tenantSettingsService: TenantSettingsService) {}

  @Get()
  @Permissions(Permission.RATE_VIEW)
  getSettings() {
    return this.tenantSettingsService.getSettings();
  }

  @Patch()
  @Permissions(Permission.RATE_CRUD)
  updateSettings(@Body() dto: UpdateTenantSettingsDto) {
    return this.tenantSettingsService.updateSettings(dto);
  }
}
