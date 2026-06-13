import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleStatus } from '@prisma/client';
export declare class VehiclesController {
    private readonly vehiclesService;
    constructor(vehiclesService: VehiclesService);
    create(createVehicleDto: CreateVehicleDto): Promise<{
        model: string;
        id: string;
        status: import(".prisma/client").$Enums.VehicleStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        vehicleNumber: string;
        vehicleType: string;
        seatingCapacity: number;
        registrationDate: Date;
        insuranceExpiry: Date;
        fitnessExpiry: Date;
        permitExpiry: Date;
    }>;
    findAll(page?: number, limit?: number, search?: string, status?: VehicleStatus): Promise<{
        data: {
            model: string;
            id: string;
            status: import(".prisma/client").$Enums.VehicleStatus;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            vehicleNumber: string;
            vehicleType: string;
            seatingCapacity: number;
            registrationDate: Date;
            insuranceExpiry: Date;
            fitnessExpiry: Date;
            permitExpiry: Date;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        model: string;
        id: string;
        status: import(".prisma/client").$Enums.VehicleStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        vehicleNumber: string;
        vehicleType: string;
        seatingCapacity: number;
        registrationDate: Date;
        insuranceExpiry: Date;
        fitnessExpiry: Date;
        permitExpiry: Date;
    }>;
    update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<{
        model: string;
        id: string;
        status: import(".prisma/client").$Enums.VehicleStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        vehicleNumber: string;
        vehicleType: string;
        seatingCapacity: number;
        registrationDate: Date;
        insuranceExpiry: Date;
        fitnessExpiry: Date;
        permitExpiry: Date;
    }>;
    remove(id: string): Promise<{
        model: string;
        id: string;
        status: import(".prisma/client").$Enums.VehicleStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        vehicleNumber: string;
        vehicleType: string;
        seatingCapacity: number;
        registrationDate: Date;
        insuranceExpiry: Date;
        fitnessExpiry: Date;
        permitExpiry: Date;
    }>;
}
