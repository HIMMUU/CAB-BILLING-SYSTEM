import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getRevenueReport(startDate?: string, endDate?: string): Promise<{
        summary: {
            totalSubtotal: number;
            totalTax: number;
            totalAmount: number;
            totalPaid: number;
            totalDue: number;
            invoiceCount: number;
        };
        timeline: {
            date: string;
            revenue: number;
            collections: number;
        }[];
    }>;
    getBookingReport(startDate?: string, endDate?: string): Promise<{
        totalBookings: number;
        statusBreakdown: Record<string, number>;
        typeBreakdown: Record<string, number>;
    }>;
    getVehicleUtilization(startDate?: string, endDate?: string): Promise<{
        vehicleId: string;
        vehicleNumber: string;
        model: string;
        vehicleType: string;
        status: import(".prisma/client").$Enums.VehicleStatus;
        tripsCount: number;
        totalKm: number;
        totalRevenue: number;
    }[]>;
    getDriversReport(startDate?: string, endDate?: string): Promise<{
        driverId: string;
        name: string;
        mobile: string;
        status: import(".prisma/client").$Enums.DriverStatus;
        tripsCount: number;
        totalKm: number;
        driverAllowance: number;
        totalRevenue: number;
    }[]>;
    getOutstandingReport(): Promise<{
        summary: {
            current: number;
            overdue1to30: number;
            overdue31to60: number;
            overdue61Plus: number;
            totalOutstanding: number;
        };
        ledger: {
            customerId: string;
            customerName: string;
            companyName: string | null;
            totalOutstanding: number;
            current: number;
            overdue1to30: number;
            overdue31to60: number;
            overdue61Plus: number;
        }[];
    }>;
}
