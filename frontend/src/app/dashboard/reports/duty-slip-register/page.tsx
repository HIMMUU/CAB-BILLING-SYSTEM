'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface DutySlipRegisterRow {
  sn: number;
  id: string;
  date: string;
  slipNo: string;
  clientName: string;
  guestName: string;
  driverName: string;
  vehicleNo: string;
  startKm: number | string;
  endKm: number | string;
  runKm: number | string;
  status: string;
}

export default function DutySlipRegisterPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Filter State
  const [customerId, setCustomerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guestName, setGuestName] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Expanded Filters State
  const [dutySlipFrom, setDutySlipFrom] = useState('');
  const [dutySlipTo, setDutySlipTo] = useState('');
  const [vehicleOwnership, setVehicleOwnership] = useState('B'); // B = Both, O = Own, H = Hired
  const [billingStatus, setBillingStatus] = useState('A'); // A = All, BI = Billed, UB = UnBilled
  const [dutyType, setDutyType] = useState('');
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');

  // Dropdown data options
  const [customers, setCustomers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Results list
  const [results, setResults] = useState<DutySlipRegisterRow[]>([]);
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
      const [custRes, driverRes, vehicleRes] = await Promise.all([
        api.request('/customers?limit=500'),
        api.request('/drivers?limit=500'),
        api.request('/vehicles?limit=500'),
      ]);

      setCustomers(custRes.data || []);
      setDrivers(driverRes.data || []);
      setVehicles(vehicleRes.data || []);
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
    if (customerId) params.append('customerId', customerId);
    if (driverId) params.append('driverId', driverId);
    if (vehicleId) params.append('vehicleId', vehicleId);
    if (status) params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (guestName) params.append('guestName', guestName);
    if (employeeId) params.append('employeeId', employeeId);

    // Expanded filters
    if (dutySlipFrom) params.append('dutySlipFrom', dutySlipFrom);
    if (dutySlipTo) params.append('dutySlipTo', dutySlipTo);
    if (vehicleOwnership) params.append('vehicleOwnership', vehicleOwnership);
    if (billingStatus) params.append('billingStatus', billingStatus);
    if (dutyType) params.append('dutyType', dutyType);
    if (stateName) params.append('state', stateName);
    if (cityName) params.append('city', cityName);

    return params.toString();
  };

  const handleViewInGrid = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = buildQueryString();
      const res = await api.request(`/reports/duty-slip-register?${q}`, { bypassCache: true });
      setResults(res || []);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch duty slip register data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintExport = () => {
    const q = buildQueryString();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const token = api.getToken();
    
    setLoading(true);
    fetch(`${baseUrl}/reports/duty-slip-register/pdf?${q}`, {
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
        a.download = `duty-slip-register-${Date.now()}.pdf`;
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
    fetch(`${baseUrl}/reports/duty-slip-register/pdf?${q}`, {
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
    setCustomerId('');
    setDriverId('');
    setVehicleId('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setGuestName('');
    setEmployeeId('');
    setDutySlipFrom('');
    setDutySlipTo('');
    setVehicleOwnership('B');
    setBillingStatus('A');
    setDutyType('');
    setStateName('');
    setCityName('');
    setResults([]);
    setSearched(false);
    setError(null);
  };

  if (!user) return null;

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
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Duty Register</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Generate operational audit registers filtered by driver, car/vehicle, client, and trip dates.</p>
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
          Duty Register Filter Controls
        </h3>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 text-xs">
          {/* Row 1 */}
          {/* Date From */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Date From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Date To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Duty Slip From */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Duty Slip From</label>
            <input
              type="text"
              placeholder="e.g. 1001"
              value={dutySlipFrom}
              onChange={(e) => setDutySlipFrom(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* TO */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">TO</label>
            <input
              type="text"
              placeholder="e.g. 1050"
              value={dutySlipTo}
              onChange={(e) => setDutySlipTo(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Row 2 */}
          {/* Vehicle Ownership */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Vehicle Ownership</label>
            <select
              value={vehicleOwnership}
              onChange={(e) => setVehicleOwnership(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            >
              <option value="B">Both (B)</option>
              <option value="O">Own (O)</option>
              <option value="H">Hired (H)</option>
            </select>
          </div>

          {/* Status: Billed / Unbilled */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Billing Status</label>
            <select
              value={billingStatus}
              onChange={(e) => setBillingStatus(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition font-bold"
            >
              <option value="A">All (A)</option>
              <option value="BI">Billed (BI)</option>
              <option value="UB">UnBilled (UB)</option>
            </select>
          </div>

          {/* Duty Type */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Duty Type</label>
            <select
              value={dutyType}
              onChange={(e) => setDutyType(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">--Select--</option>
              <option value="LOCAL">LOCAL</option>
              <option value="AIRPORT_TRANSFER">AIRPORT TRANSFER</option>
              <option value="OUTSTATION">OUTSTATION</option>
              <option value="HOURLY_RENTAL">HOURLY RENTAL</option>
            </select>
          </div>

          {/* Duty Slip Operational Status */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Duty Slip Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">-All-</option>
              <option value="DRAFT">DRAFT</option>
              <option value="FILLED">FILLED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Row 3 */}
          {/* Driver's Name */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Driver's Name</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">-Select-</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.mobile})
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle No */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Vehicle No</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">-Select-</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} - {v.model}
                </option>
              ))}
            </select>
          </div>

          {/* Client Name */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Client / Company Name</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">-Select-</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName ? `(${c.companyName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Row 4 */}
          {/* State */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">State</label>
            <input
              type="text"
              placeholder="e.g. Delhi"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">City</label>
            <input
              type="text"
              placeholder="e.g. New Delhi"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Guest Name */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Guest Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#64748B] uppercase tracking-wide">Employee ID</label>
            <input
              type="text"
              placeholder="e.g. EMP-101"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
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
            View
          </button>

          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
          >
            Cancel
          </button>

          <button
            onClick={handlePrintExport}
            disabled={loading}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-sm transition"
          >
            Print Export
          </button>
        </div>
      </div>

      {/* Grid Results Section */}
      {searched && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm space-y-4">
          <div className="p-4 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Duty Slip Result Grid
            </h3>
            <span className="text-xs bg-blue-50 text-blue-600 font-bold px-2.5 py-1 rounded-md border border-blue-200">
              Matched: {results.length} slips
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[#64748B] font-bold select-none uppercase tracking-wider">
                  <th className="py-2.5 px-4 text-center">S.N</th>
                  <th className="py-2.5 px-4">Duty Date</th>
                  <th className="py-2.5 px-4">Slip No</th>
                  <th className="py-2.5 px-4">Client Name</th>
                  <th className="py-2.5 px-4">Guest Name</th>
                  <th className="py-2.5 px-4">Driver Name</th>
                  <th className="py-2.5 px-4">Vehicle No</th>
                  <th className="py-2.5 px-4 text-right">Start KM</th>
                  <th className="py-2.5 px-4 text-right">End KM</th>
                  <th className="py-2.5 px-4 text-right">Run KM</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-[#0F172A] font-medium">
                {results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3 px-4 text-center text-[#64748B] font-bold">{row.sn}</td>
                    <td className="py-3 px-4">{row.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{row.slipNo}</td>
                    <td className="py-3 px-4 max-w-[140px] truncate" title={row.clientName}>{row.clientName}</td>
                    <td className="py-3 px-4 max-w-[100px] truncate" title={row.guestName}>{row.guestName}</td>
                    <td className="py-3 px-4 font-bold text-slate-700">{row.driverName}</td>
                    <td className="py-3 px-4 font-mono bg-slate-50/20 border border-slate-100 rounded text-slate-800 text-[10px] text-center font-bold">{row.vehicleNo}</td>
                    <td className="py-3 px-4 text-right">{row.startKm}</td>
                    <td className="py-3 px-4 text-right">{row.endKm}</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">{row.runKm}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                        row.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        row.status === 'FILLED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 font-semibold">
                      No matching duty slips found. Try adjusting filter criteria.
                    </td>
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
