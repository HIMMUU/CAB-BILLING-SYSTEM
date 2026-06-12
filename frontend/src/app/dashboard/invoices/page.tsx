'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Customer {
  id: string;
  name: string;
  companyName: string | null;
  gstNumber: string | null;
  email: string | null;
  phone: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  amount: string;
  trip?: {
    id: string;
    totalKm: string;
    startKm: string;
    endKm: string;
    dutySlip: {
      dutySlipNumber: string;
      driver: { name: string };
      vehicle: { vehicleNumber: string; model: string };
    };
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'VOID';
  baseFare: string;
  extraKmCharges: string;
  toll: string;
  parking: string;
  nightCharges: string;
  miscCharges: string;
  subtotal: string;
  cgstRate: string;
  cgstAmount: string;
  sgstRate: string;
  sgstAmount: string;
  igstRate: string;
  igstAmount: string;
  totalTax: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  customer: Customer;
  items: InvoiceItem[];
}

interface ClosedTrip {
  id: string;
  totalAmount: string;
  baseFareCharged: string;
  extraKmCharged: string;
  toll: string;
  parking: string;
  driverAllowance: string;
  extraCharges: string;
  extraHoursCharged: string;
  nightChargesCharged: string;
  miscChargesCharged: string;
  totalKm: string;
  closedAt: string;
  booking: {
    bookingNumber: string;
    pickupLocation: string;
    dropLocation: string;
    customer: Customer;
  };
  dutySlip: {
    dutySlipNumber: string;
    startKm: string;
    endKm: string;
  };
}

export default function InvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [uninvoicedTrips, setUninvoicedTrips] = useState<ClosedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Drawer Toggles
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Form State: Generate Invoice
  const [genTripId, setGenTripId] = useState('');
  const [genGstType, setGenGstType] = useState<'INTRASTATE' | 'INTERSTATE'>('INTRASTATE');
  const [genGstRate, setGenGstRate] = useState<number>(5);
  const [genInvoiceDate, setGenInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [genDueDate, setGenDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Form State: Record Payment
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<'BANK_TRANSFER' | 'UPI' | 'CASH' | 'CHEQUE'>('UPI');
  const [payReference, setPayReference] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = `/invoices?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;

      const res = await api.request(url);
      setInvoices(res.data);
      setTotalPages(res.meta.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchUninvoicedTrips = async () => {
    try {
      const res = await api.request('/invoices/uninvoiced-trips');
      setUninvoicedTrips(res);
      if (res.length > 0 && !genTripId) {
        setGenTripId(res[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load eligible trips', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user, page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  // Check role authorization for write ops
  const isDispatcher = user?.role === 'DISPATCHER';

  // Calculations Preview for Selected Trip
  const selectedTrip = uninvoicedTrips.find((t) => t.id === genTripId);
  const previewCalculation = () => {
    if (!selectedTrip) return null;

    const baseFare = Number(selectedTrip.baseFareCharged);
    const extraKm = Number(selectedTrip.extraKmCharged);
    const toll = Number(selectedTrip.toll);
    const parking = Number(selectedTrip.parking);
    const night = Number(selectedTrip.nightChargesCharged);
    const misc =
      Number(selectedTrip.extraHoursCharged) +
      Number(selectedTrip.driverAllowance) +
      Number(selectedTrip.miscChargesCharged);

    const subtotal = baseFare + extraKm + toll + parking + night + misc;
    
    let cgst = 0, sgst = 0, igst = 0;
    if (genGstType === 'INTRASTATE') {
      cgst = (subtotal * (genGstRate / 2)) / 100;
      sgst = (subtotal * (genGstRate / 2)) / 100;
    } else {
      igst = (subtotal * genGstRate) / 100;
    }

    const totalTax = cgst + sgst + igst;
    const totalAmount = subtotal + totalTax;

    return {
      subtotal,
      cgst,
      sgst,
      igst,
      totalTax,
      totalAmount,
    };
  };

  const calcPreview = previewCalculation();

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispatcher) return;
    if (!genTripId) {
      setGenError('Please select a closed trip');
      return;
    }

    setGenSubmitting(true);
    setGenError(null);

    try {
      await api.request('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          tripId: genTripId,
          gstType: genGstType,
          gstRate: Number(genGstRate),
          invoiceDate: new Date(genInvoiceDate).toISOString(),
          dueDate: new Date(genDueDate).toISOString(),
        }),
      });

      setIsGenerateOpen(false);
      setGenTripId('');
      setPage(1);
      fetchInvoices();
    } catch (err: any) {
      setGenError(err.message || 'Failed to generate invoice');
    } finally {
      setGenSubmitting(false);
    }
  };

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/invoices/${invoiceId}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${api.getToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error downloading invoice PDF');
    }
  };

  const handleOpenGenerate = () => {
    setGenError(null);
    fetchUninvoicedTrips();
    setIsGenerateOpen(true);
  };

  const handleOpenInvoiceDetails = async (invoice: Invoice) => {
    try {
      const refreshedInvoice = await api.request(`/invoices/${invoice.id}`);
      setSelectedInvoice(refreshedInvoice);
    } catch (err) {
      setSelectedInvoice(invoice);
    }
  };

  const handleOpenRecordPayment = () => {
    if (isDispatcher || !selectedInvoice) return;
    setPayAmount(Number(selectedInvoice.dueAmount).toFixed(2));
    setPayError(null);
    setPayReference('');
    setIsPaymentOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispatcher || !selectedInvoice) return;

    const amountNum = Number(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPayError('Please enter a valid payment amount');
      return;
    }

    setPaySubmitting(true);
    setPayError(null);

    try {
      await api.request('/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: amountNum,
          paymentMode: payMode,
          transactionReference: payReference || undefined,
          paymentDate: new Date(payDate).toISOString(),
        }),
      });

      setIsPaymentOpen(false);
      // Refresh current invoice details & list
      const updatedInvoice = await api.request(`/invoices/${selectedInvoice.id}`);
      setSelectedInvoice(updatedInvoice);
      fetchInvoices();
    } catch (err: any) {
      setPayError(err.message || 'Failed to record payment');
    } finally {
      setPaySubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARTIALLY_PAID':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'UNPAID':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'VOID':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Invoice Billing Center</h1>
          <p className="text-sm text-[#64748B] mt-1">Generate dynamic tax invoices, track payment status, and export PDF sheets.</p>
        </div>
        
        {!isDispatcher && (
          <button
            onClick={handleOpenGenerate}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-10 px-4 rounded-lg transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Generate Invoice
          </button>
        )}
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        {/* Filters Header */}
        <div className="p-4 border-b border-[#E2E8F0] bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex gap-2">
            <input
              type="text"
              placeholder="Search by code or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 w-full placeholder-gray-400"
            />
            <button
              type="submit"
              className="bg-white hover:bg-gray-50 border border-[#E2E8F0] text-sm text-[#0F172A] px-4 rounded-lg font-semibold transition"
            >
              Search
            </button>
          </form>

          {/* Status filters */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID', 'DRAFT'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold capitalize whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100'
                }`}
              >
                {status.replace('_', ' ').toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-[#64748B] flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Fetching invoices database...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 text-sm font-semibold">{error}</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-[#64748B] text-sm">No invoices found matching current filters.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] bg-gray-50 uppercase select-none">
                  <th className="py-3.5 px-6">Invoice Number</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Invoice Date</th>
                  <th className="py-3.5 px-6">Due Date</th>
                  <th className="py-3.5 px-6">Total Amount</th>
                  <th className="py-3.5 px-6">Due Balance</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm text-[#0F172A]">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => handleOpenInvoiceDetails(invoice)}
                    className="hover:bg-gray-50/75 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6 font-mono font-semibold text-blue-600">{invoice.invoiceNumber}</td>
                    <td className="py-4 px-6">
                      <div className="font-semibold">{invoice.customer.name}</div>
                      <div className="text-xs text-[#64748B]">{invoice.customer.companyName || 'Individual'}</div>
                    </td>
                    <td className="py-4 px-6 text-[#64748B]">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-[#64748B]">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="py-4 px-6 font-semibold">INR {Number(invoice.totalAmount).toFixed(2)}</td>
                    <td className="py-4 px-6">
                      <span className={`font-semibold ${Number(invoice.dueAmount) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        INR {Number(invoice.dueAmount).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block text-[10px] font-bold border px-2.5 py-0.5 rounded-full tracking-wide uppercase ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                          className="h-8 px-2.5 border border-[#E2E8F0] hover:bg-gray-50 text-xs text-[#475569] font-semibold rounded-lg transition"
                          title="Download PDF"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-[#E2E8F0] text-xs font-semibold rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="text-xs text-[#64748B]">Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border border-[#E2E8F0] text-xs font-semibold rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Slide-over Drawer: Generate Invoice */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-fade-in">
          <div className="w-full max-w-lg bg-white h-screen overflow-y-auto flex flex-col p-6 shadow-2xl animate-slide-left">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Generate New Invoice</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Select a completed trip to calculate rates & print bill.</p>
              </div>
              <button
                onClick={() => setIsGenerateOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {genError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg mb-4 font-medium">
                {genError}
              </div>
            )}

            <form onSubmit={handleGenerateInvoice} className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Select Trip */}
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1.5">Uninvoiced Completed Trips</label>
                  {uninvoicedTrips.length === 0 ? (
                    <div className="p-4 border border-dashed border-[#E2E8F0] text-center text-[#64748B] text-xs rounded-lg bg-gray-50">
                      No uninvoiced closed trips available. Complete active trips first.
                    </div>
                  ) : (
                    <select
                      value={genTripId}
                      onChange={(e) => setGenTripId(e.target.value)}
                      className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                    >
                      {uninvoicedTrips.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.booking.customer.name} - DS #{t.dutySlip.dutySlipNumber} (INR {Number(t.totalAmount).toFixed(0)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedTrip && (
                  <div className="bg-gray-50 border border-[#E2E8F0] rounded-lg p-3 space-y-2 text-xs">
                    <div className="font-semibold text-[#0F172A]">Trip Route & Operational Info</div>
                    <div className="grid grid-cols-2 gap-2 text-[#64748B]">
                      <div>Pickup: <span className="text-[#0F172A]">{selectedTrip.booking.pickupLocation}</span></div>
                      <div>Drop: <span className="text-[#0F172A]">{selectedTrip.booking.dropLocation}</span></div>
                      <div>Completed Date: <span className="text-[#0F172A]">{new Date(selectedTrip.closedAt).toLocaleDateString()}</span></div>
                      <div>Distance Run: <span className="text-[#0F172A]">{selectedTrip.totalKm} KM</span></div>
                    </div>
                  </div>
                )}

                {/* GST Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1.5">GST Mode</label>
                    <select
                      value={genGstType}
                      onChange={(e) => setGenGstType(e.target.value as any)}
                      className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none"
                    >
                      <option value="INTRASTATE">Intrastate (CGST+SGST)</option>
                      <option value="INTERSTATE">Interstate (IGST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1.5">Tax Rate (%)</label>
                    <select
                      value={genGstRate}
                      onChange={(e) => setGenGstRate(Number(e.target.value))}
                      className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none"
                    >
                      <option value={5}>5% (Cab Logistics)</option>
                      <option value={12}>12% (Standard Fleet)</option>
                      <option value={18}>18% (Luxury Operations)</option>
                      <option value={0}>0% (Tax Exempt)</option>
                    </select>
                  </div>
                </div>

                {/* Invoice Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1.5">Invoice Date</label>
                    <input
                      type="date"
                      value={genInvoiceDate}
                      onChange={(e) => setGenInvoiceDate(e.target.value)}
                      className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1.5">Due Date</label>
                    <input
                      type="date"
                      value={genDueDate}
                      onChange={(e) => setGenDueDate(e.target.value)}
                      className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Calculations Preview */}
                {selectedTrip && calcPreview && (
                  <div className="border border-[#E2E8F0] rounded-xl p-4 bg-blue-50/30 space-y-2.5">
                    <div className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider">Taxes & Amount Breakdown</div>
                    <div className="text-xs space-y-1.5 divide-y divide-[#E2E8F0]/50 text-[#475569]">
                      <div className="flex justify-between pt-1">
                        <span>Trip Subtotal (Fare + Toll + incidentals):</span>
                        <span className="font-semibold text-[#0F172A]">INR {calcPreview.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {genGstType === 'INTRASTATE' ? (
                        <>
                          <div className="flex justify-between pt-1.5">
                            <span>CGST ({genGstRate / 2}%):</span>
                            <span className="font-semibold text-[#0F172A]">INR {calcPreview.cgst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1.5">
                            <span>SGST ({genGstRate / 2}%):</span>
                            <span className="font-semibold text-[#0F172A]">INR {calcPreview.sgst.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between pt-1.5">
                          <span>IGST ({genGstRate}%):</span>
                          <span className="font-semibold text-[#0F172A]">INR {calcPreview.igst.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-1.5">
                        <span>Total Tax Amount:</span>
                        <span className="font-semibold text-[#0F172A]">INR {calcPreview.totalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 text-sm font-bold text-blue-700">
                        <span>Grand Total Payable:</span>
                        <span>INR {calcPreview.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-[#E2E8F0] pt-4 mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
                  className="flex-1 bg-white hover:bg-gray-50 border border-[#E2E8F0] text-sm text-[#0F172A] font-semibold h-10 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={genSubmitting || !genTripId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-10 rounded-lg disabled:opacity-50 transition"
                >
                  {genSubmitting ? 'Generating...' : 'Confirm & Finalize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Dialog Drawer */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40 animate-fade-in">
          <div className="w-full max-w-xl bg-white h-screen overflow-y-auto flex flex-col p-6 shadow-2xl animate-slide-left">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4 mb-4">
              <div>
                <div className="inline-flex items-center gap-2">
                  <h2 className="text-xl font-bold font-mono text-[#0F172A]">{selectedInvoice.invoiceNumber}</h2>
                  <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full tracking-wide uppercase ${getStatusBadgeClass(selectedInvoice.status)}`}>
                    {selectedInvoice.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">Details and financial adjustments for invoice ID: {selectedInvoice.id}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-3 bg-gray-50 border border-[#E2E8F0] rounded-xl flex items-center gap-3 mb-6">
              <button
                onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                className="flex-1 inline-flex items-center justify-center bg-white hover:bg-gray-50 border border-[#E2E8F0] text-xs text-[#0F172A] font-semibold h-9 px-3 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download PDF
              </button>
              
              {!isDispatcher && Number(selectedInvoice.dueAmount) > 0 && (
                <button
                  onClick={handleOpenRecordPayment}
                  className="flex-1 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-3 rounded-lg transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.546 1.16 3.743.258 3.743-1.684V10.15c0-1.942-2.197-2.844-3.743-1.684L9 9.125m3.75 2.25h-3.75m1.5-6.75v10.5" />
                  </svg>
                  Record Payment
                </button>
              )}
            </div>

            {/* Bill To & Metadata */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Customer & Billing Info</h3>
                <div className="text-sm font-semibold text-[#0F172A]">{selectedInvoice.customer.name}</div>
                {selectedInvoice.customer.companyName && (
                  <div className="text-xs text-[#475569] mt-0.5">{selectedInvoice.customer.companyName}</div>
                )}
                <div className="text-xs text-[#64748B] mt-1">Phone: {selectedInvoice.customer.phone}</div>
                <div className="text-xs text-[#64748B]">Email: {selectedInvoice.customer.email || 'N/A'}</div>
                {selectedInvoice.customer.gstNumber && (
                  <div className="text-xs font-bold text-[#0F172A] mt-1.5">GSTIN: {selectedInvoice.customer.gstNumber}</div>
                )}
              </div>
              
              <div className="space-y-1.5 text-xs text-[#475569]">
                <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Invoice Dates</h3>
                <div className="flex justify-between">
                  <span>Invoice Date:</span>
                  <span className="font-semibold text-[#0F172A]">{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span className="font-semibold text-[#0F172A]">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Mode:</span>
                  <span className="font-semibold text-[#0F172A]">
                    {Number(selectedInvoice.cgstRate) > 0 ? 'Intrastate' : 'Interstate'}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Trip Service Grid */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Itemized Transportation Services</h3>
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-[#475569] flex justify-between border-b border-[#E2E8F0]">
                  <span>Item Description</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-[#E2E8F0] bg-white">
                  {selectedInvoice.items.map((item) => (
                    <div key={item.id} className="p-4 text-xs space-y-2">
                      <div className="font-semibold text-[#0F172A] flex justify-between">
                        <span>{item.description}</span>
                        <span>INR {Number(item.amount).toFixed(2)}</span>
                      </div>
                      {item.trip && (
                        <div className="grid grid-cols-2 gap-1.5 text-[#64748B] pt-1 border-t border-gray-100">
                          <div>Duty Slip: <span className="font-semibold text-[#0F172A]">{item.trip.dutySlip.dutySlipNumber}</span></div>
                          <div>Vehicle: <span className="font-semibold text-[#0F172A]">{item.trip.dutySlip.vehicle.vehicleNumber}</span></div>
                          <div>Driver: <span className="font-semibold text-[#0F172A]">{item.trip.dutySlip.driver.name}</span></div>
                          <div>Distance: <span className="font-semibold text-[#0F172A]">{item.trip.totalKm} KM ({item.trip.startKm}-{item.trip.endKm})</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="border border-[#E2E8F0] rounded-xl p-4 bg-gray-50/50 mb-6 text-xs space-y-2">
              <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1">Financial Calculation Breakdown</div>
              <div className="flex justify-between">
                <span>Base Fare Charged:</span>
                <span className="font-semibold text-[#0F172A]">INR {Number(selectedInvoice.baseFare).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Extra KM Charges:</span>
                <span className="font-semibold text-[#0F172A]">INR {Number(selectedInvoice.extraKmCharges).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Toll & Parking Fares:</span>
                <span className="font-semibold text-[#0F172A]">INR {(Number(selectedInvoice.toll) + Number(selectedInvoice.parking)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Night Surcharges & Allowances:</span>
                <span className="font-semibold text-[#0F172A]">INR {(Number(selectedInvoice.nightCharges) + Number(selectedInvoice.miscCharges)).toFixed(2)}</span>
              </div>
              <div className="h-[1px] bg-gray-200 my-1" />
              <div className="flex justify-between font-semibold text-[#0F172A]">
                <span>Subtotal (Net Taxable Value):</span>
                <span>INR {Number(selectedInvoice.subtotal).toFixed(2)}</span>
              </div>
              
              {Number(selectedInvoice.cgstAmount) > 0 ? (
                <>
                  <div className="flex justify-between text-[#64748B]">
                    <span>CGST ({Number(selectedInvoice.cgstRate)}%):</span>
                    <span>INR {Number(selectedInvoice.cgstAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>SGST ({Number(selectedInvoice.sgstRate)}%):</span>
                    <span>INR {Number(selectedInvoice.sgstAmount).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[#64748B]">
                  <span>IGST ({Number(selectedInvoice.igstRate)}%):</span>
                  <span>INR {Number(selectedInvoice.igstAmount).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-[#64748B]">
                <span>Total Taxes:</span>
                <span>INR {Number(selectedInvoice.totalTax).toFixed(2)}</span>
              </div>
              
              <div className="h-[1px] bg-gray-200 my-1" />
              <div className="flex justify-between font-bold text-[#0F172A] text-sm pt-1">
                <span>Grand Total Value:</span>
                <span>INR {Number(selectedInvoice.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>Payments Logged:</span>
                <span>- INR {Number(selectedInvoice.paidAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-red-600 border-t border-dashed border-red-200 pt-1.5">
                <span>Balance Due:</span>
                <span>INR {Number(selectedInvoice.dueAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Sub-Dialog Modal */}
      {isPaymentOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="bg-[#0F172A] p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold">Record Invoice Payment</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Logging cash, UPI, or bank logs for {selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setIsPaymentOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {payError && (
              <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                {payError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1">Receipt Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={Number(selectedInvoice.dueAmount)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-semibold"
                />
                <span className="text-[10px] text-[#64748B] mt-0.5 block">Max payable remaining: INR {Number(selectedInvoice.dueAmount).toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1">Payment Mode</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as any)}
                    className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none"
                  >
                    <option value="UPI">UPI Interface</option>
                    <option value="BANK_TRANSFER">Bank Wire</option>
                    <option value="CASH">Cash / Physical</option>
                    <option value="CHEQUE">Corporate Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full border border-[#E2E8F0] rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1">Transaction Ref / Cheque No.</label>
                <input
                  type="text"
                  placeholder="e.g. UTR1234567890"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="border-t border-[#E2E8F0] pt-4 mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="flex-1 bg-white hover:bg-gray-50 border border-[#E2E8F0] text-sm text-[#0F172A] font-semibold h-10 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold h-10 rounded-lg disabled:opacity-50 transition"
                >
                  {paySubmitting ? 'Logging...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
