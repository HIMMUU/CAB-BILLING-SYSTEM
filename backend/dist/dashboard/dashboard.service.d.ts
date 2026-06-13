import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getWidgetsSummary(): Promise<{
        todaysBookings: number;
        activeTrips: number;
        availableDrivers: number;
        availableVehicles: number;
        revenue: number;
        outstanding: number;
    }>;
    getDashboardChartData(): Promise<{
        date: string;
        bookingsCount: number;
        revenueValue: number;
    }[]>;
}
