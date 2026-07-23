'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Driver {
  id: string;
  name: string;
  mobile: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: string;
  emergencyContact: string;
  status: 'AVAILABLE' | 'ON_TRIP' | 'INACTIVE';
}

export default function DriversPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
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
    name: '',
    mobile: '',
    licenseNumber: '',
    licenseExpiry: '',
    address: '',
    emergencyContact: '',
    status: 'AVAILABLE' as 'AVAILABLE' | 'ON_TRIP' | 'INACTIVE',
  });

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      let url = `/drivers?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;

      const res = await api.request(url);
      setDrivers(res.data);
      setTotalPages(res.meta.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDrivers();
    }
  }, [user, page, filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDrivers();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      mobile: '',
      licenseNumber: '',
      licenseExpiry: '',
      address: '',
      emergencyContact: '',
      status: 'AVAILABLE',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingId(driver.id);
    const formattedDate = driver.licenseExpiry ? driver.licenseExpiry.substring(0, 10) : '';
    setFormData({
      name: driver.name,
      mobile: driver.mobile,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: formattedDate,
      address: driver.address,
      emergencyContact: driver.emergencyContact,
      status: driver.status,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.mobile || !formData.licenseNumber || !formData.licenseExpiry || !formData.address || !formData.emergencyContact) {
      setFormError('All fields are required.');
      return;
    }

    const mobileRegex = /^\+?[0-9]{10,15}$/;
    if (!mobileRegex.test(formData.mobile)) {
      setFormError('Mobile number must be a valid 10-15 digit string.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        await api.request(`/drivers/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      } else {
        await api.request('/drivers', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }

      setIsFormOpen(false);
      fetchDrivers();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    try {
      const res = await api.request(`/drivers/${id}`, { method: 'DELETE' });
      if (res?.status === 'INACTIVE') {
        alert(
          'Driver has historical trip records and has been marked as INACTIVE to protect financial logs.',
        );
      }
      fetchDrivers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete driver.');
    }
  };

  const getExpiryWarning = (expiryDateStr: string) => {
    if (!expiryDateStr) return { style: 'text-gray-400', text: 'Unknown' };
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        style: 'text-red-700 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px] inline-block',
        text: `EXPIRED (${Math.abs(diffDays)}d ago)`,
      };
    } else if (diffDays <= 30) {
      return {
        style: 'text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] inline-block',
        text: `EXPIRING SOON (${diffDays}d left)`,
      };
    }
    return {
      style: 'text-[#0F172A]',
      text: expiry.toLocaleDateString('en-GB'),
    };
  };

  if (!user) return null;

  const canEdit = user.role !== 'BILLING_EXECUTIVE';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Drivers</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage operations drivers, licenses, and availability statuses</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add Driver</span>
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
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 transition"
          />
        </form>

        <div className="flex bg-gray-100 p-0.5 border border-[#E2E8F0] rounded-lg self-start">
          {['ALL', 'AVAILABLE', 'ON_TRIP', 'INACTIVE'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
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

      {/* Driver List Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : drivers.length === 0 ? (
          <div className="p-12 text-center text-[#64748B]">
            No drivers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-6">Mobile Number</th>
                  <th className="py-3 px-6">License Number</th>
                  <th className="py-3 px-6">License Expiry</th>
                  <th className="py-3 px-6">Status</th>
                  {canEdit && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                {drivers.map((driver) => {
                  const expiry = getExpiryWarning(driver.licenseExpiry);
                  return (
                    <tr key={driver.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-medium text-[#0F172A]">{driver.name}</div>
                        <div className="text-xs text-[#64748B] truncate max-w-xs" title={driver.address}>
                          {driver.address}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[#0F172A]">{driver.mobile}</td>
                      <td className="py-4 px-6 text-[#0F172A] font-mono">{driver.licenseNumber}</td>
                      <td className="py-4 px-6">
                        <span className={expiry.style}>{expiry.text}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          driver.status === 'AVAILABLE' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                          driver.status === 'ON_TRIP' ? 'text-blue-700 bg-blue-50 border border-blue-200' :
                          'text-gray-500 bg-gray-100 border border-gray-200'
                        }`}>
                          {driver.status.replace('_', ' ')}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEdit(driver)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(driver.id)}
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
                  {editingId ? 'Edit Driver Info' : 'Add New Driver'}
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
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm animate-shake">
                  {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Driver Status
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['AVAILABLE', 'ON_TRIP', 'INACTIVE'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: status as any })}
                        className={`py-2 text-center rounded-lg text-xs font-semibold uppercase border transition-all ${
                          formData.status === status
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
                        }`}
                      >
                        {status.replace('_', ' ').toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="e.g. +919812345678"
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      placeholder="e.g. DL-1220150045678"
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Home Address
                  </label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter complete residential address"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Emergency Contact Info
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="e.g. Sarla Devi (Wife) - +919812345679"
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
                {submitting ? 'Saving...' : 'Save Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
