'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface BillRegisterRow {
  sn: number;
  id: string;
  billDate: string;
  billNo: string;
  clientName: string;
  guestName: string;
  basicAmt: number;
  ptTaxes: number;
  igst: number;
  cgst: number;
  sgst: number;
  total: number;
}

export default function BillRegisterPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Filter State
  const [gstOption, setGstOption] = useState<'SERVICES_TAX' | 'GST' | 'BOTH'>('GST');
  const [customerId, setCustomerId] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [guestName, setGuestName] = useState('');
  const [fileCode, setFileCode] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [billDateFrom, setBillDateFrom] = useState('');
  const [billDateTo, setBillDateTo] = useState('');
  const [monthOf, setMonthOf] = useState('');
  const [dutyDateFrom, setDutyDateFrom] = useState('');
  const [dutyDateTo, setDutyDateTo] = useState('');
  const [billCoverNo, setBillCoverNo] = useState('');

  // Dropdown data options
  const [customers, setCustomers] = useState<any[]>([]);
  const [guestOptions, setGuestOptions] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);

  // Results list
  const [results, setResults] = useState<BillRegisterRow[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const loadDropdownOptions = async () => {
    try {
      // Fetch customers
      const custRes = await api.request('/customers?limit=500');
      setCustomers(custRes.data || []);

      // Fetch bookings to compile unique guest names and employee IDs
      const bookingsRes = await api.request('/bookings?limit=500');
      const bookings = bookingsRes.data || [];

      const guests = Array.from(new Set(bookings.map((b: any) => b.guestName).filter(Boolean))) as string[];
      const employees = Array.from(new Set(bookings.map((b: any) => b.employeeId).filter(Boolean))) as string[];

      setGuestOptions(guests.sort());
      setEmployeeOptions(employees.sort());
    } catch (err: any) {
      console.warn('Failed to load dropdown filters:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      loadDropdownOptions();
    }
  }, [user]);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append('gstOption', gstOption);
    if (customerId) params.append('customerId', customerId);
    if (state) params.append('state', state);
    if (city) params.append('city', city);
    if (guestName) params.append('guestName', guestName);
    if (employeeId) params.append('employeeId', employeeId);
    if (billDateFrom) params.append('billDateFrom', billDateFrom);
    if (billDateTo) params.append('billDateTo', billDateTo);
    if (monthOf) params.append('monthOf', monthOf);
    if (dutyDateFrom) params.append('dutyDateFrom', dutyDateFrom);
    if (dutyDateTo) params.append('dutyDateTo', dutyDateTo);
    if (billCoverNo) params.append('billCoverNo', billCoverNo);
    return params.toString();
  };

  const handleViewInGrid = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = buildQueryString();
      const res = await api.request(`/reports/bill-register?${q}`, { bypassCache: true });
      setResults(res || []);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch register data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintExport = () => {
    const q = buildQueryString();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const token = api.getToken();
    
    setLoading(true);
    fetch(`${baseUrl}/reports/bill-register/pdf?${q}`, {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('PDF download failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bill-register-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleViewInReport = () => {
    const q = buildQueryString();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const token = api.getToken();

    setLoading(true);
    fetch(`${baseUrl}/reports/bill-register/pdf?${q}`, {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('PDF rendering failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleCancel = () => {
    setGstOption('GST');
    setCustomerId('');
    setState('');
    setCity('');
    setGuestName('');
    setFileCode('');
    setEmployeeId('');
    setBillDateFrom('');
    setBillDateTo('');
    setMonthOf('');
    setDutyDateFrom('');
    setDutyDateTo('');
    setBillCoverNo('');
    setResults([]);
    setSearched(false);
    setError(null);
  };

  if (!user) return null;

  // Aggregate values for grid totals row
  const totalBasic = results.reduce((sum, r) => sum + r.basicAmt, 0);
  const totalPtTaxes = results.reduce((sum, r) => sum + r.ptTaxes, 0);
  const totalIgst = results.reduce((sum, r) => sum + r.igst, 0);
  const totalCgst = results.reduce((sum, r) => sum + r.cgst, 0);
  const totalSgst = results.reduce((sum, r) => sum + r.sgst, 0);
  const totalGrand = results.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/reports')}
          className="p-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg shadow-sm transition"
          title="Back to Reports Dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Tax Register & Bill Cover Reports</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Generate compliant bill registers and filter invoice records for corporate ledger reporting.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Control Panel Mockup */}
      <div className="bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-2">
          Bill Cover Filters
        </h3>

        {/* GST / Services Tax Radios */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide">
            Service Tax & GST Type
          </label>
          <div className="flex items-center gap-6 text-sm font-medium text-[#0F172A]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="gstOption"
                checked={gstOption === 'SERVICES_TAX'}
                onChange={() => setGstOption('SERVICES_TAX')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Services Tax</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="gstOption"
                checked={gstOption === 'GST'}
                onChange={() => setGstOption('GST')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>GST</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="gstOption"
                checked={gstOption === 'BOTH'}
                onChange={() => setGstOption('BOTH')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>BOTH</span>
            </label>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-xs">
          {/* Client Name */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Client Name</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">-Select Client-</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* State */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">State</label>
            <input
              type="text"
              placeholder="-Type State-"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">City</label>
            <input
              type="text"
              placeholder="-Type City-"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Guest Name */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Guest Name</label>
            <select
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">-Select Guest-</option>
              {guestOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* File Code */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">File Code</label>
            <input
              type="text"
              placeholder="e.g. F-CODE"
              value={fileCode}
              onChange={(e) => setFileCode(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Employee ID</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">-Select Employee ID-</option>
              {employeeOptions.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>

          {/* Bill Date From */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Bill Date From</label>
            <input
              type="date"
              value={billDateFrom}
              onChange={(e) => setBillDateFrom(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Bill Date To */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Bill Date To (Date To)</label>
            <input
              type="date"
              value={billDateTo}
              onChange={(e) => setBillDateTo(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Month Of */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Month Of</label>
            <input
              type="month"
              value={monthOf}
              onChange={(e) => setMonthOf(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Duty Date From */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Duty Date From</label>
            <input
              type="date"
              value={dutyDateFrom}
              onChange={(e) => setDutyDateFrom(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Duty Date To */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Duty Date To (Date To)</label>
            <input
              type="date"
              value={dutyDateTo}
              onChange={(e) => setDutyDateTo(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Bill Cover No */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Bill Cover No (Search Bill No)</label>
            <input
              type="text"
              placeholder="e.g. 121"
              value={billCoverNo}
              onChange={(e) => setBillCoverNo(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#E2E8F0]">
          <button
            onClick={handleViewInGrid}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition flex items-center gap-2"
          >
            {loading ? 'Processing...' : 'View In Grid'}
          </button>
          
          <button
            onClick={handleViewInReport}
            disabled={loading}
            className="px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg shadow-sm transition"
          >
            View In Report
          </button>

          <button
            onClick={handlePrintExport}
            disabled={loading}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-sm transition"
          >
            Print Export
          </button>

          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Grid Results Section */}
      {searched && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm space-y-4">
          <div className="p-4 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Bill Register Result Grid
            </h3>
            <span className="text-xs bg-blue-50 text-blue-600 font-bold px-2.5 py-1 rounded-md border border-blue-200">
              Matched: {results.length} bills
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[#64748B] font-bold select-none uppercase tracking-wider">
                  <th className="py-2.5 px-4 text-center">S.N</th>
                  <th className="py-2.5 px-4">Bill Date</th>
                  <th className="py-2.5 px-4">Bill No</th>
                  <th className="py-2.5 px-4">Client Name</th>
                  <th className="py-2.5 px-4">Guest Name</th>
                  <th className="py-2.5 px-4 text-right">Basic Amt</th>
                  <th className="py-2.5 px-4 text-right">P/T/Taxes</th>
                  <th className="py-2.5 px-4 text-right">IGST</th>
                  <th className="py-2.5 px-4 text-right">CGST</th>
                  <th className="py-2.5 px-4 text-right">SGST</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-[#0F172A] font-medium">
                {results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3 px-4 text-center text-[#64748B] font-bold">{row.sn}</td>
                    <td className="py-3 px-4">{row.billDate}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{row.billNo}</td>
                    <td className="py-3 px-4 max-w-[150px] truncate" title={row.clientName}>{row.clientName}</td>
                    <td className="py-3 px-4 max-w-[120px] truncate" title={row.guestName}>{row.guestName}</td>
                    <td className="py-3 px-4 text-right">INR {row.basicAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">INR {row.ptTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{row.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-50/20">INR {row.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 font-semibold">
                      No matching invoices found. Try adjusting filter criteria.
                    </td>
                  </tr>
                )}
                {results.length > 0 && (
                  <tr className="bg-slate-100/50 font-bold border-t border-slate-300">
                    <td colSpan={5} className="py-3 px-4 text-right">TOTAL</td>
                    <td className="py-3 px-4 text-right">INR {totalBasic.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">INR {totalPtTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">INR {totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">INR {totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">INR {totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right text-blue-600">INR {totalGrand.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
