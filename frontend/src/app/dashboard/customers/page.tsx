'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Customer {
  id: string;
  name: string;
  companyName: string | null;
  type: 'CORPORATE' | 'INDIVIDUAL';
  gstNumber: string | null;
  email: string | null;
  phone: string;
  billingAddress: string;
  creditLimit: string | number;
  paymentTerms: string | null;
  status: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
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
    companyName: '',
    type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'CORPORATE',
    gstNumber: '',
    email: '',
    phone: '',
    billingAddress: '',
    creditLimit: 0,
    paymentTerms: '',
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

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = `/customers?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterType !== 'ALL') url += `&type=${filterType}`;

      const res = await api.request(url);
      setCustomers(res.data);
      setTotalPages(res.meta.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user, page, filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      companyName: '',
      type: 'INDIVIDUAL',
      gstNumber: '',
      email: '',
      phone: '',
      billingAddress: '',
      creditLimit: 0,
      paymentTerms: 'Immediate',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      companyName: customer.companyName || '',
      type: customer.type,
      gstNumber: customer.gstNumber || '',
      email: customer.email || '',
      phone: customer.phone,
      billingAddress: customer.billingAddress,
      creditLimit: Number(customer.creditLimit),
      paymentTerms: customer.paymentTerms || 'Immediate',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic Validation
    if (!formData.name || !formData.phone || !formData.billingAddress) {
      setFormError('Name, Phone, and Billing Address are required.');
      return;
    }

    if (formData.type === 'CORPORATE') {
      if (!formData.gstNumber) {
        setFormError('GST number is required for corporate accounts.');
        return;
      }
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(formData.gstNumber)) {
        setFormError('Invalid Indian GSTIN format (e.g. 07AAAAA1111A1Z1).');
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        creditLimit: Number(formData.creditLimit),
        companyName: formData.companyName || null,
        gstNumber: formData.type === 'CORPORATE' ? formData.gstNumber : null,
        email: formData.email || null,
        paymentTerms: formData.paymentTerms || null,
      };

      if (editingId) {
        await api.request(`/customers/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api.request('/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsFormOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.request(`/customers/${id}`, { method: 'DELETE' });
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer.');
    }
  };

  if (!user) return null;

  const canEdit = user.role === 'SUPER_ADMIN' || user.role === 'OPERATOR_ADMIN';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Customers</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage all client accounts, rates, and billing details</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add Customer</span>
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
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 transition"
          />
        </form>

        <div className="flex bg-gray-100 p-0.5 border border-[#E2E8F0] rounded-lg self-start">
          {['ALL', 'CORPORATE', 'INDIVIDUAL'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setFilterType(type);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterType === type
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {type.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-[#64748B]">
            No customers found. Click "Add Customer" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-6">Type</th>
                  <th className="py-3 px-6">Contact Info</th>
                  <th className="py-3 px-6">Company / GST</th>
                  <th className="py-3 px-6">Credit Limit</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-6 font-medium text-[#0F172A]">{customer.name}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                        customer.type === 'CORPORATE'
                          ? 'text-purple-700 bg-purple-50 border border-purple-200'
                          : 'text-cyan-700 bg-cyan-50 border border-cyan-200'
                      }`}>
                        {customer.type}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-[#0F172A]">{customer.phone}</div>
                      <div className="text-xs text-[#64748B]">{customer.email || 'No email'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-[#0F172A]">{customer.companyName || '-'}</div>
                      <div className="text-xs text-[#64748B]">{customer.gstNumber || 'No GST'}</div>
                    </td>
                    <td className="py-4 px-6 font-mono text-[#0F172A]">
                      ₹{Number(customer.creditLimit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => router.push(`/dashboard/customers/${customer.id}/history`)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 rounded-lg transition"
                      >
                        History
                      </button>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(customer)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-100 rounded-lg transition"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
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
                  {editingId ? 'Edit Customer Info' : 'Add New Customer'}
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
                    Customer Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['INDIVIDUAL', 'CORPORATE'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type as any })}
                        className={`py-2 text-center rounded-lg text-xs font-semibold uppercase border transition-all ${
                          formData.type === type
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
                        }`}
                      >
                        {type.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                {formData.type === 'CORPORATE' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="e.g. Acme Corp Ltd"
                        className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.gstNumber}
                        onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. 07AAAAA1111A1Z1"
                        className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +919876543210"
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. name@domain.com"
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Billing Address
                  </label>
                  <textarea
                    required
                    value={formData.billingAddress}
                    onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                    placeholder="Enter complete billing address"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Credit Limit (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="e.g. Net 30, Immediate"
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
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
                {submitting ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
