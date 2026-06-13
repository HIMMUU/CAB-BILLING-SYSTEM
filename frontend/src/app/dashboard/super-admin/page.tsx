'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  subscriptionPlan: string | null;
  status: string;
  createdAt: string;
}

interface Metrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  mrr: number;
  totalUsers: number;
  totalBookings: number;
  totalInvoices: number;
}

export default function SuperAdminPage() {
  const [user, setUser] = useState<any>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Track status updates locally to show loading states
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = api.getUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } else {
      setUser(currentUser);
      loadPlatformData();
    }
  }, []);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, metricsRes] = await Promise.all([
        api.request('/super-admin/tenants'),
        api.request('/super-admin/metrics'),
      ]);
      setTenants(tenantsRes);
      setMetrics(metricsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch platform administration details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUpdatingId(tenantId);
    try {
      await api.request(`/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      // Refetch
      await loadPlatformData();
    } catch (err: any) {
      alert(err.message || 'Failed to update tenant status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleChangePlan = async (tenantId: string, newPlan: string) => {
    setUpdatingId(tenantId);
    try {
      await api.request(`/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ subscriptionPlan: newPlan }),
      });
      // Refetch
      await loadPlatformData();
    } catch (err: any) {
      alert(err.message || 'Failed to change subscription plan');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!user) return null;

  const filteredTenants = tenants.filter((tenant) => {
    const term = search.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(term) ||
      (tenant.slug && tenant.slug.toLowerCase().includes(term)) ||
      (tenant.companyEmail && tenant.companyEmail.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Super Admin Operations</h1>
          <p className="text-sm text-[#64748B] mt-1">Global management of multi-tenant instances, subscription tiers, and platform health.</p>
        </div>
        <button
          onClick={loadPlatformData}
          disabled={loading}
          className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Console'}
        </button>
      </div>

      {loading && !metrics ? (
        <div className="p-16 text-center text-[#64748B] flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-semibold text-sm">Loading global operations metrics...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 text-sm font-semibold border border-red-200 rounded-xl bg-red-50/20">{error}</div>
      ) : (
        <div className="space-y-8">
          
          {/* Metrics Dashboard */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* MRR */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.546 1.16 3.743.258 3.743-1.684V10.15c0-1.942-2.197-2.844-3.743-1.684L9 9.125m3.75 2.25h-3.75m1.5-6.75v10.5" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Estimated MRR</span>
                  <span className="text-xl font-extrabold text-[#0F172A] mt-0.5 block">
                    INR {metrics.mrr.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Total Tenants */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Total Tenants</span>
                  <span className="text-xl font-extrabold text-[#0F172A] mt-0.5 block">
                    {metrics.totalTenants} / 100 max
                  </span>
                </div>
              </div>

              {/* Active / Suspended Ratio */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Active vs Suspended</span>
                  <span className="text-xl font-extrabold text-[#0F172A] mt-0.5 block text-xs">
                    <span className="text-emerald-600">{metrics.activeTenants} Active</span>
                    <span className="text-gray-300 mx-1.5">|</span>
                    <span className="text-rose-600">{metrics.suspendedTenants} Suspended</span>
                  </span>
                </div>
              </div>

              {/* Platform Bookings / Invoices */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Platform Records</span>
                  <span className="text-sm font-bold text-[#0F172A] mt-0.5 block">
                    {metrics.totalBookings} Bookings / {metrics.totalInvoices} Invoices
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* Tenants Section */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            {/* Table Header & Search */}
            <div className="p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">Registered Client Companies</h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">Edit subscriptions, suspend/activate access, and view tenant metadata.</p>
              </div>
              <div className="w-full md:w-72">
                <input
                  type="text"
                  placeholder="Search by company name, slug or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-blue-600 transition"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase bg-gray-50/20">
                    <th className="px-6 py-3">Tenant Details</th>
                    <th className="px-6 py-3">Subdomain Slug</th>
                    <th className="px-6 py-3">Onboarded Date</th>
                    <th className="px-6 py-3">Pricing Plan</th>
                    <th className="px-6 py-3">Access Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#64748B] font-medium">
                        No onboarding tenants matched your search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#0F172A]">{tenant.name}</div>
                          <div className="text-[10px] text-[#64748B] mt-0.5">{tenant.companyEmail || 'No contact email'}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px] text-[#64748B]">
                          {tenant.slug || '—'}
                        </td>
                        <td className="px-6 py-4 text-[#475569]">
                          {new Date(tenant.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={tenant.subscriptionPlan || 'Starter'}
                            disabled={updatingId !== null}
                            onChange={(e) => handleChangePlan(tenant.id, e.target.value)}
                            className="bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
                          >
                            <option value="Starter">Starter</option>
                            <option value="Growth">Growth</option>
                            <option value="Enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              tenant.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {tenant.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleUpdateStatus(tenant.id, tenant.status)}
                            disabled={updatingId !== null}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                              tenant.status === 'ACTIVE'
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/50'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/50'
                            }`}
                          >
                            {tenant.status === 'ACTIVE' ? 'Suspend Portal' : 'Activate Access'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
