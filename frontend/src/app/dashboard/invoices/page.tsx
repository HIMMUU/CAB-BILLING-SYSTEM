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
  status?: string;
  clientType?: string;
  cgstRate?: string | number;
  sgstRate?: string | number;
  igstRate?: string | number;
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
  startDateTime?: string;
  endDateTime?: string;
  stateTaxCharged?: string;
  mcdCharged?: string;
  booking: {
    bookingNumber: string;
    pickupLocation: string;
    dropLocation: string;
    customer: Customer;
    pickupDate: string;
    tripType: string;
    vehicleTypeRequired: string;
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
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
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
  const [genSelectedTripIds, setGenSelectedTripIds] = useState<string[]>([]);
  const [genCustomerFilter, setGenCustomerFilter] = useState<string>('');
  const [genGstType, setGenGstType] = useState<'INTRASTATE' | 'INTERSTATE'>('INTRASTATE');
  const [genGstRate, setGenGstRate] = useState<number>(5);
  const [genInvoiceDate, setGenInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [genDueDate, setGenDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genStep, setGenStep] = useState<number>(1);
  const [genCustomerCategory, setGenCustomerCategory] = useState<string>('');
  const [genIsRcm, setGenIsRcm] = useState<boolean>(false);
  const [companyGst, setCompanyGst] = useState<string>('');

  // PDF Preview State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

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
      setGenSelectedTripIds([]);
      setGenCustomerFilter('');
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
  
  // Get active customers
  const activeCustomers = allCustomers.filter(
    (c) => c.status === 'ACTIVE' || (c as any).status === 'ACTIVE'
  );

  // Filter active customers by category
  const categoryFilteredCustomers = activeCustomers.filter((c) => {
    const type = (c.clientType || '').toUpperCase().replace(/_/g, ' ');
    if (genCustomerCategory === 'Company') {
      return type === 'COMPANY';
    }
    if (genCustomerCategory === 'Travel Company') {
      return type === 'TRAVEL COMPANY';
    }
    if (genCustomerCategory === 'Individual') {
      return type === 'INDIVIDUAL' || type === 'INDIVIDUAL CUSTOMER';
    }
    return false;
  });

  // Filter trips by selected customer (only show if customer selected)
  const filteredTrips = genCustomerFilter
    ? uninvoicedTrips.filter((t) => t.booking.customer.id === genCustomerFilter)
    : [];

  // Multi-trip selection helpers
  const toggleTripSelection = (tripId: string) => {
    setGenSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    );
  };

  const selectAllFilteredTrips = () => {
    setGenSelectedTripIds(filteredTrips.map((t) => t.id));
  };

  const clearTripSelection = () => setGenSelectedTripIds([]);

  // Calculations Preview for all selected trips
  const selectedTrips = uninvoicedTrips.filter((t) => genSelectedTripIds.includes(t.id));
  const previewCalculation = () => {
    if (selectedTrips.length === 0) return null;

    let subtotal = 0;
    let toll = 0;
    let parking = 0;
    let mcd = 0;
    for (const trip of selectedTrips) {
      subtotal +=
        Number(trip.baseFareCharged || 0) +
        Number(trip.extraKmCharged || 0) +
        Number(trip.toll || 0) +
        Number(trip.parking || 0) +
        Number(trip.stateTaxCharged || 0) +
        Number(trip.mcdCharged || 0) +
        Number(trip.nightChargesCharged || 0) +
        Number(trip.extraHoursCharged || 0) +
        Number(trip.driverAllowance || 0) +
        Number(trip.miscChargesCharged || 0);

      toll += Number(trip.toll || 0);
      parking += Number(trip.parking || 0);
      mcd += Number(trip.mcdCharged || 0);
    }
    
    // Check if selected customer has predefined rates
    const customer = selectedTrips[0]?.booking.customer;
    
    // Auto-determine State Code Match
    const custGst = customer?.gstNumber ? customer.gstNumber.trim() : '';
    const compGst = companyGst ? companyGst.trim() : '';
    
    const custStateCode = custGst.match(/^\d{2}/) ? custGst.substring(0, 2) : '07';
    const compStateCode = compGst.match(/^\d{2}/) ? compGst.substring(0, 2) : '07';
    const isSameState = custStateCode === compStateCode;

    const gstTaxableAmount = Math.max(0, subtotal - (toll + parking + mcd));

    let cgst = 0, sgst = 0, igst = 0;
    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    
    const custCgst = Number((customer as any)?.cgstRate || 0);
    const custSgst = Number((customer as any)?.sgstRate || 0);
    const custIgst = Number((customer as any)?.igstRate || 0);
    const hasCustGst = custCgst > 0 || custSgst > 0 || custIgst > 0;

    if (hasCustGst) {
      if (isSameState) {
        cgstRate = custCgst;
        sgstRate = custSgst;
      } else {
        igstRate = custIgst || (custCgst + custSgst);
      }
    } else {
      if (isSameState) {
        cgstRate = genGstRate / 2;
        sgstRate = genGstRate / 2;
      } else {
        igstRate = genGstRate;
      }
    }

    cgst = (gstTaxableAmount * cgstRate) / 100;
    sgst = (gstTaxableAmount * sgstRate) / 100;
    igst = (gstTaxableAmount * igstRate) / 100;

    const totalTax = cgst + sgst + igst;
    const totalAmount = genIsRcm ? subtotal : (subtotal + totalTax);

    return { subtotal, cgst, sgst, igst, totalTax, totalAmount, cgstRate, sgstRate, igstRate };
  };

  const calcPreview = previewCalculation();

  // Custom customer select handler
  const handleCustomerSelect = (customerId: string) => {
    setGenCustomerFilter(customerId);
    setGenSelectedTripIds([]); // Reset selection on customer change

    // Automatically set GST Type, Rate, and RCM if defined on the customer
    const selectedCust = allCustomers.find(c => c.id === customerId);
    if (selectedCust) {
      const cgst = Number((selectedCust as any).cgstRate || 0);
      const sgst = Number((selectedCust as any).sgstRate || 0);
      const igst = Number((selectedCust as any).igstRate || 0);

      // Rule: Compare Customer GST first 2 digits vs Company GST first 2 digits
      const custGst = selectedCust.gstNumber ? selectedCust.gstNumber.trim() : '';
      const compGst = companyGst ? companyGst.trim() : '';
      
      const custStateCode = custGst.match(/^\d{2}/) ? custGst.substring(0, 2) : '07';
      const compStateCode = compGst.match(/^\d{2}/) ? compGst.substring(0, 2) : '07';
      const isSameState = custStateCode === compStateCode;

      if (isSameState) {
        setGenGstType('INTRASTATE');
        setGenGstRate(cgst + sgst || 5);
      } else {
        setGenGstType('INTERSTATE');
        setGenGstRate(igst || 5);
      }

      setGenIsRcm(!!(selectedCust as any).isRcm);
    }
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispatcher) return;
    if (genSelectedTripIds.length === 0) {
      setGenError('Please select at least one closed trip');
      return;
    }

    setGenSubmitting(true);
    setGenError(null);

    try {
      await api.request('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          tripIds: genSelectedTripIds,
          gstType: genGstType,
          gstRate: Number(genGstRate),
          invoiceDate: new Date(genInvoiceDate).toISOString(),
          dueDate: new Date(genDueDate).toISOString(),
          isRcm: genIsRcm,
        }),
      });

      setIsGenerateOpen(false);
      setGenSelectedTripIds([]);
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

  const handlePreviewPdf = async (invoiceId: string, invoiceNumber: string) => {
    setPreviewLoading(true);
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
      setPreviewPdfUrl(url);
      setPreviewTitle(`Invoice: ${invoiceNumber}`);
    } catch (err: any) {
      alert(err.message || 'Error generating PDF preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenGenerate = async () => {
    setGenError(null);
    setGenSelectedTripIds([]);
    setGenCustomerFilter('');
    setGenStep(1);
    setGenCustomerCategory('');
    setGenIsRcm(false);
    
    try {
      const [tripsRes, customersRes, tenantRes] = await Promise.all([
        api.request('/invoices/uninvoiced-trips'),
        api.request('/customers?limit=100'),
        api.request('/tenant-settings'),
      ]);
      setUninvoicedTrips(tripsRes);
      setAllCustomers(customersRes.data || []);
      setCompanyGst(tenantRes?.companyGst || '');
      setIsGenerateOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load eligible uninvoiced trips');
    }
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
                    <td className="py-4 px-6 text-[#64748B]">{new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</td>
                    <td className="py-4 px-6 text-[#64748B]">{new Date(invoice.dueDate).toLocaleDateString('en-GB')}</td>
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
                          onClick={() => handlePreviewPdf(invoice.id, invoice.invoiceNumber)}
                          className="h-8 px-2.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-xs text-blue-600 font-semibold rounded-lg transition inline-flex items-center gap-1"
                          title="Preview PDF"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                          className="h-8 w-8 inline-flex items-center justify-center border border-[#E2E8F0] hover:bg-gray-50 text-slate-400 hover:text-slate-600 rounded-lg transition"
                          title="Download PDF"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
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
          <div className="w-full max-w-5xl bg-white h-screen overflow-y-auto flex flex-col shadow-2xl animate-slide-left">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-6">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Generate New Invoice</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Select a customer and consolidate their pending duty slips into a single invoice.</p>
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

            {/* Stepper progress indicator */}
            <div className="flex items-center justify-between px-16 py-4 border-b border-gray-100 bg-[#FAFBFD] select-none">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  genStep === 1 
                    ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-50' 
                    : genStep > 1 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {genStep > 1 ? '✓' : '1'}
                </span>
                <span className={`text-xs font-bold transition-colors ${genStep === 1 ? 'text-[#0F172A]' : 'text-gray-500'}`}>Customer Selection</span>
              </div>
              <div className="flex-1 h-[2px] mx-4 bg-gray-200">
                <div className={`h-full transition-all duration-300 ${genStep > 1 ? 'bg-emerald-500 w-full' : 'bg-gray-200 w-0'}`} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  genStep === 2 
                    ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-50' 
                    : genStep > 2 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {genStep > 2 ? '✓' : '2'}
                </span>
                <span className={`text-xs font-bold transition-colors ${genStep === 2 ? 'text-[#0F172A]' : 'text-gray-500'}`}>Duty Slips</span>
              </div>
              <div className="flex-1 h-[2px] mx-4 bg-gray-200">
                <div className={`h-full transition-all duration-300 ${genStep > 2 ? 'bg-emerald-500 w-full' : 'bg-gray-200 w-0'}`} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  genStep === 3 
                    ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-50' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  3
                </span>
                <span className={`text-xs font-bold transition-colors ${genStep === 3 ? 'text-[#0F172A]' : 'text-gray-500'}`}>Invoice Preview</span>
              </div>
            </div>

            {/* Stepper Content Form */}
            <form onSubmit={handleGenerateInvoice} className="flex-1 flex flex-col justify-between p-6 overflow-y-auto space-y-6">
              <div className="flex-1">
                {genError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg mb-4 font-medium">
                    {genError}
                  </div>
                )}

                {/* Step 1: Customer Selection */}
                {genStep === 1 && (
                  <div className="space-y-6">
                    {/* Category selection card boxes */}
                    <div className="space-y-2.5">
                      <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide">Step 1a: Select Customer Category</label>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { id: 'Company', title: 'Corporate Client', desc: 'Registered Business / Companies' },
                          { id: 'Travel Company', title: 'Travel Partner', desc: 'Travel Operators & Agencies' },
                          { id: 'Individual', title: 'Individual Client', desc: 'Individual Customers / Walk-ins' }
                        ].map((cat) => (
                          <div
                            key={cat.id}
                            onClick={() => {
                              setGenCustomerCategory(cat.id);
                              setGenCustomerFilter(''); // Reset selected customer on category change
                              setGenSelectedTripIds([]);
                            }}
                            className={`border p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                              genCustomerCategory === cat.id
                                ? 'border-blue-600 bg-blue-50/20 shadow-sm ring-2 ring-blue-50'
                                : 'border-[#E2E8F0] bg-white hover:border-blue-300'
                            }`}
                          >
                            <div className="font-bold text-sm text-[#0F172A]">{cat.title}</div>
                            <div className="text-[11px] text-[#64748B] mt-1">{cat.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer Selection Dropdown */}
                    {genCustomerCategory && (
                      <div className="space-y-2 animate-fade-in">
                        <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide">Step 1b: Select Active Customer</label>
                        <select
                          value={genCustomerFilter}
                          onChange={(e) => handleCustomerSelect(e.target.value)}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                        >
                          <option value="">— Select Customer —</option>
                          {categoryFilteredCustomers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.companyName ? `(${c.companyName})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Duty Slip Selector Table */}
                {genStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">
                          Step 2: Select Pending Duty Slips to Include
                        </label>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          Only completed/closed duty slips belonging to the selected customer are listed.
                        </p>
                      </div>
                      {filteredTrips.length > 0 && (
                        <div className="flex gap-3 text-[11px]">
                          <button type="button" onClick={selectAllFilteredTrips} className="font-bold text-blue-600 hover:underline">
                            Select All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button type="button" onClick={clearTripSelection} className="font-bold text-red-500 hover:underline">
                            Clear Selection
                          </button>
                        </div>
                      )}
                    </div>

                    {filteredTrips.length === 0 ? (
                      <div className="p-12 border border-dashed border-[#E2E8F0] text-center text-[#64748B] text-xs rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span>No completed uninvoiced duty slips found for this customer.</span>
                      </div>
                    ) : (
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm max-h-[450px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E2E8F0] bg-gray-50 text-[#64748B] font-bold uppercase text-[9px] select-none sticky top-0 z-10">
                              <th className="py-2.5 px-3 w-10">✓</th>
                              <th className="py-2.5 px-3">Duty Slip No</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Guest Name</th>
                              <th className="py-2.5 px-3">Vehicle</th>
                              <th className="py-2.5 px-3">Duty Type</th>
                              <th className="py-2.5 px-3">Start Date</th>
                              <th className="py-2.5 px-3">End Date</th>
                              <th className="py-2.5 px-3">Total KM</th>
                              <th className="py-2.5 px-3 text-right">Amount</th>
                              <th className="py-2.5 px-3 text-center">Invoice Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#0F172A]">
                            {filteredTrips.map((t) => {
                              const checked = genSelectedTripIds.includes(t.id);
                              return (
                                <tr 
                                  key={t.id} 
                                  onClick={() => toggleTripSelection(t.id)}
                                  className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${checked ? 'bg-blue-50/20' : ''}`}
                                >
                                  <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleTripSelection(t.id)}
                                      className="w-4 h-4 rounded border-[#E2E8F0] text-blue-600 accent-blue-600 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-blue-600">
                                    {t.dutySlip.dutySlipNumber}
                                  </td>
                                  <td className="py-3 px-3 text-[#64748B]">
                                    {new Date(t.booking.pickupDate).toLocaleDateString('en-GB')}
                                  </td>
                                  <td className="py-3 px-3 font-semibold">
                                    {t.booking.customer.name}
                                  </td>
                                  <td className="py-3 px-3">
                                    {t.booking.vehicleTypeRequired}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-gray-500">
                                    {t.booking.tripType}
                                  </td>
                                  <td className="py-3 px-3 text-[#64748B]">
                                    {t.startDateTime ? new Date(t.startDateTime).toLocaleDateString('en-GB') : 'N/A'}
                                  </td>
                                  <td className="py-3 px-3 text-[#64748B]">
                                    {t.endDateTime ? new Date(t.endDateTime).toLocaleDateString('en-GB') : 'N/A'}
                                  </td>
                                  <td className="py-3 px-3 font-mono font-semibold">
                                    {t.totalKm} KM
                                  </td>
                                  <td className="py-3 px-3 font-bold text-[#0F172A] text-right">
                                    ₹{Number(t.totalAmount).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200/50 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                      Pending
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Configurations and Legacy Receipt Preview */}
                {genStep === 3 && calcPreview && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: GST & Dates Configuration */}
                      <div className="space-y-4 bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
                        <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide border-b pb-2">Invoice Configuration</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">GST Mode</label>
                            <select
                              value={genGstType}
                              onChange={(e) => setGenGstType(e.target.value as any)}
                              className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none"
                            >
                              <option value="INTRASTATE">Intrastate (CGST+SGST)</option>
                              <option value="INTERSTATE">Interstate (IGST)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">Tax Rate (%)</label>
                            <select
                              value={genGstRate}
                              onChange={(e) => setGenGstRate(Number(e.target.value))}
                              className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none"
                            >
                              <option value={5}>5% (Cab Logistics)</option>
                              <option value={12}>12% (Standard Fleet)</option>
                              <option value={18}>18% (Luxury Operations)</option>
                              <option value={0}>0% (Tax Exempt)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">Invoice Date</label>
                            <input
                              type="date"
                              value={genInvoiceDate}
                              onChange={(e) => setGenInvoiceDate(e.target.value)}
                              className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">Due Date</label>
                            <input
                              type="date"
                              value={genDueDate}
                              onChange={(e) => setGenDueDate(e.target.value)}
                              className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                          <input
                            type="checkbox"
                            id="genIsRcm"
                            checked={genIsRcm}
                            onChange={(e) => setGenIsRcm(e.target.checked)}
                            className="w-4 h-4 rounded border-[#E2E8F0] text-blue-600 accent-blue-600 cursor-pointer"
                          />
                          <label htmlFor="genIsRcm" className="text-xs font-bold text-[#475569] uppercase cursor-pointer select-none">
                            Reverse Charge Mechanism (RCM)
                          </label>
                        </div>
                      </div>

                      {/* Right: Consolidated Receipt Preview */}
                      <div className="bg-[#FAFBFD] border border-dashed border-[#E2E8F0] rounded-xl p-5 font-mono text-xs space-y-3 shadow-inner">
                        <div className="border-b border-[#E2E8F0] pb-2 flex justify-between items-center">
                          <div>
                            <span className="block font-bold text-xs text-[#0F172A]">CONSOLIDATED RECEIPTS</span>
                            <span className="text-[9px] text-[#64748B]">Customer: {selectedTrips[0]?.booking.customer.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-600">
                            {selectedTrips.length} Duty Slips Selected
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {selectedTrips.map((t) => (
                            <div key={t.id} className="flex justify-between text-[#475569] text-[11px]">
                              <span>{t.dutySlip.dutySlipNumber}</span>
                              <span>₹{Number(t.totalAmount).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-dashed border-[#E2E8F0] pt-2 space-y-1.5 text-[11px]">
                          <div className="flex justify-between font-bold text-[#0F172A]">
                            <span>Sub Total</span>
                            <span>₹{calcPreview.subtotal.toLocaleString()}</span>
                          </div>
                          {calcPreview.cgstRate > 0 && (
                            <div className="flex justify-between text-[#64748B]">
                              <span>CGST ({calcPreview.cgstRate}%)</span>
                              <span>₹{calcPreview.cgst.toLocaleString()}</span>
                            </div>
                          )}
                          {calcPreview.sgstRate > 0 && (
                            <div className="flex justify-between text-[#64748B]">
                              <span>SGST ({calcPreview.sgstRate}%)</span>
                              <span>₹{calcPreview.sgst.toLocaleString()}</span>
                            </div>
                          )}
                          {calcPreview.igstRate > 0 && (
                            <div className="flex justify-between text-[#64748B]">
                              <span>IGST ({calcPreview.igstRate}%)</span>
                              <span>₹{calcPreview.igst.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-[#0F172A] pt-2 flex justify-between font-extrabold text-xs text-blue-700">
                          <span>Grand Total</span>
                          <span>₹{calcPreview.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>

                    </div>

                    {/* Detailed Duty Slip Section Itemization Preview (matching Legacy Invoice format) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Duty Slip Line Item Detail</h4>
                        <span className="text-[10px] text-gray-500 font-medium">Verify individual fare itemizations below</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-1">
                        {selectedTrips.map((t) => (
                          <div key={t.id} className="border border-[#E2E8F0] rounded-xl p-4 bg-white shadow-sm space-y-3">
                            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border">
                              <span className="font-mono font-bold text-blue-600">{t.dutySlip.dutySlipNumber}</span>
                              <span className="text-xs text-[#64748B]">{new Date(t.booking.pickupDate).toLocaleDateString('en-GB')}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="block text-[10px] text-[#64748B] uppercase">Vehicle</span>
                                <span className="font-semibold text-[#0F172A]">{t.booking.vehicleTypeRequired}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-[#64748B] uppercase">Guest Name</span>
                                <span className="font-semibold text-[#0F172A]">{t.booking.customer.name}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-[#64748B] uppercase">Duty Description</span>
                                <span className="font-semibold text-[#0F172A]">{t.booking.tripType} Duty</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-[#64748B] uppercase">Duty Date</span>
                                <span className="font-semibold text-[#0F172A]">{t.startDateTime ? new Date(t.startDateTime).toLocaleDateString('en-GB') : 'N/A'}</span>
                              </div>
                            </div>

                            <div className="border-t pt-2 grid grid-cols-3 md:grid-cols-6 gap-2 text-[11px] text-[#475569]">
                              <div>
                                <span className="block text-[9px] text-[#64748B] uppercase">Base Fare</span>
                                <span className="font-semibold">₹{Number(t.baseFareCharged).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-[#64748B] uppercase">Extra KM Charges</span>
                                <span className="font-semibold">₹{Number(t.extraKmCharged).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-[#64748B] uppercase">Extra Hour Charges</span>
                                <span className="font-semibold">₹{Number(t.extraHoursCharged).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-[#64748B] uppercase">Driver Allowance</span>
                                <span className="font-semibold">₹{Number(t.driverAllowance).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-[#64748B] uppercase">Night Charges</span>
                                <span className="font-semibold">₹{Number(t.nightChargesCharged).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-[#64748B] uppercase">Parking/Toll</span>
                                <span className="font-semibold">₹{(Number(t.parking) + Number(t.toll) + Number(t.stateTaxCharged || 0) + Number(t.mcdCharged || 0)).toLocaleString()}</span>
                              </div>
                            </div>

                            <div className="border-t pt-2 flex justify-between items-center text-xs font-bold">
                              <span className="text-gray-500 uppercase tracking-wide">Duty Slip Total</span>
                              <span className="text-[#0f172a] text-sm">₹{Number(t.totalAmount).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Navigation Footer */}
              <div className="border-t border-[#E2E8F0] pt-4 mt-auto flex gap-3">
                {genStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => setIsGenerateOpen(false)}
                    className="flex-1 bg-white hover:bg-gray-50 border border-[#E2E8F0] text-xs font-semibold h-10 rounded-lg transition"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setGenStep((s) => s - 1)}
                    className="flex-1 bg-white hover:bg-gray-50 border border-[#E2E8F0] text-xs font-semibold h-10 rounded-lg transition"
                  >
                    Back
                  </button>
                )}

                {genStep < 3 ? (
                  <button
                    type="button"
                    disabled={
                      (genStep === 1 && !genCustomerFilter) ||
                      (genStep === 2 && genSelectedTripIds.length === 0)
                    }
                    onClick={() => setGenStep((s) => s + 1)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-10 rounded-lg disabled:opacity-50 transition flex items-center justify-center"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={genSubmitting || genSelectedTripIds.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-10 rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {genSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating Invoice...</span>
                      </>
                    ) : (
                      <span>Generate Invoice PDF</span>
                    )}
                  </button>
                )}
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
                onClick={() => handlePreviewPdf(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                className="flex-1 inline-flex items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs text-blue-600 font-semibold h-9 px-3 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                Preview PDF
              </button>
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
                  <span className="font-semibold text-[#0F172A]">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span className="font-semibold text-[#0F172A]">{new Date(selectedInvoice.dueDate).toLocaleDateString('en-GB')}</span>
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
      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] border border-slate-100">
            {/* Modal Header */}
            <div className="bg-[#0F172A] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2H9z" />
                  <path fillRule="evenodd" d="M5 5a3 3 0 00-3 3v8a3 3 0 003 3h8a3 3 0 003-3V8a3 3 0 00-3-3H5zm4 4a1 1 0 11-2 0 1 1 0 012 0zm-1 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-sm tracking-wide">{previewTitle}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = previewPdfUrl;
                    a.download = `${previewTitle.replace(/: /g, '-')}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    window.URL.revokeObjectURL(previewPdfUrl);
                    setPreviewPdfUrl(null);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Iframe preview */}
            <div className="flex-1 bg-slate-100 p-2">
              <iframe src={`${previewPdfUrl}#toolbar=0`} className="w-full h-full rounded-lg border border-slate-200" title="PDF Preview" />
            </div>
          </div>
        </div>
      )}

      {/* PDF Loading Overlay */}
      {previewLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl flex items-center gap-3 border border-slate-100">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Generating PDF Preview...</span>
          </div>
        </div>
      )}
    </main>
  );
}
