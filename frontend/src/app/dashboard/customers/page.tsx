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
  isRcm?: boolean;
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

  // Categories & Grid states
  const [categories, setCategories] = useState<any[]>([]);
  const [gridRows, setGridRows] = useState<any[]>([]);
  const [copiedRow, setCopiedRow] = useState<any | null>(null);
  const [bulkColumn, setBulkColumn] = useState<string>('halfDayRate');
  const [bulkValue, setBulkValue] = useState<string>('');

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
    clientType: 'Individual',
    cgstRate: 0,
    sgstRate: 0,
    igstRate: 0,
    isRcm: false,
  });

  const fetchCategories = async () => {
    try {
      const res = await api.request('/rate-management/categories');
      setCategories(res || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

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
      clientType: 'Individual',
      cgstRate: 2.5,
      sgstRate: 2.5,
      igstRate: 5.0,
      isRcm: false,
    });

    const defaultRows = categories.map((cat) => ({
      vehicleCategoryId: cat.id,
      vehicleCategoryName: cat.name,
      halfDayRate: 0,
      fullDayRate: 0,
      minKm: 40,
      minHr: 4,
      fullKm: 80,
      fullHr: 8,
      extraKmRate: 0,
      extraHourRate: 0,
      minKmPerDay: 250,
      outstationRatePerKm: 0,
      driverAllowance: 250,
      nightCharge: 200,
      nightStartTime: '23:00',
      nightEndTime: '05:00',
      outstationNightCharge: 0,
    }));
    setGridRows(defaultRows);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (customer: Customer) => {
    setEditingId(customer.id);
    setFormError(null);
    try {
      const fullCust = await api.request(`/customers/${customer.id}`);
      setFormData({
        name: fullCust.name,
        companyName: fullCust.companyName || '',
        type: fullCust.type,
        gstNumber: fullCust.gstNumber || '',
        email: fullCust.email || '',
        phone: fullCust.phone,
        billingAddress: fullCust.billingAddress,
        creditLimit: Number(fullCust.creditLimit),
        paymentTerms: fullCust.paymentTerms || 'Immediate',
        clientType: fullCust.clientType || 'Individual',
        cgstRate: Number(fullCust.cgstRate || 0),
        sgstRate: Number(fullCust.sgstRate || 0),
        igstRate: Number(fullCust.igstRate || 0),
        isRcm: !!fullCust.isRcm,
      });

      if (fullCust.rateCards && fullCust.rateCards.length > 0) {
        setGridRows(fullCust.rateCards.map((rc: any) => ({
          id: rc.id,
          vehicleCategoryId: rc.vehicleCategoryId,
          vehicleCategoryName: rc.vehicleCategory.name,
          halfDayRate: Number(rc.halfDayRate),
          fullDayRate: Number(rc.fullDayRate),
          minKm: Number(rc.minKm || rc.includedKm || 40),
          minHr: Number(rc.minHr || 4),
          fullKm: Number(rc.fullKm || rc.includedKm || 80),
          fullHr: Number(rc.fullHr || 8),
          extraKmRate: Number(rc.extraKmRate),
          extraHourRate: Number(rc.extraHourRate),
          minKmPerDay: Number(rc.minKmPerDay),
          outstationRatePerKm: Number(rc.outstationRatePerKm),
          driverAllowance: Number(rc.driverAllowance),
          nightCharge: Number(rc.nightCharge),
          nightStartTime: rc.nightStartTime || '23:00',
          nightEndTime: rc.nightEndTime || '05:00',
          outstationNightCharge: Number(rc.outstationNightCharge || 0),
        })));
      } else {
        setGridRows(categories.map((cat) => ({
          vehicleCategoryId: cat.id,
          vehicleCategoryName: cat.name,
          halfDayRate: 0,
          fullDayRate: 0,
          minKm: 40,
          minHr: 4,
          fullKm: 80,
          fullHr: 8,
          extraKmRate: 0,
          extraHourRate: 0,
          minKmPerDay: 250,
          outstationRatePerKm: 0,
          driverAllowance: 250,
          nightCharge: 200,
          nightStartTime: '23:00',
          nightEndTime: '05:00',
          outstationNightCharge: 0,
        })));
      }
      setIsFormOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch customer details');
    }
  };

  const handleCellChange = (rowIndex: number, field: string, value: any) => {
    setGridRows((prev) =>
      prev.map((row, idx) => (idx === rowIndex ? { ...row, [field]: value } : row))
    );
  };

  const handleArrowNav = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (e.key === 'ArrowUp') {
      nextRow = Math.max(0, rowIndex - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      nextRow = Math.min(gridRows.length - 1, rowIndex + 1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      nextCol = Math.max(0, colIndex - 1);
    } else if (e.key === 'ArrowRight') {
      nextCol = Math.min(15, colIndex + 1);
    } else {
      return;
    }

    const inputId = `cell-${nextRow}-${nextCol}`;
    const targetInput = document.getElementById(inputId);
    if (targetInput) {
      targetInput.focus();
      (targetInput as HTMLInputElement).select?.();
    }
  };

  const addGridRow = () => {
    setGridRows((prev) => [
      ...prev,
      {
        vehicleCategoryName: 'NEW CATEGORY',
        halfDayRate: 0,
        fullDayRate: 0,
        minKm: 40,
        minHr: 4,
        fullKm: 80,
        fullHr: 8,
        extraKmRate: 0,
        extraHourRate: 0,
        minKmPerDay: 250,
        outstationRatePerKm: 0,
        driverAllowance: 250,
        nightCharge: 200,
        nightStartTime: '23:00',
        nightEndTime: '05:00',
        outstationNightCharge: 0,
      },
    ]);
  };

  const deleteGridRow = (rowIndex: number) => {
    setGridRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
  };

  const copyGridRow = (rowIndex: number) => {
    setCopiedRow({ ...gridRows[rowIndex] });
  };

  const pasteGridRow = (rowIndex: number) => {
    if (!copiedRow) return;
    setGridRows((prev) =>
      prev.map((row, idx) => {
        if (idx === rowIndex) {
          return {
            ...row,
            halfDayRate: copiedRow.halfDayRate,
            fullDayRate: copiedRow.fullDayRate,
            minKm: copiedRow.minKm,
            minHr: copiedRow.minHr,
            fullKm: copiedRow.fullKm,
            fullHr: copiedRow.fullHr,
            extraKmRate: copiedRow.extraKmRate,
            extraHourRate: copiedRow.extraHourRate,
            minKmPerDay: copiedRow.minKmPerDay,
            outstationRatePerKm: copiedRow.outstationRatePerKm,
            driverAllowance: copiedRow.driverAllowance,
            nightCharge: copiedRow.nightCharge,
            nightStartTime: copiedRow.nightStartTime,
            nightEndTime: copiedRow.nightEndTime,
            outstationNightCharge: copiedRow.outstationNightCharge,
          };
        }
        return row;
      })
    );
  };

  const applyBulkUpdate = () => {
    if (!bulkColumn || bulkValue === '') return;
    const isNum = !['nightStartTime', 'nightEndTime', 'vehicleCategoryName'].includes(bulkColumn);
    const parsedVal = isNum ? Number(bulkValue) : bulkValue;
    if (isNum && isNaN(parsedVal as any)) {
      alert('Bulk update value must be a valid number');
      return;
    }
    setGridRows((prev) =>
      prev.map((row) => ({
        ...row,
        [bulkColumn]: parsedVal,
      }))
    );
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
        cgstRate: Number(formData.cgstRate || 0),
        sgstRate: Number(formData.sgstRate || 0),
        igstRate: Number(formData.igstRate || 0),
        isRcm: !!formData.isRcm,
        rateCards: gridRows.map((row) => ({
          vehicleCategoryId: row.vehicleCategoryId || undefined,
          vehicleCategoryName: row.vehicleCategoryName,
          halfDayRate: Number(row.halfDayRate),
          fullDayRate: Number(row.fullDayRate),
          includedKm: Number(row.minKm),
          extraKmRate: Number(row.extraKmRate),
          extraHourRate: Number(row.extraHourRate),
          minKmPerDay: Number(row.minKmPerDay),
          outstationRatePerKm: Number(row.outstationRatePerKm),
          driverAllowance: Number(row.driverAllowance),
          nightCharge: Number(row.nightCharge),
          nightStartTime: row.nightStartTime,
          nightEndTime: row.nightEndTime,
          minHr: Number(row.minHr),
          minKm: Number(row.minKm),
          fullHr: Number(row.fullHr),
          fullKm: Number(row.fullKm),
          outstationNightCharge: Number(row.outstationNightCharge),
          effectiveFrom: new Date().toISOString(),
          status: 'ACTIVE',
        })),
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

      {/* Creation / Edition Wide Excel Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-[95vw] max-h-[95vh] bg-white border border-[#E2E8F0] p-6 shadow-2xl rounded-xl flex flex-col justify-between overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  {editingId ? 'Edit Customer Settings & Rate Card Grid' : 'Create Customer & Rate Card Grid'}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">Configure client details, custom GST, and inline vehicle rates card.</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Body Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-6 min-h-0">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {formError}
                </div>
              )}

              {/* 1. Customer Details Fields */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] mb-3">1. Client Profile & Billing Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Customer Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['INDIVIDUAL', 'CORPORATE'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: type as any })}
                          className={`py-1.5 text-center rounded-lg text-xs font-semibold uppercase border transition-all ${
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
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Client Category Type
                    </label>
                    <select
                      value={formData.clientType}
                      onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    >
                      <option value="Company">Company</option>
                      <option value="Travel Company">Travel Company</option>
                      <option value="Individual">Individual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Full Client Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. John Doe / Aaron Tours"
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +919876543210"
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  {formData.type === 'CORPORATE' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                          Company Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="e.g. Acme Cabs Ltd"
                          className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                          GSTIN
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.gstNumber}
                          onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                          placeholder="e.g. 07AAAAA1111A1Z1"
                          className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. billing@domain.com"
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Credit Limit (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="e.g. Net 30, Immediate"
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Billing Address
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.billingAddress}
                      onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                      placeholder="Complete billing address"
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Customer Specific GST Rates */}
              <div className="bg-[#EFF6FF] p-4 rounded-xl border border-[#BFDBFE]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E40AF] mb-3">2. Customer-Specific GST Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1E40AF] uppercase tracking-wider mb-1.5">
                      CGST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cgstRate}
                      onChange={(e) => setFormData({ ...formData, cgstRate: Number(e.target.value) })}
                      placeholder="e.g. 2.5"
                      className="w-full px-3 py-1.5 bg-white border border-[#BFDBFE] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#1E40AF] uppercase tracking-wider mb-1.5">
                      SGST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sgstRate}
                      onChange={(e) => setFormData({ ...formData, sgstRate: Number(e.target.value) })}
                      placeholder="e.g. 2.5"
                      className="w-full px-3 py-1.5 bg-white border border-[#BFDBFE] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#1E40AF] uppercase tracking-wider mb-1.5">
                      IGST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.igstRate}
                      onChange={(e) => setFormData({ ...formData, igstRate: Number(e.target.value) })}
                      placeholder="e.g. 5.0"
                      className="w-full px-3 py-1.5 bg-white border border-[#BFDBFE] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="flex flex-col justify-end gap-2 text-xs text-[#1E40AF]">
                    <div className="flex items-center space-x-2 pb-1">
                      <input
                        type="checkbox"
                        id="customerIsRcm"
                        checked={formData.isRcm}
                        onChange={(e) => setFormData({ ...formData, isRcm: e.target.checked })}
                        className="w-4 h-4 rounded border-[#BFDBFE] text-blue-600 accent-blue-600 cursor-pointer"
                      />
                      <label htmlFor="customerIsRcm" className="text-xs font-bold uppercase cursor-pointer select-none">
                        Reverse Charge (RCM)
                      </label>
                    </div>
                    <div className="text-[10px] font-medium leading-tight text-blue-700/80">
                      * If configured, these rates override tenant active tax brackets on invoice generation.
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Excel-like Rate Editing Grid */}
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm flex flex-col bg-white">
                
                {/* Grid Toolbar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-3 bg-gray-50 border-b border-[#E2E8F0] gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">3. Local & Outstation Rates Grid</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#F1F5F9] text-gray-500 rounded border">Excel Mode</span>
                  </div>

                  {/* Bulk Update Controls */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[#64748B] font-medium">Bulk set:</span>
                    <select
                      value={bulkColumn}
                      onChange={(e) => setBulkColumn(e.target.value)}
                      className="bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs outline-none"
                    >
                      <option value="halfDayRate">Half Day Rate</option>
                      <option value="fullDayRate">Full Day Rate</option>
                      <option value="minKm">Local min KM</option>
                      <option value="minHr">Local min HR</option>
                      <option value="fullKm">Local full KM</option>
                      <option value="fullHr">Local full HR</option>
                      <option value="extraKmRate">Extra KM Rate</option>
                      <option value="extraHourRate">Extra Hour Rate</option>
                      <option value="minKmPerDay">Outstation min KM</option>
                      <option value="outstationRatePerKm">Outstation Rate/KM</option>
                      <option value="driverAllowance">Driver Allowance</option>
                      <option value="outstationNightCharge">Outstation Night Charge</option>
                      <option value="nightCharge">Local Night Allowance</option>
                      <option value="nightStartTime">Night Start Time</option>
                      <option value="nightEndTime">Night End Time</option>
                    </select>
                    <input
                      type="text"
                      placeholder="value"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      className="bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs w-20 outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={applyBulkUpdate}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded px-3 py-1 text-xs transition"
                    >
                      Apply to Column
                    </button>

                    <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

                    <button
                      type="button"
                      onClick={addGridRow}
                      className="border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-semibold rounded px-3 py-1 text-xs transition flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span>Add Car Row</span>
                    </button>
                  </div>
                </div>

                {/* Table Horizontal Scroll Container */}
                <div className="overflow-x-auto w-full max-h-[350px]">
                  <table className="w-full border-collapse border-spacing-0 text-left min-w-[1700px]">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase bg-[#F8FAFC] text-center select-none">
                        <th className="py-2.5 px-3 border-r border-[#E2E8F0] w-36 text-left shrink-0">Car Group</th>
                        <th className="py-1 px-2 border-r border-[#E2E8F0]" colSpan={8}>Local / Inside City Rates (₹)</th>
                        <th className="py-1 px-2 border-r border-[#E2E8F0]" colSpan={4}>Out of Station Rates (₹)</th>
                        <th className="py-1 px-2 border-r border-[#E2E8F0]" colSpan={3}>Local Night Rules</th>
                        <th className="py-2.5 px-3 w-32 shrink-0">Actions</th>
                      </tr>
                      <tr className="border-b border-[#E2E8F0] text-[9px] font-bold text-[#64748B] uppercase bg-[#F8FAFC] text-center select-none">
                        <th className="py-2 px-3 border-r border-[#E2E8F0] text-left shrink-0">Car Group Name</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Half Day</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Full Day</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Extra KM</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Extra hr</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">minhr</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">minkm</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Fullhr</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">FullKm</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Perkm</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Day (Allow.)</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Night (Allow.)</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Km UpTo</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Time From</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Time Upto</th>
                        <th className="py-2 px-1.5 border-r border-[#E2E8F0]">Amount</th>
                        <th className="py-2 px-3 w-32 shrink-0">Copy / Paste</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {gridRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors focus-within:bg-[#EFF6FF]/40">
                          {/* 0. Category Name */}
                          <td className="p-0 border-r border-[#E2E8F0] shrink-0 font-semibold">
                            <input
                              id={`cell-${rIdx}-0`}
                              type="text"
                              value={row.vehicleCategoryName}
                              onChange={(e) => handleCellChange(rIdx, 'vehicleCategoryName', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 0)}
                              className="w-full h-8 px-2.5 bg-transparent border-none text-xs font-bold text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 1. halfDayRate */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-1`}
                              type="number"
                              value={row.halfDayRate}
                              onChange={(e) => handleCellChange(rIdx, 'halfDayRate', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 1)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 2. fullDayRate */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-2`}
                              type="number"
                              value={row.fullDayRate}
                              onChange={(e) => handleCellChange(rIdx, 'fullDayRate', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 2)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 3. extraKmRate */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-3`}
                              type="number"
                              value={row.extraKmRate}
                              onChange={(e) => handleCellChange(rIdx, 'extraKmRate', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 3)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 4. extraHourRate */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-4`}
                              type="number"
                              value={row.extraHourRate}
                              onChange={(e) => handleCellChange(rIdx, 'extraHourRate', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 4)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 5. minHr */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-5`}
                              type="number"
                              value={row.minHr}
                              onChange={(e) => handleCellChange(rIdx, 'minHr', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 5)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 6. minKm */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-6`}
                              type="number"
                              value={row.minKm}
                              onChange={(e) => handleCellChange(rIdx, 'minKm', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 6)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 7. fullHr */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-7`}
                              type="number"
                              value={row.fullHr}
                              onChange={(e) => handleCellChange(rIdx, 'fullHr', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 7)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 8. fullKm */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-8`}
                              type="number"
                              value={row.fullKm}
                              onChange={(e) => handleCellChange(rIdx, 'fullKm', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 8)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 9. outstationRatePerKm */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-9`}
                              type="number"
                              value={row.outstationRatePerKm}
                              onChange={(e) => handleCellChange(rIdx, 'outstationRatePerKm', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 9)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 10. driverAllowance */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-10`}
                              type="number"
                              value={row.driverAllowance}
                              onChange={(e) => handleCellChange(rIdx, 'driverAllowance', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 10)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 11. outstationNightCharge */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-11`}
                              type="number"
                              value={row.outstationNightCharge}
                              onChange={(e) => handleCellChange(rIdx, 'outstationNightCharge', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 11)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 12. minKmPerDay */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-12`}
                              type="number"
                              value={row.minKmPerDay}
                              onChange={(e) => handleCellChange(rIdx, 'minKmPerDay', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 12)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 13. nightStartTime */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-13`}
                              type="text"
                              value={row.nightStartTime}
                              onChange={(e) => handleCellChange(rIdx, 'nightStartTime', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 13)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 14. nightEndTime */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-14`}
                              type="text"
                              value={row.nightEndTime}
                              onChange={(e) => handleCellChange(rIdx, 'nightEndTime', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 14)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* 15. nightCharge */}
                          <td className="p-0 border-r border-[#E2E8F0]">
                            <input
                              id={`cell-${rIdx}-15`}
                              type="number"
                              value={row.nightCharge}
                              onChange={(e) => handleCellChange(rIdx, 'nightCharge', e.target.value)}
                              onKeyDown={(e) => handleArrowNav(e, rIdx, 15)}
                              className="w-full h-8 bg-transparent border-none text-center text-xs font-mono text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </td>
                          {/* Actions: Copy / Paste / Delete */}
                          <td className="py-1 px-3 text-right flex items-center justify-end gap-1.5 shrink-0 h-8">
                            <button
                              type="button"
                              onClick={() => copyGridRow(rIdx)}
                              className="text-[10px] text-indigo-600 hover:bg-indigo-50 font-bold px-1.5 py-0.5 rounded transition border border-indigo-200"
                              title="Copy row values"
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => pasteGridRow(rIdx)}
                              disabled={!copiedRow}
                              className="text-[10px] text-teal-600 hover:bg-teal-50 font-bold px-1.5 py-0.5 rounded transition border border-teal-200 disabled:opacity-40"
                              title="Paste copied values"
                            >
                              Paste
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteGridRow(rIdx)}
                              className="text-[10px] text-red-600 hover:bg-red-50 font-bold px-1.5 py-0.5 rounded transition border border-red-200"
                              title="Delete Row"
                            >
                              Del
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 border-t border-[#E2E8F0] pt-4 flex gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="py-2 px-6 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={submitting}
                className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center shadow-sm"
              >
                {submitting ? 'Saving changes...' : 'Save Customer & Grid'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
