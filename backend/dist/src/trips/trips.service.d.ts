import { PrismaService } from '../prisma/prisma.service';
import { CloseTripDto } from './dto/close-trip.dto';
export declare class TripsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    calculateTripCharges(dutySlipId: string, endKm: number, extraHours?: number): Promise<{
        baseFareCharged: number;
        extraKmCharged: number;
        extraHoursCharged: number;
        toll: number;
        parking: number;
        driverAllowance: number;
        nightCharges: number;
        extraCharges: number;
        totalDistance: number;
        totalAmount: number;
    }>;
    closeTrip(dto: CloseTripDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        bookingId: string;
        startKm: import("@prisma/client/runtime/library").Decimal;
        endKm: import("@prisma/client/runtime/library").Decimal;
        toll: import("@prisma/client/runtime/library").Decimal;
        parking: import("@prisma/client/runtime/library").Decimal;
        driverAllowance: import("@prisma/client/runtime/library").Decimal;
        extraCharges: import("@prisma/client/runtime/library").Decimal;
        dutySlipId: string;
        totalKm: import("@prisma/client/runtime/library").Decimal;
        baseFareCharged: import("@prisma/client/runtime/library").Decimal;
        extraKmCharged: import("@prisma/client/runtime/library").Decimal;
        extraHoursCharged: import("@prisma/client/runtime/library").Decimal;
        nightChargesCharged: import("@prisma/client/runtime/library").Decimal;
        miscChargesCharged: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        closedAt: Date;
        closedById: string | null;
    }>;
    findAll(query: {
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
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
            dutySlip: {
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
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.DutySlipStatus;
                tenantId: string;
                nightCharges: import("@prisma/client/runtime/library").Decimal;
                driverId: string;
                bookingId: string;
                vehicleId: string;
                dutySlipNumber: string;
                reportingTime: Date;
                startKm: import("@prisma/client/runtime/library").Decimal;
                endKm: import("@prisma/client/runtime/library").Decimal | null;
                toll: import("@prisma/client/runtime/library").Decimal;
                parking: import("@prisma/client/runtime/library").Decimal;
                driverAllowance: import("@prisma/client/runtime/library").Decimal;
                extraCharges: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            bookingId: string;
            startKm: import("@prisma/client/runtime/library").Decimal;
            endKm: import("@prisma/client/runtime/library").Decimal;
            toll: import("@prisma/client/runtime/library").Decimal;
            parking: import("@prisma/client/runtime/library").Decimal;
            driverAllowance: import("@prisma/client/runtime/library").Decimal;
            extraCharges: import("@prisma/client/runtime/library").Decimal;
            dutySlipId: string;
            totalKm: import("@prisma/client/runtime/library").Decimal;
            baseFareCharged: import("@prisma/client/runtime/library").Decimal;
            extraKmCharged: import("@prisma/client/runtime/library").Decimal;
            extraHoursCharged: import("@prisma/client/runtime/library").Decimal;
            nightChargesCharged: import("@prisma/client/runtime/library").Decimal;
            miscChargesCharged: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            closedAt: Date;
            closedById: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
