"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWidgetsSummary() {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [todaysBookings, activeTrips, availableDrivers, availableVehicles, revenueAggregation,] = await Promise.all([
            this.prisma.booking.count({
                where: {
                    pickupDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                },
            }),
            this.prisma.booking.count({
                where: {
                    status: client_1.BookingStatus.STARTED,
                },
            }),
            this.prisma.driver.count({
                where: {
                    status: client_1.DriverStatus.AVAILABLE,
                },
            }),
            this.prisma.vehicle.count({
                where: {
                    status: client_1.VehicleStatus.AVAILABLE,
                },
            }),
            this.prisma.invoice.aggregate({
                _sum: {
                    totalAmount: true,
                    dueAmount: true,
                },
                where: {
                    status: {
                        not: 'VOID',
                    },
                },
            }),
        ]);
        const revenue = Number(revenueAggregation._sum.totalAmount || 0);
        const outstanding = Number(revenueAggregation._sum.dueAmount || 0);
        return {
            todaysBookings,
            activeTrips,
            availableDrivers,
            availableVehicles,
            revenue,
            outstanding,
        };
    }
    async getDashboardChartData() {
        const today = new Date();
        const past7Days = new Date();
        past7Days.setDate(today.getDate() - 7);
        const [bookings, invoices] = await Promise.all([
            this.prisma.booking.findMany({
                where: {
                    createdAt: {
                        gte: past7Days,
                    },
                },
                select: {
                    createdAt: true,
                    status: true,
                },
            }),
            this.prisma.invoice.findMany({
                where: {
                    invoiceDate: {
                        gte: past7Days,
                    },
                },
                select: {
                    invoiceDate: true,
                    totalAmount: true,
                },
            }),
        ]);
        const chartMap = new Map();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            chartMap.set(dateStr, { date: dateStr, bookingsCount: 0, revenueValue: 0 });
        }
        for (const b of bookings) {
            const dateStr = new Date(b.createdAt).toISOString().slice(0, 10);
            if (chartMap.has(dateStr)) {
                chartMap.get(dateStr).bookingsCount += 1;
            }
        }
        for (const inv of invoices) {
            const dateStr = new Date(inv.invoiceDate).toISOString().slice(0, 10);
            if (chartMap.has(dateStr)) {
                chartMap.get(dateStr).revenueValue += Number(inv.totalAmount);
            }
        }
        return Array.from(chartMap.values());
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map