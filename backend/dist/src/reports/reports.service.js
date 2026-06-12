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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRevenueReport(startDate, endDate) {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                invoiceDate: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined,
                },
            },
            orderBy: { invoiceDate: 'asc' },
        });
        let totalSubtotal = 0;
        let totalTax = 0;
        let totalAmount = 0;
        let totalPaid = 0;
        let totalDue = 0;
        const timelineMap = new Map();
        for (const invoice of invoices) {
            const sub = Number(invoice.subtotal);
            const tax = Number(invoice.totalTax);
            const amt = Number(invoice.totalAmount);
            const paid = Number(invoice.paidAmount);
            const due = Number(invoice.dueAmount);
            totalSubtotal += sub;
            totalTax += tax;
            totalAmount += amt;
            totalPaid += paid;
            totalDue += due;
            const dateStr = new Date(invoice.invoiceDate).toISOString().slice(0, 10);
            if (!timelineMap.has(dateStr)) {
                timelineMap.set(dateStr, { date: dateStr, revenue: 0, collections: 0 });
            }
            const entry = timelineMap.get(dateStr);
            entry.revenue += amt;
            entry.collections += paid;
        }
        const timeline = Array.from(timelineMap.values());
        return {
            summary: {
                totalSubtotal,
                totalTax,
                totalAmount,
                totalPaid,
                totalDue,
                invoiceCount: invoices.length,
            },
            timeline,
        };
    }
    async getBookingReport(startDate, endDate) {
        const dateQuery = {};
        if (startDate)
            dateQuery.gte = new Date(startDate);
        if (endDate)
            dateQuery.lte = new Date(endDate);
        const where = Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};
        const [statusCounts, typeCounts, totalBookings] = await Promise.all([
            this.prisma.booking.groupBy({
                by: ['status'],
                _count: { _all: true },
                where,
            }),
            this.prisma.booking.groupBy({
                by: ['tripType'],
                _count: { _all: true },
                where,
            }),
            this.prisma.booking.count({
                where,
            }),
        ]);
        const statusBreakdown = statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count._all;
            return acc;
        }, {});
        const typeBreakdown = typeCounts.reduce((acc, curr) => {
            acc[curr.tripType] = curr._count._all;
            return acc;
        }, {});
        return {
            totalBookings,
            statusBreakdown,
            typeBreakdown,
        };
    }
    async getVehicleUtilizationReport(startDate, endDate) {
        const vehicles = await this.prisma.vehicle.findMany({
            include: {
                dutySlips: {
                    where: {
                        status: 'CLOSED',
                        trip: {
                            closedAt: {
                                gte: startDate ? new Date(startDate) : undefined,
                                lte: endDate ? new Date(endDate) : undefined,
                            },
                        },
                    },
                    include: {
                        trip: true,
                    },
                },
            },
        });
        const report = vehicles.map((v) => {
            let tripsCount = 0;
            let totalKm = 0;
            let totalRevenue = 0;
            for (const ds of v.dutySlips) {
                if (ds.trip) {
                    tripsCount++;
                    totalKm += Number(ds.trip.totalKm);
                    totalRevenue += Number(ds.trip.totalAmount);
                }
            }
            return {
                vehicleId: v.id,
                vehicleNumber: v.vehicleNumber,
                model: v.model,
                vehicleType: v.vehicleType,
                status: v.status,
                tripsCount,
                totalKm,
                totalRevenue,
            };
        });
        report.sort((a, b) => b.tripsCount - a.tripsCount);
        return report;
    }
    async getDriverReport(startDate, endDate) {
        const drivers = await this.prisma.driver.findMany({
            include: {
                dutySlips: {
                    where: {
                        status: 'CLOSED',
                        trip: {
                            closedAt: {
                                gte: startDate ? new Date(startDate) : undefined,
                                lte: endDate ? new Date(endDate) : undefined,
                            },
                        },
                    },
                    include: {
                        trip: true,
                    },
                },
            },
        });
        const report = drivers.map((d) => {
            let tripsCount = 0;
            let totalKm = 0;
            let driverAllowance = 0;
            let totalRevenue = 0;
            for (const ds of d.dutySlips) {
                if (ds.trip) {
                    tripsCount++;
                    totalKm += Number(ds.trip.totalKm);
                    driverAllowance += Number(ds.trip.driverAllowance);
                    totalRevenue += Number(ds.trip.totalAmount);
                }
            }
            return {
                driverId: d.id,
                name: d.name,
                mobile: d.mobile,
                status: d.status,
                tripsCount,
                totalKm,
                driverAllowance,
                totalRevenue,
            };
        });
        report.sort((a, b) => b.tripsCount - a.tripsCount);
        return report;
    }
    async getOutstandingReport() {
        const outstandingInvoices = await this.prisma.invoice.findMany({
            where: {
                dueAmount: { gt: 0 },
                status: { notIn: ['VOID', 'PAID'] },
            },
            include: {
                customer: true,
            },
        });
        const today = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const customerMap = new Map();
        for (const inv of outstandingInvoices) {
            const due = Number(inv.dueAmount);
            const dueDate = new Date(inv.dueDate);
            const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / oneDayMs);
            const custId = inv.customerId;
            if (!customerMap.has(custId)) {
                customerMap.set(custId, {
                    customerId: custId,
                    customerName: inv.customer.name,
                    companyName: inv.customer.companyName,
                    totalOutstanding: 0,
                    current: 0,
                    overdue1to30: 0,
                    overdue31to60: 0,
                    overdue61Plus: 0,
                });
            }
            const entry = customerMap.get(custId);
            entry.totalOutstanding += due;
            if (diffDays <= 0) {
                entry.current += due;
            }
            else if (diffDays <= 30) {
                entry.overdue1to30 += due;
            }
            else if (diffDays <= 60) {
                entry.overdue31to60 += due;
            }
            else {
                entry.overdue61Plus += due;
            }
        }
        const ageingLedger = Array.from(customerMap.values());
        let globalCurrent = 0;
        let global1to30 = 0;
        let global31to60 = 0;
        let global61Plus = 0;
        let globalTotal = 0;
        for (const ledger of ageingLedger) {
            globalCurrent += ledger.current;
            global1to30 += ledger.overdue1to30;
            global31to60 += ledger.overdue31to60;
            global61Plus += ledger.overdue61Plus;
            globalTotal += ledger.totalOutstanding;
        }
        return {
            summary: {
                current: globalCurrent,
                overdue1to30: global1to30,
                overdue31to60: global31to60,
                overdue61Plus: global61Plus,
                totalOutstanding: globalTotal,
            },
            ledger: ageingLedger,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map