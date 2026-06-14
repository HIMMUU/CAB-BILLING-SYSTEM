'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Customer {
  id: string;
  name: string;
  companyName: string | null;
}

interface Booking {
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

interface Assignment {
  id: string;
  bookingId: string;
  driverId: string;
  vehicleId: string;
  assignedAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  booking: Booking;
  driver: Driver;
  vehicle: Vehicle;
}

export default function AssignmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Data lists
  const [unassignedBookings, setUnassignedBookings] = useState<Booking[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter for History
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistoryPages, setTotalHistoryPages] = useState(1);

  // Drawer / Assigning Form State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false);
  
  // Selection
  const [targetDriverId, setTargetDriverId] = useState('');
  const [targetVehicleId, setTargetVehicleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const fetchUnassignedBookings = async () => {
    setLoadingUnassigned(true);
    try {
      const res = await api.request('/bookings?status=PENDING&limit=100');
      setUnassignedBookings(res.data || []);
    } catch (err: any) {
      console.error('Failed to load pending bookings', err);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const fetchAssignmentsHistory = async () => {
    setLoadingHistory(true);
    try {
      let url = `/assignments?page=${historyPage}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;

      const res = await api.request(url);
      setAssignments(res.data || []);
      setTotalHistoryPages(res.meta.totalPages || 1);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignment logs');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnassignedBookings();
      fetchAssignmentsHistory();
    }
  }, [user, historyPage, filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHistoryPage(1);
    fetchAssignmentsHistory();
  };

  const handleOpenAssign = async (booking: Booking) => {
    setSelectedBooking(booking);
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

    if (!selectedBooking || !targetDriverId || !targetVehicleId) {
      setDrawerError('Please select both a driver and a vehicle.');
      return;
    }

    setSubmitting(true);
    try {
      await api.request('/assignments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          driverId: targetDriverId,
          vehicleId: targetVehicleId,
        }),
      });

      setIsAssignDrawerOpen(false);
      setSelectedBooking(null);
      // Reload both tables
      fetchUnassignedBookings();
      fetchAssignmentsHistory();
    } catch (err: any) {
      setDrawerError(err.message || 'Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (assignmentId: string, status: 'COMPLETED' | 'CANCELLED') => {
    const actionLabel = status === 'COMPLETED' ? 'complete' : 'cancel';
    if (!confirm(`Are you sure you want to ${actionLabel} this assignment?`)) return;

    try {
      await api.request(`/assignments/${assignmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      // Reload both lists
      fetchUnassignedBookings();
      fetchAssignmentsHistory();
    } catch (err: any) {
      alert(err.message || `Failed to update assignment status.`);
    }
  };

  if (!user) return null;

  const canEdit = user.role !== 'BILLING_EXECUTIVE';

  // Find info of currently selected vehicle
  const selectedVehicleObj = availableVehicles.find((v) => v.id === targetVehicleId);
  const vehicleTypeMismatch = 
    selectedBooking && 
    selectedVehicleObj && 
    selectedBooking.vehicleTypeRequired.toLowerCase() !== selectedVehicleObj.vehicleType.toLowerCase();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Driver & Vehicle Dispatch</h1>
        <p className="text-sm text-[#64748B] mt-1">Assign available drivers and vehicles to incoming bookings with overlapping trip validation</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* SECTION 1: Unassigned Bookings */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#E2E8F0] bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Pending Bookings Queue</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Bookings needing dispatch resource allocation</p>
          </div>
          <span className="text-xs bg-amber-50 text-amber-700 font-bold border border-amber-200 px-2.5 py-0.5 rounded-full uppercase">
            {unassignedBookings.length} Pending
          </span>
        </div>

        {loadingUnassigned ? (
          <div className="p-12 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : unassignedBookings.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            All bookings have been successfully assigned or completed!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider bg-gray-50/50">
                  <th className="py-2.5 px-6">Booking Code</th>
                  <th className="py-2.5 px-6">Customer</th>
                  <th className="py-2.5 px-6">Trip & Req. Vehicle</th>
                  <th className="py-2.5 px-6">Route</th>
                  <th className="py-2.5 px-6">Pickup Date & Time</th>
                  {canEdit && <th className="py-2.5 px-6 text-right">Dispatch</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                {unassignedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-6">
                      <div className="font-bold text-[#0F172A] tracking-wider font-mono text-xs">
                        {b.bookingNumber}
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="font-semibold text-[#0F172A] text-xs">{b.customer?.name}</div>
                      {b.customer?.companyName && (
                        <div className="text-[10px] text-gray-400 truncate max-w-xs">{b.customer.companyName}</div>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      <span className="text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">
                        {b.tripType.replace('_', ' ')}
                      </span>
                      <div className="text-xs text-[#64748B] mt-1 font-medium">Req: {b.vehicleTypeRequired}</div>
                    </td>
                    <td className="py-3 px-6 text-xs text-[#64748B]">
                      <div className="truncate max-w-xs" title={`${b.pickupLocation} to ${b.dropLocation}`}>
                        <span className="text-[#0F172A] font-medium">From:</span> {b.pickupLocation} &rarr; <span className="text-[#0F172A] font-medium">To:</span> {b.dropLocation}
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="text-xs text-[#0F172A] font-medium">{new Date(b.pickupDate).toLocaleDateString('en-GB')}</div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">{b.pickupTime}</div>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => handleOpenAssign(b)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                        >
                          Assign Resource
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

      {/* SECTION 2: Assignment History Logs */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#E2E8F0] bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Dispatch Logs & History</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Overview of active resource dispatches and past assignment logs</p>
          </div>

          <div className="flex bg-gray-100 p-0.5 border border-[#E2E8F0] rounded-lg self-start text-xs font-semibold">
            {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st);
                  setHistoryPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filterStatus === st ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {st.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-[#E2E8F0] bg-gray-50/30">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by driver, plate, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 transition"
            />
          </form>
        </div>

        {loadingHistory ? (
          <div className="p-12 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">No assignment logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-3 px-6">Booking Code</th>
                  <th className="py-3 px-6">Assigned Driver</th>
                  <th className="py-3 px-6">Assigned Vehicle</th>
                  <th className="py-3 px-6">Trip Date</th>
                  <th className="py-3 px-6">Status</th>
                  {canEdit && <th className="py-3 px-6 text-right">Manage status</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                {assignments.map((a) => {
                  return (
                    <tr key={a.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-[#0F172A] tracking-wider font-mono text-xs">
                          {a.booking?.bookingNumber || 'N/A'}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Cust: {a.booking?.customer?.name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-[#0F172A]">{a.driver?.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{a.driver?.mobile}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-mono text-xs font-bold text-[#0F172A] bg-gray-50 border border-[#E2E8F0] px-1.5 py-0.5 rounded inline-block">
                          {a.vehicle?.vehicleNumber}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{a.vehicle?.model}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-xs text-[#0F172A] font-medium">
                          {a.booking?.pickupDate ? new Date(a.booking.pickupDate).toLocaleDateString('en-GB') : 'N/A'}
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">{a.booking?.pickupTime}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          a.status === 'ACTIVE' ? 'text-blue-700 bg-blue-50 border border-blue-200' :
                          a.status === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                          'text-red-700 bg-red-50 border border-red-200'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-4 px-6 text-right">
                          {a.status === 'ACTIVE' ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdateStatus(a.id, 'COMPLETED')}
                                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-lg transition"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(a.id, 'CANCELLED')}
                                className="px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 rounded-lg transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Locked</span>
                          )}
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
        {!loadingHistory && totalHistoryPages > 1 && (
          <div className="border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-[#F8FAFC]">
            <button
              disabled={historyPage === 1}
              onClick={() => setHistoryPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
            >
              Previous
            </button>
            <span className="text-xs text-[#64748B]">
              Page {historyPage} of {totalHistoryPages}
            </span>
            <button
              disabled={historyPage === totalHistoryPages}
              onClick={() => setHistoryPage((p) => Math.min(p + 1, totalHistoryPages))}
              className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Dispatch Assignment Drawer */}
      {isAssignDrawerOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-[500px] h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Dispatch Assignment</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Allocate conflict-free resources for {selectedBooking.bookingNumber}</p>
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
                      <span className="text-[#64748B] font-medium">{selectedBooking.customer?.name} {selectedBooking.customer?.companyName ? `(${selectedBooking.customer.companyName})` : ''}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-bold text-[#0F172A] block uppercase tracking-wider text-[10px]">Requested Date/Time:</span>
                        <span className="text-[#64748B] font-medium">{new Date(selectedBooking.pickupDate).toLocaleDateString('en-GB')} at {selectedBooking.pickupTime}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#0F172A] block uppercase tracking-wider text-[10px]">Requested Vehicle Type:</span>
                        <span className="text-blue-700 bg-blue-50 border border-blue-100 font-bold px-1.5 py-0.5 rounded text-[10px] w-fit inline-block mt-0.5 uppercase">
                          {selectedBooking.vehicleTypeRequired}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-[#0F172A] block uppercase tracking-wider text-[10px]">Route:</span>
                      <span className="text-[#64748B] font-medium truncate block">{selectedBooking.pickupLocation} &rarr; {selectedBooking.dropLocation}</span>
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
                          Vehicle type mismatch! Requested: {selectedBooking.vehicleTypeRequired}, selected is: {selectedVehicleObj.vehicleType}.
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
                disabled={submitting || loadingResources || availableDrivers.length === 0 || availableVehicles.length === 0}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {submitting ? 'Dispatching...' : 'Dispatch Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
