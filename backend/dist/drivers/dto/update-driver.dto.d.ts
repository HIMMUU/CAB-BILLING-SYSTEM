import { DriverStatus } from '@prisma/client';
export declare class UpdateDriverDto {
    name?: string;
    mobile?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    address?: string;
    emergencyContact?: string;
    status?: DriverStatus;
}
