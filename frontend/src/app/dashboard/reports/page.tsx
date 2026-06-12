'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// Interface definitions
interface RevenueSummary {
  totalSubtotal: number;
  totalTax: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  invoiceCount: number;
}

interface RevenueTimelineEntry {
  date: string;
  revenue: number;
  collections: number;
}

interface RevenueReport {
  summary: RevenueSummary;
  timeline: RevenueTimelineEntry[];
}

interface BookingReport {
  totalBookings: number;
  statusBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
}

interface VehicleReportEntry {
  vehicleId: string;
  vehicleNumber: string;
  model: string;
  vehicleType: string;
  status: string;
  tripsCount: number;
  totalKm: number;
  totalRevenue: number;
}

interface DriverReportEntry {
  driverId: string;
  name: string;
  mobile: string;
  status: string;
  tripsCount: number;
  totalKm: number;
  driverAllowance: number;
  totalRevenue: number;
}

interface OutstandingSummary {
  current: number;
  overdue1to30: number;
  overdue31to60: number;
  overdue61Plus: number;
  totalOutstanding: number;
}

interface OutstandingLedgerEntry {
  customerId: string;
  customerName: string;
  companyName: string | null;
  totalOutstanding: number;
  current: number;
  overdue1to30: number;
  overdue31to60: number;
  overdue61Plus: number;
}

interface OutstandingReport {
  summary: OutstandingSummary;
  ledger: OutstandingLedgerEntry[];
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Active sub-dashboard tab: 'operations' | 'financials'
  const [activeTab, setActiveTab] = useState<'operations' | 'financials'>('operations');

  // Filters state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // default past 30 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Report aggregates state
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [bookingReport, setBookingReport] = useState<BookingReport | null>(null);
  const [vehicleReport, setVehicleReport] = useState<VehicleReportEntry[]>([]);
  const [driverReport, setDriverReport] = useState<DriverReportEntry[]>([]);
  const [outstandingReport, setOutstandingReport] = useState<OutstandingReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      // If user is a dispatcher, enforce operations tab only
      if (currentUser.role === 'DISPATCHER') {
        setActiveTab('operations');
      }
    }
  }, [router]);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const isDispatcher = user?.role === 'DISPATCHER';
      const rangeParams = `?startDate=${startDate}&endDate=${endDate}`;

      // Fetch operational reports (All roles can read operations)
      const [bookings, vehicles, drivers] = await Promise.all([
        api.request(`/reports/bookings${rangeParams}`),
        api.request(`/reports/vehicle-utilization${rangeParams}`),
        api.request(`/reports/drivers${rangeParams}`),
      ]);

      setBookingReport(bookings);
      setVehicleReport(vehicles);
      setDriverReport(drivers);

      // Fetch financial reports only if not a view-only dispatcher
      if (!isDispatcher) {
        const [revenue, outstanding] = await Promise.all([
          api.request(`/reports/revenue${rangeParams}`),
          api.request('/reports/outstanding'), // outstanding is overall, no date ranges required
        ]);
        setRevenueReport(revenue);
        setOutstandingReport(outstanding);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to aggregate reports databases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user, startDate, endDate]);

  const isDispatcher = user?.role === 'DISPATCHER';

  // Custom SVG Line Graph Generator for Revenue
  const renderRevenueTimelineGraph = () => {
    if (!revenueReport || revenueReport.timeline.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-[#64748B] text-xs">
          No timeline data available for date ranges.
        </div>
      );
    }

    const timeline = revenueReport.timeline;
    const maxVal = Math.max(...timeline.map((t) => Math.max(t.revenue, t.collections)), 1000);

    const width = 500;
    const height = 200;
    const padding = 20;

    const pointsRev: string[] = [];
    const pointsColl: string[] = [];

    timeline.forEach((entry, idx) => {
      const x = padding + (idx / Math.max(timeline.length - 1, 1)) * (width - padding * 2);
      const yRev = height - padding - (entry.revenue / maxVal) * (height - padding * 2);
      const yColl = height - padding - (entry.collections / maxVal) * (height - padding * 2);

      pointsRev.push(`${x},${yRev}`);
      pointsColl.push(`${x},${yColl}`);
    });

    return (
      <div className="space-y-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#F1F5F9" strokeWidth={1} />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#F1F5F9" strokeWidth={1} />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E2E8F0" strokeWidth={1.5} />

          {/* Area under revenue line */}
          {pointsRev.length > 1 && (
            <path
              d={`M${padding},${height - padding} L${pointsRev.join(' L')} L${width - padding},${height - padding} Z`}
              fill="url(#gradRev)"
              opacity={0.06}
            />
          )}

          {/* Lines */}
          <path d={`M${pointsRev.join(' L')}`} fill="none" stroke="#2563EB" strokeWidth={2.5} strokeLinecap="round" />
          <path d={`M${pointsColl.join(' L')}`} fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="4 3" />

          {/* Gradients */}
          <defs>
            <linearGradient id="gradRev" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>
        </svg>

        <div className="flex items-center justify-between text-[10px] text-[#64748B] px-1 font-semibold">
          <span>{timeline[0].date}</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-blue-600 inline-block" /> Revenue</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-t border-dashed border-emerald-500 inline-block" /> Collections</span>
          </div>
          <span>{timeline[timeline.length - 1].date}</span>
        </div>
      </div>
    );
  };

  // Custom SVG Bar Chart Generator for Receivables aging
  const renderReceivablesAgeingGraph = () => {
    if (!outstandingReport) return null;

    const summary = outstandingReport.summary;
    const data = [
      { label: 'Current', val: summary.current, color: '#3B82F6' },
      { label: '1-30 Days', val: summary.overdue1to30, color: '#F59E0B' },
      { label: '31-60 Days', val: summary.overdue31to60, color: '#EF4444' },
      { label: '61+ Days', val: summary.overdue61Plus, color: '#B91C1C' },
    ];

    const maxVal = Math.max(...data.map((d) => d.val), 1000);
    const height = 160;

    return (
      <div className="flex items-end justify-around h-48 border-b border-[#E2E8F0] pb-2">
        {data.map((item) => {
          const barHeight = Math.max(8, (item.val / maxVal) * height);
          return (
            <div key={item.label} className="flex flex-col items-center gap-2 w-full">
              <span className="text-[10px] font-bold text-[#0F172A]">
                INR {item.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <div
                style={{ height: `${barHeight}px`, backgroundColor: item.color }}
                className="w-12 rounded-t-md transition-all duration-500 shadow-sm"
              />
              <span className="text-[10px] font-bold text-[#64748B] mt-1">{item.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Filter Options */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Business Intelligence & Reports</h1>
          <p className="text-sm text-[#64748B] mt-1">Consolidated financial performance ledgers and operational utilization metrics.</p>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-3 bg-white border border-[#E2E8F0] p-2 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748B] font-semibold uppercase">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-50 border border-[#E2E8F0] p-1.5 rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748B] font-semibold uppercase">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-50 border border-[#E2E8F0] p-1.5 rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none"
            />
          </div>
          <button
            onClick={loadReportData}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Tab Select Header */}
      {!isDispatcher && (
        <div className="border-b border-[#E2E8F0] flex gap-4">
          <button
            onClick={() => setActiveTab('operations')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 px-1 ${
              activeTab === 'operations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Fleet & Operations Reports
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 px-1 ${
              activeTab === 'financials'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Financial Performance
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-[#64748B] flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-semibold text-sm">Aggregating database reports...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 text-sm font-semibold">{error}</div>
      ) : activeTab === 'operations' ? (
        <div className="space-y-6">
          {/* Operations Overview Cards */}
          {bookingReport && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
                <div className="text-xs font-semibold text-[#64748B] uppercase">Total System Bookings</div>
                <div className="text-2xl font-bold text-[#0F172A] mt-1.5">{bookingReport.totalBookings}</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-1">Active within date filters</div>
              </div>

              {/* Status segment percentages bar */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm space-y-3 md:col-span-2">
                <div className="text-xs font-semibold text-[#64748B] uppercase">Booking Status Breakdown</div>
                <div className="w-full flex h-4 rounded-lg overflow-hidden border border-gray-100">
                  {Object.entries(bookingReport.statusBreakdown).map(([status, val], idx) => {
                    const percent = (val / bookingReport.totalBookings) * 100;
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#94A3B8'];
                    return (
                      <div
                        key={status}
                        style={{ width: `${percent}%`, backgroundColor: colors[idx % colors.length] }}
                        className="h-full"
                        title={`${status}: ${val} (${percent.toFixed(0)}%)`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[#64748B] font-semibold">
                  {Object.entries(bookingReport.statusBreakdown).map(([status, val], idx) => {
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#94A3B8'];
                    return (
                      <span key={status} className="flex items-center gap-1.5">
                        <span style={{ backgroundColor: colors[idx % colors.length] }} className="w-2.5 h-2.5 rounded-full inline-block" />
                        <span className="capitalize">{status.toLowerCase()}: {val}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Vehicle and Driver utilization tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Vehicles Leaderboard */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#E2E8F0] bg-gray-50">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Vehicle Utilization Leaderboard</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">Top utilized vehicles sorted by completed trips in period.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-gray-50/50 text-[#64748B] font-semibold select-none uppercase">
                      <th className="py-2.5 px-4">Plate Code</th>
                      <th className="py-2.5 px-4">Model & Type</th>
                      <th className="py-2.5 px-4 text-center">Trips count</th>
                      <th className="py-2.5 px-4 text-right">Distance Run</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {vehicleReport.slice(0, 5).map((vehicle) => (
                      <tr key={vehicle.vehicleId} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600">{vehicle.vehicleNumber}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold">{vehicle.model}</span>
                          <span className="text-[10px] text-[#64748B] block mt-0.5">{vehicle.vehicleType}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-[#0F172A]">{vehicle.tripsCount}</td>
                        <td className="py-3 px-4 text-right font-semibold">{vehicle.totalKm} KM</td>
                      </tr>
                    ))}
                    {vehicleReport.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-[#64748B]">No vehicle utilization logs.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Drivers Leaderboard */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#E2E8F0] bg-gray-50">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Driver Analytics & Allowances</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">Top performing drivers sorted by trips completed in period.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-gray-50/50 text-[#64748B] font-semibold select-none uppercase">
                      <th className="py-2.5 px-4">Driver Name</th>
                      <th className="py-2.5 px-4 text-center">Trips count</th>
                      <th className="py-2.5 px-4 text-right">Distance Driven</th>
                      <th className="py-2.5 px-4 text-right">Allowances Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {driverReport.slice(0, 5).map((driver) => (
                      <tr key={driver.driverId} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="font-semibold">{driver.name}</div>
                          <div className="text-[10px] text-[#64748B] mt-0.5">{driver.mobile}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-[#0F172A]">{driver.tripsCount}</td>
                        <td className="py-3 px-4 text-right font-semibold">{driver.totalKm} KM</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">INR {driver.driverAllowance.toFixed(2)}</td>
                      </tr>
                    ))}
                    {driverReport.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-[#64748B]">No driver metrics found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Financial Performance Tab */
        <div className="space-y-6">
          {/* Revenue aggregate cards */}
          {revenueReport && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Gross Billed Revenue</div>
                <div className="text-lg font-bold text-[#0F172A] mt-1">INR {revenueReport.summary.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Net Taxable Revenue</div>
                <div className="text-lg font-bold text-[#0F172A] mt-1">INR {revenueReport.summary.totalSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">GST Taxes Collected</div>
                <div className="text-lg font-bold text-[#0F172A] mt-1">INR {revenueReport.summary.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm border-emerald-200 bg-emerald-50/10">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Payments Received</div>
                <div className="text-lg font-bold text-emerald-600 mt-1">INR {revenueReport.summary.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm border-rose-200 bg-rose-50/10">
                <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Receivables Outstanding</div>
                <div className="text-lg font-bold text-rose-600 mt-1">INR {revenueReport.summary.totalDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          )}

          {/* Revenue trend line graph & receivables aging bar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Line */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm lg:col-span-2">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Revenue & Collections Timeline</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">Daily gross invoicing value against payments received in period.</p>
              </div>
              {renderRevenueTimelineGraph()}
            </div>

            {/* Accounts Receivable Overdue Ageing */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Receivables Overdue Ageing</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">A/R ledger split into aging categories relative to invoice due dates.</p>
              </div>
              {renderReceivablesAgeingGraph()}
            </div>
          </div>

          {/* Customer outstanding dues aging table */}
          {outstandingReport && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#E2E8F0] bg-gray-50">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Customer Outstanding Ageing Ledger</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">Itemized aging status breakdown per active client account.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-gray-50/50 text-[#64748B] font-semibold select-none uppercase">
                      <th className="py-2.5 px-4">Client / Company Name</th>
                      <th className="py-2.5 px-4 text-right">Current</th>
                      <th className="py-2.5 px-4 text-right">1-30 Days</th>
                      <th className="py-2.5 px-4 text-right">31-60 Days</th>
                      <th className="py-2.5 px-4 text-right">61+ Days</th>
                      <th className="py-2.5 px-4 text-right">Total Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {outstandingReport.ledger.map((row) => (
                      <tr key={row.customerId} className="hover:bg-gray-50/50 font-medium">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-blue-600">{row.customerName}</div>
                          {row.companyName && (
                            <div className="text-[10px] text-[#64748B] mt-0.5">{row.companyName}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">INR {row.current.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-amber-600">INR {row.overdue1to30.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-orange-600">INR {row.overdue31to60.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-red-600">INR {row.overdue61Plus.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-700 bg-red-50/10">
                          INR {row.totalOutstanding.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {outstandingReport.ledger.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#64748B]">All active client balances are fully paid.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
