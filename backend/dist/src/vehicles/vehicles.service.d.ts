import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleStatus } from '@prisma/client';
export declare class VehiclesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private cleanVehicleNumber;
    create(dto: CreateVehicleDto): Promise<{
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
    findAll(query: {
        page?: number;
        limit?: number;
        search?: string;
        status?: VehicleStatus;
    }): Promise<{
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
    update(id: string, dto: UpdateVehicleDto): Promise<{
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
