import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverStatus } from '@prisma/client';
export declare class DriversController {
    private readonly driversService;
    constructor(driversService: DriversService);
    create(createDriverDto: CreateDriverDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DriverStatus;
        tenantId: string;
        mobile: string;
        licenseNumber: string;
        licenseExpiry: Date;
        address: string;
        emergencyContact: string;
    }>;
    findAll(page?: number, limit?: number, search?: string, status?: DriverStatus): Promise<{
        data: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.DriverStatus;
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
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DriverStatus;
        tenantId: string;
        mobile: string;
        licenseNumber: string;
        licenseExpiry: Date;
        address: string;
        emergencyContact: string;
    }>;
    update(id: string, updateDriverDto: UpdateDriverDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DriverStatus;
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
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DriverStatus;
        tenantId: string;
        mobile: string;
        licenseNumber: string;
        licenseExpiry: Date;
        address: string;
        emergencyContact: string;
    }>;
}
