import { VehicleStatus } from '@prisma/client';
export declare class CreateVehicleDto {
    vehicleNumber: string;
    vehicleType: string;
    model: string;
    seatingCapacity: number;
    registrationDate: string;
    insuranceExpiry: string;
    fitnessExpiry: string;
    permitExpiry: string;
    status?: VehicleStatus;
}
