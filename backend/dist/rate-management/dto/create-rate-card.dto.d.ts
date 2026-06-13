export declare class CreateRateCardDto {
    customerId?: string;
    clientType: string;
    vehicleCategoryId: string;
    halfDayRate?: number;
    fullDayRate?: number;
    includedKm?: number;
    extraKmRate?: number;
    extraHourRate?: number;
    minKmPerDay?: number;
    outstationRatePerKm?: number;
    driverAllowance?: number;
    nightCharge?: number;
    nightStartTime?: string;
    nightEndTime?: string;
    effectiveFrom?: string;
    status?: string;
    minHr?: number;
    minKm?: number;
    fullHr?: number;
    fullKm?: number;
    outstationNightCharge?: number;
}
