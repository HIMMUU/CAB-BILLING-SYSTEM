import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getWidgetsSummary(): Promise<{
        todaysBookings: number;
        activeTrips: number;
        availableDrivers: number;
        availableVehicles: number;
        revenue: number;
        outstanding: number;
    }>;
    getDashboardCharts(): Promise<{
        date: string;
        bookingsCount: number;
        revenueValue: number;
    }[]>;
}
