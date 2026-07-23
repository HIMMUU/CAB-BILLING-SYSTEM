'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DatePicker from '@/components/DatePicker';

interface Customer {
  id: string;
  name: string;
  companyName: string | null;
  type: 'CORPORATE' | 'INDIVIDUAL';
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

interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  pickupTime: string;
  tripType: 'LOCAL' | 'AIRPORT_TRANSFER' | 'OUTSTATION' | 'HOURLY_RENTAL';
  vehicleTypeRequired: string;
  status: 'PENDING' | 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  employeeId?: string;
  customer: Customer;
  guestName?: string;
  guestSalutation?: string;
  bookingBy?: string;
  remarks?: string;
  dutySlip?: {
    id: string;
    dutySlipNumber: string;
  } | null;
  assignments?: Array<{
    id: string;
    driverId: string;
    vehicleId: string;
    driver?: Driver;
    vehicle?: Vehicle;
  }>;
}

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

const handleDateChange = (val: string): string => {
  const clean = val.replace(/\D/g, '').slice(0, 8);
  if (clean.length >= 5) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
  }
  if (clean.length >= 3) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return clean;
};

const handleTimeChange = (val: string): string => {
  const clean = val.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 3) {
    return `${clean.slice(0, 2)}:${clean.slice(2)}`;
  }
  return clean;
};

const dateToApi = (d: string): string => {
  if (!d) return '';
  const parts = d.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return d;
};

const dateToDisplay = (d: string): string => {
  if (!d) return '';
  const clean = d.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return d;
};

export default function BookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Drawer / Assigning Form State
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState<Booking | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false);
  
  // Selection
  const [targetDriverId, setTargetDriverId] = useState('');
  const [targetVehicleId, setTargetVehicleId] = useState('');
  const [assigningSubmitting, setAssigningSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Form inputs
  const [formData, setFormData] = useState({
    customerId: '',
    pickupLocation: '',
    dropLocation: '',
    pickupDate: '',
    pickupTime: '',
    tripType: 'LOCAL' as 'LOCAL' | 'AIRPORT_TRANSFER' | 'OUTSTATION' | 'HOURLY_RENTAL',
    vehicleTypeRequired: '',
    status: 'PENDING' as 'PENDING' | 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'CANCELLED',
    employeeId: '',
    guestName: '',
    guestSalutation: 'Mr',
    bookingBy: '',
    remarks: '',
    driverId: '',
    vehicleId: '',
  });

  const fetchCustomers = async () => {
    try {
      const res = await api.request('/customers?limit=100');
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to load customers list', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.request('/rate-management/categories');
      setCategories(res || []);
    } catch (err) {
      console.error('Failed to load categories list', err);
    }
  };

  const fetchDriversAndVehicles = async () => {
    try {
      const [dRes, vRes] = await Promise.all([
        api.request('/drivers?limit=100'),
        api.request('/vehicles?limit=100'),
      ]);
      setAllDrivers(dRes.data || []);
      setAllVehicles(vRes.data || []);
    } catch (err) {
      console.error('Failed to load drivers/vehicles list', err);
    }
  };

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      fetchCustomers();
      fetchCategories();
      fetchDriversAndVehicles();
    }
  }, [router]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let url = `/bookings?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;

      const res = await api.request(url);
      setBookings(res.data);
      setTotalPages(res.meta.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, page, filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      customerId: customers[0]?.id || '',
      pickupLocation: '',
      dropLocation: '',
      pickupDate: '',
      pickupTime: '',
      tripType: 'LOCAL',
      vehicleTypeRequired: 'Sedan',
      status: 'PENDING',
      employeeId: '',
      guestName: '',
      guestSalutation: 'Mr',
      bookingBy: '',
      remarks: '',
      driverId: '',
      vehicleId: '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (booking: Booking) => {
    setEditingId(booking.id);
    const activeAssignment = booking.assignments?.[0];
    setFormData({
      customerId: booking.customerId,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
      pickupDate: booking.pickupDate ? dateToDisplay(booking.pickupDate) : '',
      pickupTime: booking.pickupTime ? formatTimeTo24h(booking.pickupTime) : '',
      tripType: booking.tripType,
      vehicleTypeRequired: booking.vehicleTypeRequired,
      status: booking.status,
      employeeId: booking.employeeId || '',
      guestName: booking.guestName || '',
      guestSalutation: booking.guestSalutation || 'Mr',
      bookingBy: booking.bookingBy || '',
      remarks: booking.remarks || '',
      driverId: activeAssignment?.driverId || '',
      vehicleId: activeAssignment?.vehicleId || '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.customerId || !formData.pickupLocation || !formData.dropLocation || !formData.pickupDate || !formData.pickupTime || !formData.tripType || !formData.vehicleTypeRequired) {
      setFormError('All fields are required.');
      return;
    }

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(formData.pickupDate)) {
      setFormError('Pickup Date must be in DD/MM/YYYY format.');
      return;
    }
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(formData.pickupTime)) {
      setFormError('Pickup Time must be in 24 Hrs HH:mm format.');
      return;
    }

    const payload = {
      ...formData,
      guestName: formData.guestName || undefined,
      guestSalutation: formData.guestSalutation || undefined,
      bookingBy: formData.bookingBy || undefined,
      remarks: formData.remarks || undefined,
      driverId: formData.driverId || undefined,
      vehicleId: formData.vehicleId || undefined,
      pickupDate: dateToApi(formData.pickupDate),
    };

    setSubmitting(true);

    try {
      if (editingId) {
        await api.request(`/bookings/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api.request('/bookings', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsFormOpen(false);
      fetchBookings();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
      await api.request(`/bookings/${id}`, { method: 'DELETE' });
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete booking.');
    }
  };

  const handleOpenAssign = async (booking: Booking) => {
    setSelectedBookingForAssign(booking);
    setTargetDriverId('');
    setTargetVehicleId('');
    setDrawerError(null);
    setLoadingResources(true);
    setIsAssignDrawerOpen(true);

    try {
      const res = await api.request(`/assignments/available-resources?bookingId=${booking.id}`);
      setAvailableDrivers(res.drivers || []);
      setAvailableVehicles(res.vehicles || []);
      
      // Auto select first entries if available
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

    if (!selectedBookingForAssign || !targetDriverId || !targetVehicleId) {
      setDrawerError('Please select both a driver and a vehicle.');
      return;
    }

    setAssigningSubmitting(true);
    try {
      await api.request('/assignments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: selectedBookingForAssign.id,
          driverId: targetDriverId,
          vehicleId: targetVehicleId,
        }),
      });

      setIsAssignDrawerOpen(false);
      setSelectedBookingForAssign(null);
      fetchBookings();
    } catch (err: any) {
      setDrawerError(err.message || 'Assignment failed.');
    } finally {
      setAssigningSubmitting(false);
    }
  };
  
  const downloadPdf = async (id: string, num: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/duty-slips/${id}/pdf`, {
        headers: { Authorization: `Bearer ${api.getToken()}` },
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `DS-${num}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: any) { alert(e.message); }
  };

  if (!user) return null;

  const canEdit = user.role !== 'BILLING_EXECUTIVE';

  // Find info of currently selected vehicle
  const selectedVehicleObj = availableVehicles.find((v) => v.id === targetVehicleId);
  const vehicleTypeMismatch = 
    selectedBookingForAssign && 
    selectedVehicleObj && 
    selectedBookingForAssign.vehicleTypeRequired.toLowerCase() !== selectedVehicleObj.vehicleType.toLowerCase();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Bookings</h1>
          <p className="text-sm text-[#64748B] mt-1">Create and manage passenger travel bookings and trip assignments</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Create Booking</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Toolbar Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full mb-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search booking number, location, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 transition"
          />
        </form>

        <div className="flex bg-gray-100 p-0.5 border border-[#E2E8F0] rounded-lg overflow-x-auto self-start">
          {['ALL', 'PENDING', 'ASSIGNED', 'STARTED', 'COMPLETED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {status.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-[#64748B]">
            No bookings found. Click "Create Booking" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-3 px-6">Booking Code</th>
                  <th className="py-3 px-6">Customer</th>
                  <th className="py-3 px-6">Trip & Vehicle</th>
                  <th className="py-3 px-6">Assigned Resource</th>
                  <th className="py-3 px-6">Locations (Pickup &rarr; Drop)</th>
                  <th className="py-3 px-6">Pickup Date & Time</th>
                  <th className="py-3 px-6">Status</th>
                  {canEdit && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                {bookings.map((booking) => {
                  const activeAssignment = booking.assignments?.[0];
                  return (
                    <tr key={booking.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-[#0F172A] tracking-wider font-mono text-xs bg-gray-50 border border-[#E2E8F0] px-2 py-1 rounded inline-block">
                          {booking.bookingNumber}
                        </div>
                        {booking.employeeId && (
                          <div className="text-[10px] text-gray-500 font-mono mt-1">
                            Emp: {booking.employeeId}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-[#0F172A]">
                          {booking.customer ? booking.customer.name : 'Unknown Customer'}
                        </div>
                        {booking.customer?.companyName && (
                          <div className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase mt-0.5">
                            {booking.customer.companyName}
                          </div>
                        )}
                        {booking.guestName && (
                          <div className="text-[11px] text-[#64748B] mt-1 font-medium bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded inline-block">
                            <span className="font-bold text-[#475569]">Guest:</span> {booking.guestSalutation} {booking.guestName}
                          </div>
                        )}
                        {booking.bookingBy && (
                          <div className="text-[10px] text-[#64748B] mt-0.5">
                            <span className="font-semibold text-gray-600">Booked by:</span> {booking.bookingBy}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 uppercase tracking-wide">
                          {booking.tripType.replace('_', ' ')}
                        </span>
                        <div className="text-xs text-[#64748B] mt-1 font-medium">Req: {booking.vehicleTypeRequired}</div>
                      </td>
                      <td className="py-4 px-6">
                        {activeAssignment ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-blue-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                              </svg>
                              <span>{activeAssignment.driver?.name || 'Assigned Driver'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-mono">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-emerald-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.847-13.56a1.978 1.978 0 0 0-1.972-1.854l-5.322.024" />
                              </svg>
                              <span className="font-bold text-[#0F172A] bg-gray-50 border border-[#E2E8F0] px-1.5 py-0.5 rounded text-[11px]">{activeAssignment.vehicle?.vehicleNumber || 'Cab'}</span>
                              {activeAssignment.vehicle?.model && <span className="text-[10px]">({activeAssignment.vehicle.model})</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold inline-block">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1 max-w-xs text-xs">
                          <div className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                            <span className="text-[#0F172A] truncate" title={booking.pickupLocation}>
                              {booking.pickupLocation}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0"></span>
                            <span className="text-[#64748B] truncate" title={booking.dropLocation}>
                              {booking.dropLocation}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-[#0F172A] font-medium">
                          {booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString('en-GB') : 'N/A'}
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">{formatTimeTo24h(booking.pickupTime)}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          booking.status === 'PENDING' ? 'text-amber-700 bg-amber-50 border border-amber-200' :
                          booking.status === 'ASSIGNED' ? 'text-indigo-700 bg-indigo-50 border border-indigo-200' :
                          booking.status === 'STARTED' ? 'text-blue-700 bg-blue-50 border border-blue-200' :
                          booking.status === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                          'text-red-700 bg-red-50 border border-red-200'
                        }`}>
                          {booking.status.replace('_', ' ')}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-4 px-6 text-right space-x-2">
                          {(!activeAssignment || booking.status === 'PENDING') && (
                            <button
                              onClick={() => handleOpenAssign(booking)}
                              className="px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 bg-blue-600 border border-blue-500 rounded-lg transition shadow-sm"
                            >
                              Assign
                            </button>
                          )}
                          {booking.dutySlip && (
                            <button
                              onClick={() => downloadPdf(booking.dutySlip!.id, booking.dutySlip!.dutySlipNumber)}
                              className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-100 rounded-lg transition"
                            >
                              Print Slip
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(booking)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(booking.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-100 rounded-lg transition"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-[#F8FAFC]">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
            >
              Previous
            </button>
            <span className="text-xs text-[#64748B]">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Creation / Edition Slide-over Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-[500px] h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#0F172A]">
                  {editingId ? 'Edit Booking Details' : 'Create New Booking'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {editingId && (
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Booking Status
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['PENDING', 'ASSIGNED', 'STARTED', 'COMPLETED', 'CANCELLED'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: status as any })}
                          className={`py-2 text-center rounded-lg text-[9px] font-bold uppercase border transition-all ${
                            formData.status === status
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
                          }`}
                        >
                          {status.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Select Customer
                  </label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Salutation
                    </label>
                    <select
                      value={formData.guestSalutation}
                      onChange={(e) => setFormData({ ...formData, guestSalutation: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    >
                      <option value="Mr">Mr.</option>
                      <option value="Mrs">Mrs.</option>
                      <option value="Ms">Ms.</option>
                      <option value="Dr">Dr.</option>
                      <option value="Prof">Prof.</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Guest / Passenger Name
                    </label>
                    <input
                      type="text"
                      value={formData.guestName}
                      onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                      placeholder="Passenger name"
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Booked By
                    </label>
                    <input
                      type="text"
                      value={formData.bookingBy}
                      onChange={(e) => setFormData({ ...formData, bookingBy: e.target.value })}
                      placeholder="Booked by name"
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      placeholder="Employee ID (optional)"
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Special Remarks / Instructions
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Enter special instructions or remarks"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Trip Type
                    </label>
                    <select
                      required
                      value={formData.tripType}
                      onChange={(e) => setFormData({ ...formData, tripType: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    >
                      <option value="LOCAL">Local Trip</option>
                      <option value="AIRPORT_TRANSFER">Airport Transfer</option>
                      <option value="OUTSTATION">Outstation</option>
                      <option value="HOURLY_RENTAL">Hourly Rental</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Vehicle Type Required
                    </label>
                    <select
                      required
                      value={formData.vehicleTypeRequired}
                      onChange={(e) => setFormData({ ...formData, vehicleTypeRequired: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    >
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Sedan">Sedan</option>
                          <option value="SUV">SUV</option>
                          <option value="MUV">MUV</option>
                          <option value="Luxury">Luxury</option>
                          <option value="Tempo Traveller">Tempo Traveller</option>
                          <option value="Bus">Bus</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Pickup Location Address
                  </label>
                  <textarea
                    required
                    value={formData.pickupLocation}
                    onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                    placeholder="Enter complete pickup address"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Drop Location Address
                  </label>
                  <textarea
                    required
                    value={formData.dropLocation}
                    onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                    placeholder="Enter complete drop address"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Pickup Date
                    </label>
                    <DatePicker
                      value={formData.pickupDate}
                      onChange={(val) => setFormData({ ...formData, pickupDate: val })}
                      format="DD/MM/YYYY"
                      placeholder="DD/MM/YYYY"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Pickup Time (24h)
                    </label>
                    <input
                      type="text"
                      placeholder="HH:mm"
                      maxLength={5}
                      required
                      value={formData.pickupTime}
                      onChange={(e) => setFormData({ ...formData, pickupTime: handleTimeChange(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition text-xs"
                    />
                  </div>
                </div>

                {/* Driver and Cab Manual Selection */}
                <div className="border-t border-b border-[#E2E8F0] py-4 my-2 space-y-4 bg-blue-50/40 -mx-6 px-6">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600 shrink-0">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0h2.1a2.5 2.5 0 014.9 0H17a1 1 0 001-1v-5l-2-4H3z" />
                    </svg>
                    <span>Manual Driver & Cab Assignment</span>
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                        Select Driver
                      </label>
                      <select
                        value={formData.driverId}
                        onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      >
                        <option value="">-- No Driver Assigned (Keep Pending) --</option>
                        {allDrivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.mobile}) [{d.status}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                        Select Cab / Vehicle
                      </label>
                      <select
                        value={formData.vehicleId}
                        onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      >
                        <option value="">-- No Cab Assigned (Keep Pending) --</option>
                        {allVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.vehicleNumber} - {v.model} ({v.vehicleType}) [{v.status}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-8 border-t border-[#E2E8F0] pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-1/2 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg text-sm transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={submitting}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Booking'}
              </button>
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
                disabled={assigningSubmitting || loadingResources || availableDrivers.length === 0 || availableVehicles.length === 0}
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
