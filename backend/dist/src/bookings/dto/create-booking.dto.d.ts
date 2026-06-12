import { TripType, BookingStatus } from '@prisma/client';
export declare class CreateBookingDto {
    customerId: string;
    pickupLocation: string;
    dropLocation: string;
    pickupDate: string;
    pickupTime: string;
    tripType: TripType;
    vehicleTypeRequired: string;
    status?: BookingStatus;
}
