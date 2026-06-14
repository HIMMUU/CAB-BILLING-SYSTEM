import { ReportsService } from './reports.service';
import * as express from 'express';
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
    getBillRegister(gstOption?: string, customerId?: string, state?: string, city?: string, guestName?: string, employeeId?: string, billDateFrom?: string, billDateTo?: string, dutyDateFrom?: string, dutyDateTo?: string, monthOf?: string, billCoverNo?: string): Promise<{
        sn: number;
        id: string;
        billDate: string;
        billNo: string;
        clientName: string;
        guestName: string;
        basicAmt: number;
        ptTaxes: number;
        igst: number;
        cgst: number;
        sgst: number;
        total: number;
    }[]>;
    getBillRegisterPdf(gstOption: string, customerId: string, state: string, city: string, guestName: string, employeeId: string, billDateFrom: string, billDateTo: string, dutyDateFrom: string, dutyDateTo: string, monthOf: string, billCoverNo: string, res: express.Response): Promise<void>;
    getDutySlipRegister(customerId?: string, driverId?: string, vehicleId?: string, status?: string, startDate?: string, endDate?: string, guestName?: string, employeeId?: string, dutySlipFrom?: string, dutySlipTo?: string, vehicleOwnership?: string, billingStatus?: string, dutyType?: string, state?: string, city?: string): Promise<{
        sn: number;
        id: string;
        date: string;
        slipNo: string;
        clientName: string;
        guestName: string;
        driverName: string;
        vehicleNo: string;
        startKm: number;
        endKm: string | number;
        runKm: string | number;
        status: import(".prisma/client").$Enums.DutySlipStatus;
    }[]>;
    getDutySlipRegisterPdf(customerId: string, driverId: string, vehicleId: string, status: string, startDate: string, endDate: string, guestName: string, employeeId: string, dutySlipFrom: string, dutySlipTo: string, vehicleOwnership: string, billingStatus: string, dutyType: string, state: string, city: string, res: express.Response): Promise<void>;
}
