import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverStatus } from '@prisma/client';
export declare class DriversService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateDriverDto): Promise<{
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.DriverStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        mobile: string;
        licenseNumber: string;
        licenseExpiry: Date;
        address: string;
        emergencyContact: string;
    }>;
    findAll(query: {
        page?: number;
        limit?: number;
        search?: string;
        status?: DriverStatus;
    }): Promise<{
        data: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.DriverStatus;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            mobile: string;
            licenseNumber: string;
            licenseExpiry: Date;
            address: string;
            emergencyContact: string;
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
        name: string;
        status: import(".prisma/client").$Enums.DriverStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        mobile: string;
        licenseNumber: string;
        licenseExpiry: Date;
        address: string;
        emergencyContact: string;
    }>;
    update(id: string, dto: UpdateDriverDto): Promise<{
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.DriverStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        mobile: string;
        licenseNumber: string;
        licenseExpiry: Date;
        address: string;
        emergencyContact: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.DriverStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        mobile: string;
        licenseNumber: string;
        licenseExpiry: Date;
        address: string;
        emergencyContact: string;
    }>;
}
