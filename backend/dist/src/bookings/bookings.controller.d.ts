import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from '@prisma/client';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
    create(createBookingDto: CreateBookingDto): Promise<{
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
    }>;
    findAll(page?: number, limit?: number, search?: string, status?: BookingStatus): Promise<{
        data: ({
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
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
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
    }>;
    update(id: string, updateBookingDto: UpdateBookingDto): Promise<{
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
    }>;
    remove(id: string): Promise<{
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
    }>;
}
