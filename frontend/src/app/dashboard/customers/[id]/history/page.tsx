'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

interface Customer {
  id: string;
  name: string;
  type: string;
  phone: string;
  email: string | null;
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
  status: string;
  trip?: {
    totalAmount: string | number;
  } | null;
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

export default function CustomerHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [customerData, historyData] = await Promise.all([
          api.request(`/customers/${customerId}`),
          api.request(`/customers/${customerId}/history`),
        ]);
        setCustomer(customerData);
        setBookings(historyData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-gray-400">
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl max-w-md text-center mb-6">
          {error || 'Customer not found.'}
        </div>
        <button
          onClick={() => router.push('/dashboard/customers')}
          className="px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#0F172A] rounded-lg text-sm font-semibold transition shadow-sm"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  const totalBookings = bookings.length;
  const completedTrips = bookings.filter((b) => b.status === 'COMPLETED');
  const activeTrips = bookings.filter((b) => b.status === 'STARTED');
  
  const totalSpend = completedTrips.reduce((acc, b) => {
    const amount = Number(b.trip?.totalAmount) || 0;
    return acc + amount;
  }, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back button & Title */}
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/customers')}
          className="p-2 -ml-2 text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Customer History Ledger</h1>
          <p className="text-sm text-[#64748B] mt-1">Audit log of all assignments, slips, and payments</p>
        </div>
      </div>

      {/* Info Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-[#0F172A]">{customer.name}</h2>
            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
              customer.type === 'CORPORATE'
                ? 'text-purple-700 bg-purple-50 border border-purple-200'
                : 'text-cyan-700 bg-cyan-50 border border-cyan-200'
            }`}>
              {customer.type}
            </span>
          </div>
          <p className="text-sm text-[#64748B]">
            {customer.companyName ? `${customer.companyName} • ` : ''}
            {customer.phone} • {customer.email || 'No email'}
          </p>
        </div>

        {/* Quick Metrics */}
        <div className="flex gap-4">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 rounded-lg min-w-[120px]">
            <span className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Total Bookings</span>
            <span className="text-lg font-bold text-[#0F172A] font-mono mt-0.5 block">{totalBookings}</span>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 rounded-lg min-w-[120px]">
            <span className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Active Trips</span>
            <span className="text-lg font-bold text-blue-600 font-mono mt-0.5 block">{activeTrips.length}</span>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 rounded-lg min-w-[120px]">
            <span className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Total Spend</span>
            <span className="text-lg font-bold text-emerald-600 font-mono mt-0.5 block">₹{totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h3 className="text-sm font-semibold text-[#0F172A]">Booking History Logs</h3>
        </div>

        {bookings.length === 0 ? (
          <div className="p-12 text-center text-[#64748B]">
            No previous bookings recorded for this client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-3 px-6">Booking ID</th>
                  <th className="py-3 px-6">Date & Time</th>
                  <th className="py-3 px-6">Route</th>
                  <th className="py-3 px-6">Trip Type</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Fare Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-[#0F172A]">{booking.bookingNumber}</td>
                    <td className="py-4 px-6 text-[#0F172A]">
                      {new Date(booking.pickupDate).toLocaleDateString('en-GB')} at {formatTimeTo24h(booking.pickupTime)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-[#0F172A] truncate max-w-xs" title={booking.pickupLocation}>
                        From: {booking.pickupLocation}
                      </div>
                      <div className="text-xs text-[#64748B] truncate max-w-xs" title={booking.dropLocation}>
                        To: {booking.dropLocation}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded">
                        {booking.tripType}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        booking.status === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                        booking.status === 'STARTED' ? 'text-blue-700 bg-blue-50 border border-blue-200' :
                        booking.status === 'PENDING' ? 'text-amber-700 bg-amber-50 border border-amber-200' :
                        'text-red-700 bg-red-50 border border-red-200'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-[#0F172A]">
                      {booking.trip?.totalAmount 
                        ? `₹${Number(booking.trip.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : 'Pending Closure'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
