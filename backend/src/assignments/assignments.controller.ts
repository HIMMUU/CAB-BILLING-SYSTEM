import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { AssignmentStatus } from '@prisma/client';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Permissions(Permission.ASSIGN_RESOURCES)
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createAssignmentDto);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: AssignmentStatus,
  ) {
    return this.assignmentsService.findAll({ page, limit, search, status });
  }

  @Get('available-resources')
  @Permissions(Permission.ASSIGN_RESOURCES)
  findAvailableResources(@Query('bookingId') bookingId: string) {
    return this.assignmentsService.findAvailableResources(bookingId);
  }

  @Patch(':id/status')
  @Permissions(Permission.ASSIGN_RESOURCES)
  updateStatus(
    @Param('id') id: string,
    @Body() updateAssignmentStatusDto: UpdateAssignmentStatusDto,
  ) {
    return this.assignmentsService.updateStatus(id, updateAssignmentStatusDto);
  }
}
