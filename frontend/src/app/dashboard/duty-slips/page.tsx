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
  vehicleTypeRequired: string;
  customer: Customer;
}

interface Driver {
  id: string;
  name: string;
  mobile: string;
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  model: string;
  vehicleType: string;
}

interface DutySlip {
  id: string;
  dutySlipNumber: string;
  bookingId: string;
  driverId: string;
  vehicleId: string;
  reportingTime: string;
  startKm: number;
  endKm: number | null;
  toll: number;
  parking: number;
  nightCharges: number;
  driverAllowance: number;
  extraCharges: number;
  status: 'DRAFT' | 'FILLED' | 'CLOSED';
  booking: Booking;
  driver: Driver;
  vehicle: Vehicle;
}

interface CalculationPreview {
  baseFareCharged: number;
  extraKmCharged: number;
  extraHoursCharged: number;
  toll: number;
  parking: number;
  driverAllowance: number;
  nightCharges: number;
  extraCharges: number;
  totalDistance: number;
  totalAmount: number;
}

export default function DutySlipsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Data lists
  const [dutySlips, setDutySlips] = useState<DutySlip[]>([]);
  const [assignedBookings, setAssignedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
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

  // Form inputs (Create)
  const [createFormData, setCreateFormData] = useState({
    bookingId: '',
    reportingTime: '',
    startKm: 0,
  });

  // Form inputs (Edit / Update)
  const [editFormData, setEditFormData] = useState({
    reportingTime: '',
    startKm: 0,
    endKm: 0,
    toll: 0,
    parking: 0,
    nightCharges: 0,
    driverAllowance: 0,
    extraCharges: 0,
    status: 'DRAFT' as 'DRAFT' | 'FILLED' | 'CLOSED',
  });

  // Trip Closure Drawer State
  const [isCloseTripOpen, setIsCloseTripOpen] = useState(false);
  const [closeSlip, setCloseSlip] = useState<DutySlip | null>(null);
  const [closeFormData, setCloseFormData] = useState({
    endKm: 0,
    extraHours: 0,
    toll: 0,
    parking: 0,
    driverAllowance: 0,
    nightCharges: 0,
    extraCharges: 0,
  });
  const [calcPreview, setCalcPreview] = useState<CalculationPreview | null>(null);
  const [loadingCalc, setLoadingCalc] = useState(false);

  // Print Preview state
  const [printSlip, setPrintSlip] = useState<DutySlip | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      fetchAssignedBookings();
    }
  }, [router]);

  const fetchAssignedBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await api.request('/bookings?status=ASSIGNED&limit=100');
      setAssignedBookings(res.data || []);
    } catch (err) {
      console.error('Failed to load assigned bookings list', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchDutySlips = async () => {
    setLoading(true);
    try {
      let url = `/duty-slips?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;

      const res = await api.request(url);
      setDutySlips(res.data || []);
      setTotalPages(res.meta.totalPages || 1);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load duty slips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDutySlips();
    }
  }, [user, page, filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDutySlips();
  };

  const handleOpenCreate = () => {
    fetchAssignedBookings();
    setEditingId(null);
    setCreateFormData({
      bookingId: assignedBookings[0]?.id || '',
      reportingTime: '',
      startKm: 0,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (slip: DutySlip) => {
    setEditingId(slip.id);
    const rawTime = slip.reportingTime ? new Date(slip.reportingTime) : new Date();
    const formattedTime = new Date(rawTime.getTime() - rawTime.getTimezoneOffset() * 60000)
      .toISOString()
      .substring(0, 16);

    setEditFormData({
      reportingTime: formattedTime,
      startKm: Number(slip.startKm),
      endKm: slip.endKm ? Number(slip.endKm) : Number(slip.startKm),
      toll: Number(slip.toll),
      parking: Number(slip.parking),
      nightCharges: Number(slip.nightCharges),
      driverAllowance: Number(slip.driverAllowance),
      extraCharges: Number(slip.extraCharges),
      status: slip.status,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // TRIP CLOSURE: Open Close Drawer
  const handleOpenCloseTrip = (slip: DutySlip) => {
    setCloseSlip(slip);
    setCloseFormData({
      endKm: slip.endKm ? Number(slip.endKm) : Number(slip.startKm) + 50, // default placeholder run
      extraHours: 0,
      toll: Number(slip.toll),
      parking: Number(slip.parking),
      driverAllowance: Number(slip.driverAllowance),
      nightCharges: Number(slip.nightCharges),
      extraCharges: Number(slip.extraCharges),
    });
    setCalcPreview(null);
    setDrawerError(null);
    setIsCloseTripOpen(true);
  };

  // TRIP CLOSURE: Run Calculation
  const runPreviewCalculation = async () => {
    if (!closeSlip) return;
    setLoadingCalc(true);
    setDrawerError(null);
    try {
      const endKm = Number(closeFormData.endKm);
      const startKm = Number(closeSlip.startKm);
      if (endKm < startKm) {
        throw new Error('End KM cannot be less than Start KM');
      }

      const res = await api.request(
        `/trips/calculate?dutySlipId=${closeSlip.id}&endKm=${endKm}&extraHours=${closeFormData.extraHours}`
      );
      setCalcPreview(res);
    } catch (err: any) {
      setDrawerError(err.message || 'Failed to fetch calculation preview.');
    } finally {
      setLoadingCalc(false);
    }
  };

  useEffect(() => {
    if (isCloseTripOpen && closeSlip) {
      runPreviewCalculation();
    }
  }, [isCloseTripOpen, closeFormData.endKm, closeFormData.extraHours, closeFormData.toll, closeFormData.parking, closeFormData.driverAllowance, closeFormData.nightCharges, closeFormData.extraCharges]);

  const handleCloseTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrawerError(null);

    if (!closeSlip || !calcPreview) return;

    setSubmitting(true);
    try {
      await api.request('/trips', {
        method: 'POST',
        body: JSON.stringify({
          dutySlipId: closeSlip.id,
          endKm: Number(closeFormData.endKm),
          toll: Number(closeFormData.toll),
          parking: Number(closeFormData.parking),
          driverAllowance: Number(closeFormData.driverAllowance),
          nightCharges: Number(closeFormData.nightCharges),
          extraCharges: Number(closeFormData.extraCharges),
          baseFareCharged: calcPreview.baseFareCharged,
          extraKmCharged: calcPreview.extraKmCharged,
          extraHoursCharged: calcPreview.extraHoursCharged,
          totalAmount: calcPreview.totalAmount + 
            (Number(closeFormData.toll) - Number(calcPreview.toll)) +
            (Number(closeFormData.parking) - Number(calcPreview.parking)) +
            (Number(closeFormData.driverAllowance) - Number(calcPreview.driverAllowance)) +
            (Number(closeFormData.nightCharges) - Number(calcPreview.nightCharges)) +
            (Number(closeFormData.extraCharges) - Number(calcPreview.extraCharges)),
        }),
      });

      setIsCloseTripOpen(false);
      setCloseSlip(null);
      fetchDutySlips();
    } catch (err: any) {
      setDrawerError(err.message || 'Failed to finalize trip closure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!createFormData.bookingId || !createFormData.reportingTime) {
      setFormError('Booking selection and reporting time are required.');
      return;
    }

    setSubmitting(true);
    try {
      await api.request('/duty-slips', {
        method: 'POST',
        body: JSON.stringify(createFormData),
      });

      setIsFormOpen(false);
      fetchDutySlips();
      fetchAssignedBookings();
    } catch (err: any) {
      setFormError(err.message || 'Failed to generate duty slip.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (editFormData.endKm < editFormData.startKm) {
      setFormError('End odometer KM cannot be less than Start KM.');
      return;
    }

    setSubmitting(true);
    try {
      await api.request(`/duty-slips/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(editFormData),
      });

      setIsFormOpen(false);
      setEditingId(null);
      fetchDutySlips();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update duty slip.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this duty slip?')) return;
    try {
      await api.request(`/duty-slips/${id}`, { method: 'DELETE' });
      fetchDutySlips();
      fetchAssignedBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete duty slip.');
    }
  };

  const handleDownloadPdf = async (slipId: string, slipNumber: string) => {
    try {
      const token = api.getToken();
      const response = await fetch(`http://localhost:4000/api/v1/duty-slips/${slipId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Duty-Slip-${slipNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'Failed to export PDF.');
    }
  };

  const handleTriggerPrint = (slip: DutySlip) => {
    setPrintSlip(slip);
    setIsPrintModalOpen(true);
  };

  const executeBrowserPrint = () => {
    window.print();
  };

  const [drawerError, setDrawerError] = useState<string | null>(null);

  if (!user) return null;

  const canEdit = user.role !== 'BILLING_EXECUTIVE';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Duty Slips</h1>
          <p className="text-sm text-[#64748B] mt-1">Generate operational trip sheets, log travel metrics, and finalize trip closures</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Create Duty Slip</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Toolbar Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search slip, booking, driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 transition"
          />
        </form>

        <div className="flex bg-gray-100 p-0.5 border border-[#E2E8F0] rounded-lg overflow-x-auto self-start text-xs font-semibold">
          {['ALL', 'DRAFT', 'FILLED', 'CLOSED'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterStatus === status ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {status.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Slips List Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : dutySlips.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No duty slips found. Complete assignments to generate operational slips.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-3 px-6">Duty Slip Code</th>
                  <th className="py-3 px-6">Booking Details</th>
                  <th className="py-3 px-6">Allocated Resources</th>
                  <th className="py-3 px-6">Trip Log (Odometer)</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                {dutySlips.map((slip) => {
                  const hasOdometer = slip.endKm !== null;
                  const distanceRun = hasOdometer ? Number(slip.endKm) - Number(slip.startKm) : null;
                  return (
                    <tr key={slip.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-6 font-bold text-[#0F172A] tracking-wider font-mono text-xs">
                        {slip.dutySlipNumber}
                      </td>
                      <td className="py-4 px-6 text-xs text-[#64748B]">
                        <div className="font-semibold text-[#0F172A]">{slip.booking?.bookingNumber}</div>
                        <div className="mt-0.5 font-medium uppercase text-[10px] text-gray-500">
                          {slip.booking?.customer?.name}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-[#64748B]">
                        <div className="font-semibold text-[#0F172A]">{slip.driver?.name}</div>
                        <div className="mt-0.5 font-mono bg-gray-50 border border-gray-100 rounded px-1 w-fit">
                          {slip.vehicle?.vehicleNumber} ({slip.vehicle?.model})
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-[#64748B]">
                        <div>Start: <span className="font-bold text-[#0F172A] font-mono">{slip.startKm} KM</span></div>
                        <div className="mt-0.5">End: <span className="font-bold text-[#0F172A] font-mono">{slip.endKm !== null ? `${slip.endKm} KM` : '---'}</span></div>
                        {distanceRun !== null && (
                          <div className="mt-1 text-blue-700 bg-blue-50 border border-blue-100 px-1 py-0.5 rounded font-bold w-fit text-[9px] uppercase font-mono">
                            Run: {distanceRun} KM
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          slip.status === 'DRAFT' ? 'text-gray-500 bg-gray-100 border border-gray-200' :
                          slip.status === 'FILLED' ? 'text-amber-700 bg-amber-50 border border-amber-200' :
                          'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        }`}>
                          {slip.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleTriggerPrint(slip)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-black bg-white border border-[#E2E8F0] rounded-lg transition"
                        >
                          Print
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(slip.id, slip.dutySlipNumber)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 rounded-lg transition"
                        >
                          PDF
                        </button>
                        {canEdit && slip.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleOpenCloseTrip(slip)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                          >
                            Close Trip
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(slip)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-[#0f172a] bg-white border border-[#E2E8F0] rounded-lg transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(slip.id)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-100 rounded-lg transition"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
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
          <div className="w-full max-w-[500px] h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-in">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#0F172A]">
                  {editingId ? 'Update Operational Logs' : 'Generate Operational Duty Slip'}
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

              {/* CREATE SLIP FORM */}
              {!editingId && (
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  {loadingBookings ? (
                    <div className="p-8 text-center text-xs text-gray-500">Querying assignments...</div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Select Assigned Booking
                      </label>
                      <select
                        required
                        value={createFormData.bookingId}
                        onChange={(e) => setCreateFormData({ ...createFormData, bookingId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      >
                        <option value="">-- Choose Booking --</option>
                        {assignedBookings.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bookingNumber} - {b.customer?.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Driver and Vehicle metadata will be automatically inherited from the active dispatch assignment.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Reporting Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={createFormData.reportingTime}
                      onChange={(e) => setCreateFormData({ ...createFormData, reportingTime: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Start Odometer KM
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={createFormData.startKm}
                      onChange={(e) => setCreateFormData({ ...createFormData, startKm: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                    />
                  </div>
                </form>
              )}

              {/* EDIT / UPDATE SLIP FORM */}
              {editingId && (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Slip Status
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['DRAFT', 'FILLED', 'CLOSED'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, status: status as any })}
                          className={`py-2 text-center rounded-lg text-xs font-bold uppercase border transition-all ${
                            editFormData.status === status
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
                          }`}
                        >
                          {status.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Reporting Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={editFormData.reportingTime}
                        onChange={(e) => setEditFormData({ ...editFormData, reportingTime: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Start KM
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editFormData.startKm}
                        onChange={(e) => setEditFormData({ ...editFormData, startKm: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        End KM (Odometer)
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editFormData.endKm}
                        onChange={(e) => setEditFormData({ ...editFormData, endKm: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Toll Taxes (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editFormData.toll}
                        onChange={(e) => setEditFormData({ ...editFormData, toll: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Parking (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editFormData.parking}
                        onChange={(e) => setEditFormData({ ...editFormData, parking: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Night Charges (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editFormData.nightCharges}
                        onChange={(e) => setEditFormData({ ...editFormData, nightCharges: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Driver Allowance (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editFormData.driverAllowance}
                        onChange={(e) => setEditFormData({ ...editFormData, driverAllowance: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Extra Surcharges (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editFormData.extraCharges}
                        onChange={(e) => setEditFormData({ ...editFormData, extraCharges: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                      />
                    </div>
                  </div>
                </form>
              )}
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
                onClick={editingId ? handleEditSubmit : handleCreateSubmit}
                disabled={submitting}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Duty Slip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRIP CLOSURE DRAWER */}
      {isCloseTripOpen && closeSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-[500px] h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-in">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Close Operational Trip</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Finalize calculations and release dispatch assets</p>
                </div>
                <button
                  onClick={() => setIsCloseTripOpen(false)}
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

              <form onSubmit={handleCloseTripSubmit} className="space-y-4">
                {/* Summary Metadata card */}
                <div className="p-4 bg-gray-50 border border-[#E2E8F0] rounded-lg text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#0F172A]">Duty Slip Number:</span>
                    <span className="font-mono text-gray-700 font-bold">{closeSlip.dutySlipNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-[#0F172A]">Customer Name:</span>
                    <span className="text-gray-700 font-medium">{closeSlip.booking?.customer?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-[#0F172A]">Vehicle Plate:</span>
                    <span className="text-gray-700 font-medium font-mono">{closeSlip.vehicle?.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200/60 pt-1.5 mt-1.5">
                    <span className="font-bold text-[#0F172A]">Start Odometer:</span>
                    <span className="font-mono text-[#0F172A] font-bold">{closeSlip.startKm} KM</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      End Odometer KM
                    </label>
                    <input
                      type="number"
                      required
                      min={closeSlip.startKm}
                      value={closeFormData.endKm}
                      onChange={(e) => setCloseFormData({ ...closeFormData, endKm: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Extra Hours (Time Overrun)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={closeFormData.extraHours}
                      onChange={(e) => setCloseFormData({ ...closeFormData, extraHours: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono"
                    />
                  </div>
                </div>

                {/* Editable Incidental Expenses */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-3">
                  <h4 className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider">Incidental Costs Verification</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Tolls (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={closeFormData.toll}
                        onChange={(e) => setCloseFormData({ ...closeFormData, toll: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border border-[#E2E8F0] rounded font-mono text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Parking (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={closeFormData.parking}
                        onChange={(e) => setCloseFormData({ ...closeFormData, parking: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border border-[#E2E8F0] rounded font-mono text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Allowance (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={closeFormData.driverAllowance}
                        onChange={(e) => setCloseFormData({ ...closeFormData, driverAllowance: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border border-[#E2E8F0] rounded font-mono text-xs bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Engine Output Summary Card */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-bold text-[9px] uppercase tracking-wider text-gray-500 flex justify-between items-center">
                    <span>Rate Card Summary Calculation</span>
                    {loadingCalc && (
                      <span className="text-blue-600 animate-pulse text-[8px]">Recalculating...</span>
                    )}
                  </div>

                  {calcPreview ? (
                    <div className="p-4 text-xs divide-y divide-gray-100">
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500">Calculated Distance:</span>
                        <span className="font-bold font-mono text-gray-800">{calcPreview.totalDistance} KM</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500">Base Fare Charged:</span>
                        <span className="font-mono text-gray-800">₹{Number(calcPreview.baseFareCharged).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500">Extra KM Cost:</span>
                        <span className="font-mono text-gray-800">₹{Number(calcPreview.extraKmCharged).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500">Extra Hours Cost:</span>
                        <span className="font-mono text-gray-800">₹{Number(calcPreview.extraHoursCharged).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500">Tolls & Incidentals:</span>
                        <span className="font-mono text-gray-800">
                          ₹{(
                            Number(closeFormData.toll) +
                            Number(closeFormData.parking) +
                            Number(closeFormData.driverAllowance) +
                            Number(closeFormData.nightCharges) +
                            Number(closeFormData.extraCharges)
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 text-sm font-bold bg-emerald-50/50 -mx-4 px-4 pt-2 mt-2">
                        <span className="text-emerald-800">Final Charges:</span>
                        <span className="text-emerald-800 font-mono text-base">
                          ₹{(
                            calcPreview.baseFareCharged +
                            calcPreview.extraKmCharged +
                            calcPreview.extraHoursCharged +
                            Number(closeFormData.toll) +
                            Number(closeFormData.parking) +
                            Number(closeFormData.driverAllowance) +
                            Number(closeFormData.nightCharges) +
                            Number(closeFormData.extraCharges)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-400">Loading live calculations...</div>
                  )}
                </div>
              </form>
            </div>

            <div className="mt-8 border-t border-[#E2E8F0] pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCloseTripOpen(false)}
                className="w-1/2 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg text-sm transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseTripSubmit}
                disabled={submitting || loadingCalc || !calcPreview}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {submitting ? 'Closing...' : 'Close & Finalize Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Section Overlay */}
      {isPrintModalOpen && printSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          {/* Inject print stylesheet dynamically for print-section isolation */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #print-section, #print-section * {
                visibility: visible;
              }
              #print-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 20px;
                box-shadow: none;
                border: none;
              }
            }
          `}</style>
          
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-3xl overflow-hidden flex flex-col justify-between h-[90vh]">
            {/* Modal Controls Bar */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Trip Sheet Print Preview</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">Styled optimized document layout for paper record sheets</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={executeBrowserPrint}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0a1.072 1.072 0 0 1-1 .738H7.34a1.072 1.072 0 0 1-1-.738m12.32 0c.517-.534.814-1.248.814-2.03V10.5c0-1.657-1.343-3-3-3h-9.75c-1.657 0-3 1.343-3 3v5.47c0 .782.297 1.496.814 2.03m12.32 0a1.072 1.072 0 0 1-.038-.666M6.34 18a1.072 1.072 0 0 0 .038-.666M8.25 7.5h7.5M8.25 3.75h7.5M9 13.5h6" />
                  </svg>
                  <span>Trigger Print</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Sheet Area */}
            <div className="p-8 overflow-y-auto flex-1 bg-gray-100/30">
              <div id="print-section" className="bg-white border border-gray-300 p-8 shadow-sm max-w-2xl mx-auto text-slate-800 font-sans text-xs">
                {/* Visual Header */}
                <div className="border-b-2 border-blue-600 pb-4 mb-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-xl font-black text-blue-600 tracking-tight">CABBS FLEET MANAGEMENT</h2>
                    <p className="text-[10px] text-gray-500 font-medium">Operational Dispatch & Trip sheet ledger</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-bold text-gray-800">DUTY SLIP SHEET</h3>
                    <span className="font-mono bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-bold text-[10px]">
                      {printSlip.dutySlipNumber}
                    </span>
                  </div>
                </div>

                {/* Info Blocks Grid */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Left Column (Metadata) */}
                  <div className="space-y-1.5">
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[8px] block">Customer:</span>
                      <span className="font-semibold text-gray-800">{printSlip.booking?.customer?.name}</span>
                    </div>
                    {printSlip.booking?.customer?.companyName && (
                      <div>
                        <span className="font-bold text-gray-500 uppercase tracking-wider text-[8px] block">Company:</span>
                        <span className="text-gray-700 font-medium">{printSlip.booking.customer.companyName}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[8px] block">Reporting Date/Time:</span>
                      <span className="text-gray-700 font-medium">
                        {new Date(printSlip.reportingTime).toLocaleDateString()} {new Date(printSlip.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Right Column (Dispatch Context) */}
                  <div className="space-y-1.5">
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[8px] block">Allocated Driver:</span>
                      <span className="font-semibold text-gray-800">{printSlip.driver?.name} ({printSlip.driver?.mobile})</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[8px] block">Allocated Vehicle:</span>
                      <span className="font-semibold text-gray-800">{printSlip.vehicle?.vehicleNumber} ({printSlip.vehicle?.model})</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[8px] block">Booking Ref:</span>
                      <span className="font-mono text-gray-700 font-bold">{printSlip.booking?.bookingNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Route logs card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <span className="font-bold text-gray-500 uppercase tracking-wider text-[8px] block mb-2">Trip Routes:</span>
                  <div className="space-y-1.5 text-[11px]">
                    <div><span className="font-bold text-emerald-600">Pickup:</span> {printSlip.booking?.pickupLocation}</div>
                    <div><span className="font-bold text-red-500">Dropoff:</span> {printSlip.booking?.dropLocation}</div>
                  </div>
                </div>

                {/* Odometer metrics grid */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                  <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider text-[8px] py-2 px-3 text-center">
                    <div>Start Odometer</div>
                    <div>End Odometer</div>
                    <div>Total Run Distance</div>
                  </div>
                  <div className="grid grid-cols-3 py-3 font-bold text-sm text-center text-gray-800 font-mono">
                    <div>{printSlip.startKm} KM</div>
                    <div>{printSlip.endKm !== null ? `${printSlip.endKm} KM` : '--- KM'}</div>
                    <div className="text-blue-600">
                      {printSlip.endKm !== null ? `${Number(printSlip.endKm) - Number(printSlip.startKm)} KM` : '--- KM'}
                    </div>
                  </div>
                </div>

                {/* Toll breakdown grid */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
                  <div className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider text-[8px] py-2 px-3">
                    Expense Breakdown
                  </div>
                  <div className="divide-y divide-gray-100 text-xs px-3">
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-gray-600">Tolls / Taxes:</span>
                      <span className="font-mono font-bold text-gray-800">₹{Number(printSlip.toll).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-gray-600">Parking Fees:</span>
                      <span className="font-mono font-bold text-gray-800">₹{Number(printSlip.parking).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-gray-600">Night Surcharge:</span>
                      <span className="font-mono font-bold text-gray-800">₹{Number(printSlip.nightCharges).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-gray-600">Driver Allowance:</span>
                      <span className="font-mono font-bold text-gray-800">₹{Number(printSlip.driverAllowance).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-gray-600">Extra / Misc Charges:</span>
                      <span className="font-mono font-bold text-gray-800">₹{Number(printSlip.extraCharges).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-sm font-bold bg-blue-50/50 -mx-3 px-3">
                      <span className="text-blue-800">Total Incidental Costs:</span>
                      <span className="text-blue-800 font-mono">
                        ₹{(
                          Number(printSlip.toll) +
                          Number(printSlip.parking) +
                          Number(printSlip.driverAllowance) +
                          Number(printSlip.nightCharges) +
                          Number(printSlip.extraCharges)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signature panels */}
                <div className="grid grid-cols-3 gap-6 pt-8 text-center text-[9px] font-bold text-gray-400">
                  <div className="border-t border-dashed border-gray-300 pt-3">
                    DRIVER SIGNATURE
                  </div>
                  <div className="border-t border-dashed border-gray-300 pt-3">
                    CUSTOMER SIGNATURE
                  </div>
                  <div className="border-t border-dashed border-gray-300 pt-3 text-blue-600">
                    DISPATCH AUTHORIZED
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
