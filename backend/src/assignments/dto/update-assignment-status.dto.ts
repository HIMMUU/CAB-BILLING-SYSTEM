import { IsEnum, IsNotEmpty } from 'class-validator';
import { AssignmentStatus } from '@prisma/client';

export class UpdateAssignmentStatusDto {
  @IsEnum(AssignmentStatus, {
    message: 'Status must be ACTIVE, COMPLETED, or CANCELLED',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status: AssignmentStatus;
}
