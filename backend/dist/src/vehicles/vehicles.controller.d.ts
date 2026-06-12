import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleStatus } from '@prisma/client';
export declare class VehiclesController {
    private readonly vehiclesService;
    constructor(vehiclesService: VehiclesService);
    create(createVehicleDto: CreateVehicleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.VehicleStatus;
        tenantId: string;
        vehicleType: string;
        vehicleNumber: string;
        model: string;
        seatingCapacity: number;
        registrationDate: Date;
        insuranceExpiry: Date;
        fitnessExpiry: Date;
        permitExpiry: Date;
    }>;
    findAll(page?: number, limit?: number, search?: string, status?: VehicleStatus): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.VehicleStatus;
            tenantId: string;
            vehicleType: string;
            vehicleNumber: string;
            model: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.VehicleStatus;
        tenantId: string;
        vehicleType: string;
        vehicleNumber: string;
        model: string;
        seatingCapacity: number;
        registrationDate: Date;
        insuranceExpiry: Date;
        fitnessExpiry: Date;
        permitExpiry: Date;
    }>;
    update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.VehicleStatus;
        tenantId: string;
        vehicleType: string;
        vehicleNumber: string;
        model: string;
        seatingCapacity: number;
        registrationDate: Date;
        insuranceExpiry: Date;
        fitnessExpiry: Date;
        permitExpiry: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.VehicleStatus;
        tenantId: string;
        vehicleType: string;
        vehicleNumber: string;
        model: string;
        seatingCapacity: number;
        registrationDate: Date;
        insuranceExpiry: Date;
        fitnessExpiry: Date;
        permitExpiry: Date;
    }>;
}
