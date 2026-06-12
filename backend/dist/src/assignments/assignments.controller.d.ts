import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { AssignmentStatus } from '@prisma/client';
export declare class AssignmentsController {
    private readonly assignmentsService;
    constructor(assignmentsService: AssignmentsService);
    create(createAssignmentDto: CreateAssignmentDto): Promise<{
        driver: {
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
        };
        vehicle: {
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
        };
        booking: {
            customer: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                status: string;
                tenantId: string;
                companyName: string | null;
                type: import(".prisma/client").$Enums.CustomerType;
                gstNumber: string | null;
                phone: string;
                billingAddress: string;
                creditLimit: import("@prisma/client/runtime/library").Decimal;
                paymentTerms: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BookingStatus;
            tenantId: string;
            tripType: import(".prisma/client").$Enums.TripType;
            customerId: string;
            bookingNumber: string;
            pickupLocation: string;
            dropLocation: string;
            pickupDate: Date;
            pickupTime: string;
            vehicleTypeRequired: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AssignmentStatus;
        tenantId: string;
        driverId: string;
        bookingId: string;
        vehicleId: string;
        assignedAt: Date;
        assignedById: string | null;
    }>;
    findAll(page?: number, limit?: number, search?: string, status?: AssignmentStatus): Promise<{
        data: ({
            driver: {
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
            };
            vehicle: {
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
            };
            booking: {
                customer: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string | null;
                    status: string;
                    tenantId: string;
                    companyName: string | null;
                    type: import(".prisma/client").$Enums.CustomerType;
                    gstNumber: string | null;
                    phone: string;
                    billingAddress: string;
                    creditLimit: import("@prisma/client/runtime/library").Decimal;
                    paymentTerms: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.BookingStatus;
                tenantId: string;
                tripType: import(".prisma/client").$Enums.TripType;
                customerId: string;
                bookingNumber: string;
                pickupLocation: string;
                dropLocation: string;
                pickupDate: Date;
                pickupTime: string;
                vehicleTypeRequired: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            tenantId: string;
            driverId: string;
            bookingId: string;
            vehicleId: string;
            assignedAt: Date;
            assignedById: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findAvailableResources(bookingId: string): Promise<{
        drivers: {
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
        vehicles: {
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
        booking: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BookingStatus;
            tenantId: string;
            tripType: import(".prisma/client").$Enums.TripType;
            customerId: string;
            bookingNumber: string;
            pickupLocation: string;
            dropLocation: string;
            pickupDate: Date;
            pickupTime: string;
            vehicleTypeRequired: string;
        };
    }>;
    updateStatus(id: string, updateAssignmentStatusDto: UpdateAssignmentStatusDto): Promise<{
        driver: {
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
        };
        vehicle: {
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
        };
        booking: {
            customer: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                status: string;
                tenantId: string;
                companyName: string | null;
                type: import(".prisma/client").$Enums.CustomerType;
                gstNumber: string | null;
                phone: string;
                billingAddress: string;
                creditLimit: import("@prisma/client/runtime/library").Decimal;
                paymentTerms: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BookingStatus;
            tenantId: string;
            tripType: import(".prisma/client").$Enums.TripType;
            customerId: string;
            bookingNumber: string;
            pickupLocation: string;
            dropLocation: string;
            pickupDate: Date;
            pickupTime: string;
            vehicleTypeRequired: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AssignmentStatus;
        tenantId: string;
        driverId: string;
        bookingId: string;
        vehicleId: string;
        assignedAt: Date;
        assignedById: string | null;
    }>;
}
