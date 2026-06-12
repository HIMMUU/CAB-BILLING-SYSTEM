import { DutySlipStatus } from '@prisma/client';
export declare class UpdateDutySlipDto {
    reportingTime?: string;
    startKm?: number;
    endKm?: number;
    toll?: number;
    parking?: number;
    nightCharges?: number;
    driverAllowance?: number;
    extraCharges?: number;
    status?: DutySlipStatus;
}
