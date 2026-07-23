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

interface Customer {
  id: string;
  name: string;
  companyName: string | null;
}

interface Driver {
  id: string;
  name: string;
  mobile: string;
  status: string;
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  status: string;
}

interface PendingBooking {
  id: string;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  pickupTime: string;
  tripType: string;
  vehicleTypeRequired: string;
  status: string;
  customer: Customer;
  guestName?: string;
  guestSalutation?: string;
  bookingBy?: string;
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

const formatTimeTo24h = (timeStr: string | null | undefined): string => {
  if (!timeStr) return 'N/A';
  const parts = timeStr.trim().split(':');
  if (parts.length >= 2) {
    let hh = parseInt(parts[0], 10);
    const mm = parts[1].substring(0, 2);
    const lower = timeStr.toLowerCase();
    if (lower.includes('pm') && hh < 12) hh += 12;
    if (lower.includes('am') && hh === 12) hh = 0;
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }
  return timeStr;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<WidgetsSummary | null>(null);
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer / Assigning Form State for Dashboard
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState<PendingBooking | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false);
  const [targetDriverId, setTargetDriverId] = useState('');
  const [targetVehicleId, setTargetVehicleId] = useState('');
  const [assignMode, setAssignMode] = useState<'REGISTERED' | 'MANUAL'>('REGISTERED');
  const [manualDriverName, setManualDriverName] = useState('');
  const [manualDriverMobile, setManualDriverMobile] = useState('');
  const [manualVehicleNumber, setManualVehicleNumber] = useState('');
  const [manualVehicleType, setManualVehicleType] = useState('Sedan');
  const [assigningSubmitting, setAssigningSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

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
      const [sumRes, chartRes, pendingRes] = await Promise.all([
        api.request('/dashboard/summary'),
        api.request('/dashboard/charts'),
        api.request('/bookings?status=PENDING&limit=5'),
      ]);
      setSummary(sumRes);
      setChartData(chartRes);
      setPendingBookings(pendingRes.data || []);
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

  const handleOpenAssign = async (booking: PendingBooking) => {
    setSelectedBookingForAssign(booking);
    setTargetDriverId('');
    setTargetVehicleId('');
    setAssignMode('REGISTERED');
    setManualDriverName('');
    setManualDriverMobile('');
    setManualVehicleNumber('');
    setManualVehicleType(booking.vehicleTypeRequired || 'Sedan');
    setDrawerError(null);
    setLoadingResources(true);
    setIsAssignDrawerOpen(true);

    try {
      const res = await api.request(`/assignments/available-resources?bookingId=${booking.id}`);
      setAvailableDrivers(res.drivers || []);
      setAvailableVehicles(res.vehicles || []);
      
      if (res.drivers?.length > 0) setTargetDriverId(res.drivers[0].id);
      if (res.vehicles?.length > 0) setTargetVehicleId(res.vehicles[0].id);
    } catch (err: any) {
      setDrawerError(err.message || 'Failed to load available resources.');
    } finally {
      setLoadingResources(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrawerError(null);

    if (assignMode === 'REGISTERED') {
      if (!selectedBookingForAssign || !targetDriverId || !targetVehicleId) {
        setDrawerError('Please select both a driver and a vehicle.');
        return;
      }
    } else {
      if (!manualDriverName || !manualVehicleNumber) {
        setDrawerError('Driver Name and Cab Number are required for manual assignment.');
        return;
      }
    }

    setAssigningSubmitting(true);
    try {
      const payload = assignMode === 'REGISTERED' ? {
        bookingId: selectedBookingForAssign!.id,
        driverId: targetDriverId,
        vehicleId: targetVehicleId,
      } : {
        bookingId: selectedBookingForAssign!.id,
        manualDriverName,
        manualDriverMobile,
        manualVehicleNumber,
        manualVehicleType,
      };

      await api.request('/assignments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsAssignDrawerOpen(false);
      setSelectedBookingForAssign(null);
      loadDashboardData();
    } catch (err: any) {
      setDrawerError(err.message || 'Assignment failed.');
    } finally {
      setAssigningSubmitting(false);
    }
  };

  if (!user) return null;

  const permissions = rolePermissionsMap[user.role] || [];
  const isDispatcher = user.role === 'DISPATCHER';
  const canEdit = user.role !== 'BILLING_EXECUTIVE';

  // Find info of currently selected vehicle
  const selectedVehicleObj = availableVehicles.find((v) => v.id === targetVehicleId);
  const vehicleTypeMismatch = 
    selectedBookingForAssign && 
    selectedVehicleObj && 
    selectedBookingForAssign.vehicleTypeRequired.toLowerCase() !== selectedVehicleObj.vehicleType.toLowerCase();

  // Custom SVG Bookings Chart
  const renderBookingsChart = () => {
    if (chartData.length === 0) return null;

    const maxVal = Math.max(...chartData.map((d) => d.bookingsCount), 5);
    const height = 120;

    return (
      <div className="flex items-end justify-around h-36 border-b border-[#E2E8F0] pb-2">
        {chartData.map((d) => {
          const barHeight = (d.bookingsCount / maxVal) * height;
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
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#F8FAFC" strokeWidth={1} />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E2E8F0" strokeWidth={1.5} />

          {points.length > 1 && (
            <path
              d={`M${padding},${height - padding} L${points.join(' L')} L${width - padding},${height - padding} Z`}
              fill="url(#dashboardGrad)"
              opacity={0.06}
            />
          )}

          <path d={`M${points.join(' L')}`} fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" />

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
        <p className="text-sm text-[#64748B] mt-1">Real-time status summaries and quick dispatch operations.</p>
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

          {/* Quick Pending Bookings & Dispatch Section */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E2E8F0] bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Pending Bookings — Direct Dispatch</h3>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Quickly assign drivers and cabs to pending bookings directly from dashboard.</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/bookings')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
              >
                <span>View all bookings</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50/50 font-medium">
                ✓ All bookings are currently dispatched or completed!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider bg-gray-50/50">
                      <th className="py-2.5 px-4">Booking Code</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Trip Type & Req. Cab</th>
                      <th className="py-2.5 px-4">Pickup Date/Time</th>
                      <th className="py-2.5 px-4">Route</th>
                      {canEdit && <th className="py-2.5 px-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/80 text-xs">
                    {pendingBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">{b.bookingNumber}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0F172A]">{b.customer?.name}</div>
                          {b.customer?.companyName && (
                            <div className="text-[10px] text-gray-400 uppercase">{b.customer.companyName}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded uppercase">
                            {b.tripType.replace('_', ' ')}
                          </span>
                          <div className="text-[10px] text-[#64748B] mt-0.5">Req: {b.vehicleTypeRequired}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#0F172A]">{new Date(b.pickupDate).toLocaleDateString('en-GB')}</div>
                          <div className="text-[10px] text-[#64748B]">{formatTimeTo24h(b.pickupTime)}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[#64748B]">
                          {b.pickupLocation} &rarr; {b.dropLocation}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenAssign(b)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                            >
                              Assign Driver & Cab
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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

      {/* Dispatch Assignment Drawer */}
      {isAssignDrawerOpen && selectedBookingForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-[500px] h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Dispatch Assignment</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Allocate conflict-free resources for {selectedBookingForAssign.bookingNumber}</p>
                </div>
                <button
                  onClick={() => setIsAssignDrawerOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {drawerError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {drawerError}
                </div>
              )}

              {loadingResources ? (
                <div className="p-12 flex justify-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <form onSubmit={handleAssignSubmit} className="space-y-6">
                  {/* Summary card */}
                  <div className="p-4 bg-gray-50 border border-[#E2E8F0] rounded-lg text-xs space-y-2">
                    <div>
                      <span className="font-bold text-[#0F172A] block uppercase tracking-wider text-[10px]">Customer:</span>
                      <span className="text-[#64748B] font-medium">{selectedBookingForAssign.customer?.name} {selectedBookingForAssign.customer?.companyName ? `(${selectedBookingForAssign.customer.companyName})` : ''}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-bold text-[#0F172A] block uppercase tracking-wider text-[10px]">Requested Date/Time:</span>
                        <span className="text-[#64748B] font-medium">{new Date(selectedBookingForAssign.pickupDate).toLocaleDateString('en-GB')} at {formatTimeTo24h(selectedBookingForAssign.pickupTime)}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#0F172A] block uppercase tracking-wider text-[10px]">Requested Vehicle Type:</span>
                        <span className="text-blue-700 bg-blue-50 border border-blue-100 font-bold px-1.5 py-0.5 rounded text-[10px] w-fit inline-block mt-0.5 uppercase">
                          {selectedBookingForAssign.vehicleTypeRequired}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-[#0F172A] block uppercase tracking-wider text-[10px]">Route:</span>
                      <span className="text-[#64748B] font-medium truncate block">{selectedBookingForAssign.pickupLocation} &rarr; {selectedBookingForAssign.dropLocation}</span>
                    </div>
                  </div>

                  {/* Mode Toggle Tabs */}
                  <div className="flex bg-gray-100 p-1 rounded-lg border border-[#E2E8F0] text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setAssignMode('REGISTERED')}
                      className={`w-1/2 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                        assignMode === 'REGISTERED'
                          ? 'bg-white text-blue-600 shadow-sm font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                      <span>Registered Fleet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignMode('MANUAL')}
                      className={`w-1/2 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                        assignMode === 'MANUAL'
                          ? 'bg-white text-blue-600 shadow-sm font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM3.25 10a6.75 6.75 0 1113.5 0 6.75 6.75 0 01-13.5 0z" clipRule="evenodd" />
                        <path d="M12.25 7.5a.75.75 0 00-1.06-1.06L9 8.69 7.81 7.5a.75.75 0 00-1.06 1.06L7.94 9.75l-1.19 1.19a.75.75 0 101.06 1.06L9 10.81l1.19 1.19a.75.75 0 001.06-1.06l-1.19-1.19 1.19-1.19z" />
                      </svg>
                      <span>Manual / Custom Entry</span>
                    </button>
                  </div>

                  {assignMode === 'REGISTERED' ? (
                    <>
                      {/* Driver Dropdown */}
                      <div>
                        <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                          Select Available Driver
                        </label>
                        <select
                          required
                          value={targetDriverId}
                          onChange={(e) => setTargetDriverId(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                        >
                          {availableDrivers.length === 0 ? (
                            <option value="">No drivers available on this date</option>
                          ) : (
                            availableDrivers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.mobile})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Vehicle Dropdown */}
                      <div>
                        <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                          Select Available Vehicle
                        </label>
                        <select
                          required
                          value={targetVehicleId}
                          onChange={(e) => setTargetVehicleId(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                        >
                          {availableVehicles.length === 0 ? (
                            <option value="">No vehicles available on this date</option>
                          ) : (
                            availableVehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.vehicleNumber} - {v.model} ({v.vehicleType})
                              </option>
                            ))
                          )}
                        </select>

                        {/* Mismatch Warning alert */}
                        {vehicleTypeMismatch && (
                          <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600 shrink-0">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            <span>
                              Vehicle type mismatch! Requested: {selectedBookingForAssign.vehicleTypeRequired}, selected is: {selectedVehicleObj.vehicleType}.
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4 bg-blue-50/60 border border-blue-100 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600 shrink-0">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0h2.1a2.5 2.5 0 014.9 0H17a1 1 0 001-1v-5l-2-4H3z" />
                        </svg>
                        <span>Manual / Vendor Cab Entry</span>
                      </h4>

                      <div>
                        <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                          Driver Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar"
                          value={manualDriverName}
                          onChange={(e) => setManualDriverName(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-600 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                          Driver Phone Number / Mobile
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 9812345678"
                          value={manualDriverMobile}
                          onChange={(e) => setManualDriverMobile(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-600 transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                            Car Group / Vehicle Type
                          </label>
                          <select
                            value={manualVehicleType}
                            onChange={(e) => setManualVehicleType(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-600 transition"
                          >
                            <option value="Sedan">Sedan</option>
                            <option value="SUV">SUV</option>
                            <option value="MUV">MUV</option>
                            <option value="Luxury">Luxury</option>
                            <option value="Tempo Traveller">Tempo Traveller</option>
                            <option value="Bus">Bus</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                            Cab Number *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. DL 01 AB 1234"
                            value={manualVehicleNumber}
                            onChange={(e) => setManualVehicleNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] font-mono focus:outline-none focus:border-blue-600 transition"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

            <div className="mt-8 border-t border-[#E2E8F0] pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsAssignDrawerOpen(false)}
                className="w-1/2 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg text-sm transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignSubmit}
                disabled={assigningSubmitting || loadingResources || (assignMode === 'REGISTERED' && (availableDrivers.length === 0 || availableVehicles.length === 0))}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {assigningSubmitting ? 'Dispatching...' : 'Dispatch Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
