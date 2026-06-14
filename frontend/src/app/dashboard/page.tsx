'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface WidgetsSummary {
  todaysBookings: number;
  activeTrips: number;
  availableDrivers: number;
  availableVehicles: number;
  revenue: number;
  outstanding: number;
}

interface ChartEntry {
  date: string;
  bookingsCount: number;
  revenueValue: number;
}

const rolePermissionsMap: Record<string, string[]> = {
  SUPER_ADMIN: ['All Platform Operations (Full Admin Access)'],
  OPERATOR_ADMIN: [
    'MANAGE_USERS',
    'CUSTOMER_CRUD',
    'CUSTOMER_VIEW',
    'DRIVER_CRUD',
    'DRIVER_VIEW',
    'VEHICLE_CRUD',
    'VEHICLE_VIEW',
    'CREATE_BOOKING',
    'ASSIGN_RESOURCES',
    'GENERATE_DUTY_SLIP',
    'CLOSE_TRIP',
    'INVOICE_CRUD',
    'RECORD_PAYMENT',
    'FINANCIAL_REPORTS',
    'OPERATIONS_REPORTS',
  ],
  DISPATCHER: [
    'CUSTOMER_VIEW',
    'DRIVER_CRUD',
    'DRIVER_VIEW',
    'VEHICLE_CRUD',
    'VEHICLE_VIEW',
    'CREATE_BOOKING',
    'ASSIGN_RESOURCES',
    'GENERATE_DUTY_SLIP',
    'CLOSE_TRIP',
    'OPERATIONS_REPORTS',
  ],
  BILLING_EXECUTIVE: [
    'CUSTOMER_VIEW',
    'DRIVER_VIEW',
    'VEHICLE_VIEW',
    'CLOSE_TRIP',
    'INVOICE_CRUD',
    'RECORD_PAYMENT',
    'FINANCIAL_REPORTS',
  ],
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<WidgetsSummary | null>(null);
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else {
      setUser(currentUser);
    }
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, chartRes] = await Promise.all([
        api.request('/dashboard/summary'),
        api.request('/dashboard/charts'),
      ]);
      setSummary(sumRes);
      setChartData(chartRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to aggregate dashboard metadata.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  if (!user) return null;

  const permissions = rolePermissionsMap[user.role] || [];
  const isDispatcher = user.role === 'DISPATCHER';

  // Custom SVG Bookings Chart
  const renderBookingsChart = () => {
    if (chartData.length === 0) return null;

    const maxVal = Math.max(...chartData.map((d) => d.bookingsCount), 5);
    const height = 120;

    return (
      <div className="flex items-end justify-around h-36 border-b border-[#E2E8F0] pb-2">
        {chartData.map((d) => {
          const barHeight = (d.bookingsCount / maxVal) * height;
          // Format date string to show day name or simple format
          const formattedDate = new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' });
          return (
            <div key={d.date} className="flex flex-col items-center gap-1 w-full group">
              <span className="text-[9px] font-bold text-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity">
                {d.bookingsCount}
              </span>
              <div
                style={{ height: `${Math.max(4, barHeight)}px` }}
                className="w-8 bg-blue-600/90 group-hover:bg-blue-600 rounded-t-sm transition-all duration-300 shadow-sm"
              />
              <span className="text-[9px] font-bold text-[#64748B] mt-1 select-none">{formattedDate}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Custom SVG Revenue Chart
  const renderRevenueChart = () => {
    if (chartData.length === 0 || isDispatcher) return null;

    const maxVal = Math.max(...chartData.map((d) => d.revenueValue), 1000);
    const width = 300;
    const height = 120;
    const padding = 15;

    const points: string[] = [];
    chartData.forEach((d, idx) => {
      const x = padding + (idx / Math.max(chartData.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (d.revenueValue / maxVal) * (height - padding * 2);
      points.push(`${x},${y}`);
    });

    return (
      <div className="space-y-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#F8FAFC" strokeWidth={1} />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E2E8F0" strokeWidth={1.5} />

          {/* Area */}
          {points.length > 1 && (
            <path
              d={`M${padding},${height - padding} L${points.join(' L')} L${width - padding},${height - padding} Z`}
              fill="url(#dashboardGrad)"
              opacity={0.06}
            />
          )}

          {/* Line */}
          <path d={`M${points.join(' L')}`} fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" />

          {/* Gradient */}
          <defs>
            <linearGradient id="dashboardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>
        </svg>

        <div className="flex items-center justify-between text-[9px] text-[#64748B] font-semibold select-none px-1">
          <span>{new Date(chartData[0].date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</span>
          <span>{new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Overview Dashboard</h1>
        <p className="text-sm text-[#64748B] mt-1">Real-time status summaries and operational widgets.</p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-[#64748B] flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-semibold text-sm">Loading workspace dashboard...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 text-sm font-semibold border border-red-200 rounded-xl bg-red-50/20">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Widgets Grid */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Today's Bookings */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Today's Bookings</span>
                  <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">{summary.todaysBookings}</span>
                </div>
              </div>

              {/* Active Trips */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.59 2.51a14.98 14.98 0 0 0-6.16 12.12A14.98 14.98 0 0 0 9.59 20.8m5.84-6.43a6 6 0 1 1-11.68 0" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Active Trips</span>
                  <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">{summary.activeTrips}</span>
                </div>
              </div>

              {/* Available Drivers */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Available Drivers</span>
                  <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">{summary.availableDrivers}</span>
                </div>
              </div>

              {/* Available Vehicles */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.847-13.56a1.978 1.978 0 0 0-1.972-1.854l-5.322.024" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Available Vehicles</span>
                  <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">{summary.availableVehicles}</span>
                </div>
              </div>

              {/* Revenue */}
              <div className={`bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm flex items-center gap-3 ${isDispatcher ? 'opacity-30 select-none' : ''}`}>
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.546 1.16 3.743.258 3.743-1.684V10.15c0-1.942-2.197-2.844-3.743-1.684L9 9.125m3.75 2.25h-3.75m1.5-6.75v10.5" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Gross Revenue</span>
                  <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">
                    {isDispatcher ? 'INR ••••' : `INR ${summary.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                  </span>
                </div>
              </div>

              {/* Outstanding Payments */}
              <div className={`bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm flex items-center gap-3 ${isDispatcher ? 'opacity-30 select-none' : ''}`}>
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Overdue Dues</span>
                  <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">
                    {isDispatcher ? 'INR ••••' : `INR ${summary.outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Charts & Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle: Custom Trend Charts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Weekly Bookings Chart */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Weekly Booking Volumes</h3>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Total scheduled booking transactions completed daily over the past 7 days.</p>
                </div>
                {renderBookingsChart()}
              </div>

              {/* Weekly Revenue Trend Chart */}
              {!isDispatcher && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Revenue Performance Trend</h3>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Gross invoicing transaction values accumulated daily over the past 7 days.</p>
                  </div>
                  {renderRevenueChart()}
                </div>
              )}
            </div>

            {/* Right Side: Profile & Role Context */}
            <div className="space-y-6">
              {/* Profile card */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-5">Active User Profile</h3>
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Full Name</span>
                    <span className="text-sm font-semibold text-[#0F172A] mt-0.5 block">{user.firstName} {user.lastName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Email Credentials</span>
                    <span className="text-sm font-semibold text-[#0F172A] mt-0.5 block">{user.email}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Workspace Scope</span>
                    <span className="text-sm font-semibold text-[#0F172A] mt-0.5 block truncate">
                      {user.tenantId ? 'Isolated Account Space' : 'Global Admin Root'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Assigned Role</span>
                    <span className="inline-block px-2.5 py-1 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200/50 rounded-md uppercase tracking-wider mt-1.5">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* RBAC Rights */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-5">Assigned System Rights</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {permissions.map((perm) => (
                    <div
                      key={perm}
                      className="flex items-center gap-2 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-600 shrink-0">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-[#475569]">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
