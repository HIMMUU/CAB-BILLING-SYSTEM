'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Customer {
  id: string;
  name: string;
  companyName: string | null;
  type: 'CORPORATE' | 'INDIVIDUAL';
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
}

export default function BookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  });

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      fetchCustomers();
    }
  }, [router]);

  const fetchCustomers = async () => {
    try {
      const res = await api.request('/customers?limit=100');
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to load customers list', err);
    }
  };

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
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (booking: Booking) => {
    setEditingId(booking.id);
    setFormData({
      customerId: booking.customerId,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
      pickupDate: booking.pickupDate ? booking.pickupDate.substring(0, 10) : '',
      pickupTime: booking.pickupTime,
      tripType: booking.tripType,
      vehicleTypeRequired: booking.vehicleTypeRequired,
      status: booking.status,
      employeeId: booking.employeeId || '',
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

    setSubmitting(true);

    try {
      if (editingId) {
        await api.request(`/bookings/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      } else {
        await api.request('/bookings', {
          method: 'POST',
          body: JSON.stringify(formData),
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

  if (!user) return null;

  const canEdit = user.role !== 'BILLING_EXECUTIVE';

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
                  <th className="py-3 px-6">Employee ID</th>
                  <th className="py-3 px-6">Customer</th>
                  <th className="py-3 px-6">Trip & Vehicle</th>
                  <th className="py-3 px-6">Locations (Pickup &rarr; Drop)</th>
                  <th className="py-3 px-6">Pickup Date & Time</th>
                  <th className="py-3 px-6">Status</th>
                  {canEdit && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                {bookings.map((booking) => {
                  return (
                    <tr key={booking.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-[#0F172A] tracking-wider font-mono text-xs bg-gray-50 border border-[#E2E8F0] px-2 py-1 rounded inline-block">
                          {booking.bookingNumber}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-[#0F172A]">
                        {booking.employeeId || '---'}
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
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 uppercase tracking-wide">
                          {booking.tripType.replace('_', ' ')}
                        </span>
                        <div className="text-xs text-[#64748B] mt-1 font-medium">Req: {booking.vehicleTypeRequired}</div>
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
                        <div className="text-xs text-[#64748B] mt-0.5">{booking.pickupTime}</div>
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
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Hatchback">Hatchback</option>
                      <option value="Luxury">Luxury</option>
                      <option value="Van">Van</option>
                      <option value="Bus">Bus</option>
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
                    <input
                      type="date"
                      required
                      value={formData.pickupDate}
                      onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Pickup Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.pickupTime}
                      onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="Enter Employee ID (optional)"
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  />
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
    </div>
  );
}
