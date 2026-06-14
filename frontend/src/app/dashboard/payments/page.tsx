'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Customer {
  name: string;
  companyName: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  dueAmount: string;
  customer: Customer;
}

interface Payment {
  id: string;
  amount: string;
  paymentDate: string;
  paymentMode: 'BANK_TRANSFER' | 'UPI' | 'CASH' | 'CHEQUE';
  transactionReference: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  invoice: Invoice;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Payments log state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Global Record payment popup Outstanding Invoices list
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form State: Record Payment
  const [formInvoiceId, setFormInvoiceId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMode, setFormMode] = useState<'BANK_TRANSFER' | 'UPI' | 'CASH' | 'CHEQUE'>('UPI');
  const [formReference, setFormReference] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let url = `/payments?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;

      const res = await api.request(url);
      setPayments(res.data);
      setTotalPages(res.meta.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment ledger');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingInvoices = async () => {
    try {
      // Fetch invoices which have outstanding dues
      const res = await api.request('/invoices?limit=100');
      // Filter unpaid or partially paid
      const outstanding = res.data.filter((inv: any) => Number(inv.dueAmount) > 0);
      setOutstandingInvoices(outstanding);
      if (outstanding.length > 0) {
        setFormInvoiceId(outstanding[0].id);
        setFormAmount(Number(outstanding[0].dueAmount).toFixed(2));
      }
    } catch (err) {
      console.error('Failed to load outstanding invoices', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user, page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleInvoiceChange = (invoiceId: string) => {
    setFormInvoiceId(invoiceId);
    const selected = outstandingInvoices.find((i) => i.id === invoiceId);
    if (selected) {
      setFormAmount(Number(selected.dueAmount).toFixed(2));
    }
  };

  const handleOpenRecord = () => {
    if (user?.role === 'DISPATCHER') return;
    setFormError(null);
    setFormReference('');
    fetchOutstandingInvoices();
    setIsRecordOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role === 'DISPATCHER') return;
    if (!formInvoiceId) {
      setFormError('Please select an outstanding invoice');
      return;
    }

    const amountNum = Number(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid receipt amount');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      await api.request('/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: formInvoiceId,
          amount: amountNum,
          paymentMode: formMode,
          transactionReference: formReference || undefined,
          paymentDate: new Date(formDate).toISOString(),
        }),
      });

      setIsRecordOpen(false);
      setPage(1);
      fetchPayments();
    } catch (err: any) {
      setFormError(err.message || 'Failed to log payment transaction');
    } finally {
      setFormSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatModeLabel = (mode: string) => {
    switch (mode) {
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'UPI':
        return 'UPI Interface';
      case 'CASH':
        return 'Physical Cash';
      case 'CHEQUE':
        return 'Cheque Wire';
      default:
        return mode;
    }
  };

  const isDispatcher = user?.role === 'DISPATCHER';

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Payment Ledger</h1>
          <p className="text-sm text-[#64748B] mt-1">Audit log of customer receipts, bank references, and transactional status.</p>
        </div>

        {!isDispatcher && (
          <button
            onClick={handleOpenRecord}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-10 px-4 rounded-lg transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Record Payment Receipt
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        {/* Filters Header */}
        <div className="p-4 border-b border-[#E2E8F0] bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex gap-2">
            <input
              type="text"
              placeholder="Search by invoice number or ref..."
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

          {/* Status quick filters */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'SUCCESS', 'PENDING', 'FAILED'].map((status) => (
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

        {/* Payments Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-[#64748B] flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Fetching ledger transactions...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 text-sm font-semibold">{error}</div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-[#64748B] text-sm">No payment records logged in this filter context.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] bg-gray-50 uppercase select-none">
                  <th className="py-3.5 px-6">Transaction ID</th>
                  <th className="py-3.5 px-6">Invoice Number</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Payment Date</th>
                  <th className="py-3.5 px-6">Payment Mode</th>
                  <th className="py-3.5 px-6">Reference Reference</th>
                  <th className="py-3.5 px-6">Receipt Amount</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm text-[#0F172A]">
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-6 font-mono text-xs text-[#64748B] truncate max-w-[120px]" title={payment.id}>
                      {payment.id}
                    </td>
                    <td className="py-4 px-6 font-mono font-semibold text-blue-600">
                      {payment.invoice?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-[#0F172A]">{payment.invoice?.customer?.name || 'N/A'}</div>
                      <div className="text-xs text-[#64748B]">{payment.invoice?.customer?.companyName || 'Individual'}</div>
                    </td>
                    <td className="py-4 px-6 text-[#64748B]">
                      {new Date(payment.paymentDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-4 px-6 font-medium text-[#475569]">
                      {formatModeLabel(payment.paymentMode)}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-[#475569]">
                      {payment.transactionReference || '---'}
                    </td>
                    <td className="py-4 px-6 font-bold text-emerald-600">
                      + INR {Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block text-[10px] font-bold border px-2.5 py-0.5 rounded-full tracking-wide uppercase ${getStatusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
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

      {/* Record Payment Sub-Dialog Modal */}
      {isRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="bg-[#0F172A] p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold">Record Customer Receipt</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Record offline payment and credit outstanding balances.</p>
              </div>
              <button
                onClick={() => setIsRecordOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="p-4 space-y-4">
              {/* Select Outstanding Invoice */}
              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1">Select Outstanding Invoice</label>
                {outstandingInvoices.length === 0 ? (
                  <div className="p-4 border border-dashed border-[#E2E8F0] text-center text-[#64748B] text-xs rounded-lg bg-gray-50">
                    No outstanding invoices found. All invoices are fully paid.
                  </div>
                ) : (
                  <select
                    value={formInvoiceId}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                  >
                    {outstandingInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customer.name} (Due: INR {Number(inv.dueAmount).toFixed(0)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1">Payment Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1">Payment Mode</label>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value as any)}
                    className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none"
                  >
                    <option value="UPI">UPI Interface</option>
                    <option value="BANK_TRANSFER">Bank Wire</option>
                    <option value="CASH">Cash / Physical</option>
                    <option value="CHEQUE">Cheque Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1">Receipt Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full border border-[#E2E8F0] rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wide mb-1">Transaction Ref / Reference No.</label>
                <input
                  type="text"
                  placeholder="UTR Reference or deposit details..."
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="border-t border-[#E2E8F0] pt-4 mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordOpen(false)}
                  className="flex-1 bg-white hover:bg-gray-50 border border-[#E2E8F0] text-sm text-[#0F172A] font-semibold h-10 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !formInvoiceId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-10 rounded-lg disabled:opacity-50 transition"
                >
                  {formSubmitting ? 'Logging...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
