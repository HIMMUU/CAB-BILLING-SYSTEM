import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, DriverStatus, VehicleStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getWidgetsSummary() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todaysBookings,
      activeTrips,
      availableDrivers,
      availableVehicles,
      revenueAggregation,
    ] = await Promise.all([
      // 1. Today's Bookings count
      this.prisma.booking.count({
        where: {
          pickupDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // 2. Active Trips (bookings in STARTED state)
      this.prisma.booking.count({
        where: {
          status: BookingStatus.STARTED,
        },
      }),
      // 3. Available Drivers
      this.prisma.driver.count({
        where: {
          status: DriverStatus.AVAILABLE,
        },
      }),
      // 4. Available Vehicles
      this.prisma.vehicle.count({
        where: {
          status: VehicleStatus.AVAILABLE,
        },
      }),
      // 5. Financial metrics
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

    // Initialize Map with past 7 days
    const chartMap = new Map<string, { date: string; bookingsCount: number; revenueValue: number }>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      chartMap.set(dateStr, { date: dateStr, bookingsCount: 0, revenueValue: 0 });
    }

    // Populate booking counts
    for (const b of bookings) {
      const dateStr = new Date(b.createdAt).toISOString().slice(0, 10);
      if (chartMap.has(dateStr)) {
        chartMap.get(dateStr)!.bookingsCount += 1;
      }
    }

    // Populate revenue values
    for (const inv of invoices) {
      const dateStr = new Date(inv.invoiceDate).toISOString().slice(0, 10);
      if (chartMap.has(dateStr)) {
        chartMap.get(dateStr)!.revenueValue += Number(inv.totalAmount);
      }
    }

    return Array.from(chartMap.values());
  }
}
