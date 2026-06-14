'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Customer {
  id: string;
  name: string;
  type: string;
  companyName: string | null;
}

interface VehicleCategory {
  id: string;
  name: string;
}

interface RateCard {
  id: string;
  customerId: string | null;
  clientType: string;
  vehicleCategoryId: string;
  halfDayRate: string | number;
  fullDayRate: string | number;
  includedKm: string | number;
  extraKmRate: string | number;
  extraHourRate: string | number;
  minKmPerDay: string | number;
  outstationRatePerKm: string | number;
  driverAllowance: string | number;
  nightCharge: string | number;
  nightStartTime: string | null;
  nightEndTime: string | null;
  effectiveFrom: string;
  status: string;
  customer?: Customer | null;
  vehicleCategory: VehicleCategory;
}

interface TaxConfiguration {
  id: string;
  taxName: string;
  cgst: string | number;
  sgst: string | number;
  igst: string | number;
  effectiveFrom: string;
  isActive: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: any;
  newValues: any;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export default function RateManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'rates' | 'taxes'>('rates');

  // Shared Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);

  // Rate Cards list & filters
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ratesSearch, setRatesSearch] = useState('');
  const [filterClientType, setFilterClientType] = useState('ALL');
  const [filterCustomerId, setFilterCustomerId] = useState('ALL');
  const [filterCategoryId, setFilterCategoryId] = useState('ALL');
  const [filterEffectiveDate, setFilterEffectiveDate] = useState('');
  const [ratesPage, setRatesPage] = useState(1);
  const [ratesTotalPages, setRatesTotalPages] = useState(1);

  // Tax Configurations
  const [taxConfigs, setTaxConfigs] = useState<TaxConfiguration[]>([]);
  const [loadingTaxes, setLoadingTaxes] = useState(true);
  const [taxesError, setTaxesError] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Rate Card Drawer State
  const [isRatesDrawerOpen, setIsRatesDrawerOpen] = useState(false);
  const [submittingRate, setSubmittingRate] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateFormError, setRateFormError] = useState<string | null>(null);
  const [rateFormData, setRateFormData] = useState({
    customerId: '',
    clientType: 'Company',
    vehicleCategoryId: '',
    halfDayRate: 0,
    fullDayRate: 0,
    includedKm: 80,
    extraKmRate: 0,
    extraHourRate: 0,
    minKmPerDay: 250,
    outstationRatePerKm: 0,
    driverAllowance: 250,
    nightCharge: 200,
    nightStartTime: '23:00',
    nightEndTime: '05:00',
    effectiveFrom: '',
    status: 'ACTIVE',
  });

  // Tax Config Drawer State
  const [isTaxesDrawerOpen, setIsTaxesDrawerOpen] = useState(false);
  const [submittingTax, setSubmittingTax] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [taxFormError, setTaxFormError] = useState<string | null>(null);
  const [taxFormData, setTaxFormData] = useState({
    taxName: '',
    cgst: 0,
    sgst: 0,
    igst: 0,
    effectiveFrom: '',
    isActive: false,
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

  // Load Categories & Customers once
  const loadSharedData = async () => {
    try {
      const [catsRes, custsRes] = await Promise.all([
        api.request('/rate-management/categories'),
        api.request('/customers?limit=100'),
      ]);
      setCategories(catsRes);
      setCustomers(custsRes.data || []);
      if (catsRes.length > 0) {
        setRateFormData((prev) => ({ ...prev, vehicleCategoryId: catsRes[0].id }));
      }
    } catch (e: any) {
      console.error('Failed to load configuration list:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadSharedData();
    }
  }, [user]);

  // Fetch Rate Cards
  const fetchRateCards = async () => {
    setLoadingRates(true);
    try {
      let query = `/rate-management/rate-cards?page=${ratesPage}&limit=10`;
      if (ratesSearch) query += `&search=${encodeURIComponent(ratesSearch)}`;
      if (filterClientType !== 'ALL') query += `&clientType=${filterClientType}`;
      if (filterCustomerId !== 'ALL') query += `&customerId=${filterCustomerId}`;
      if (filterCategoryId !== 'ALL') query += `&vehicleCategoryId=${filterCategoryId}`;
      if (filterEffectiveDate) query += `&effectiveDate=${filterEffectiveDate}`;

      const res = await api.request(query);
      setRateCards(res.data);
      setRatesTotalPages(res.meta.totalPages);
      setRatesError(null);
    } catch (err: any) {
      setRatesError(err.message || 'Failed to load rate cards');
    } finally {
      setLoadingRates(false);
    }
  };

  // Fetch Tax Configurations
  const fetchTaxConfigs = async () => {
    setLoadingTaxes(true);
    try {
      const res = await api.request('/rate-management/tax-configs');
      setTaxConfigs(res);
      setTaxesError(null);
    } catch (err: any) {
      setTaxesError(err.message || 'Failed to load tax settings');
    } finally {
      setLoadingTaxes(false);
    }
  };

  // Load active tab data
  useEffect(() => {
    if (user) {
      if (activeTab === 'rates') {
        fetchRateCards();
      } else {
        fetchTaxConfigs();
      }
    }
  }, [user, activeTab, ratesPage, filterClientType, filterCustomerId, filterCategoryId, filterEffectiveDate]);

  // Trigger search on submit
  const handleRatesSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRatesPage(1);
    fetchRateCards();
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const csvContent = await api.request('/rate-management/rate-cards/export');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `rate_cards_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.request('/rate-management/audit-logs');
      setAuditLogs(res);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenAuditLogs = () => {
    setShowLogsModal(true);
    fetchAuditLogs();
  };

  // =========================================================================
  // RATE CARD ACTIONS
  // =========================================================================

  const handleOpenCreateRate = () => {
    setEditingRateId(null);
    setRateFormData({
      customerId: '',
      clientType: 'Company',
      vehicleCategoryId: categories[0]?.id || '',
      halfDayRate: 0,
      fullDayRate: 0,
      includedKm: 80,
      extraKmRate: 0,
      extraHourRate: 0,
      minKmPerDay: 250,
      outstationRatePerKm: 0,
      driverAllowance: 250,
      nightCharge: 200,
      nightStartTime: '23:00',
      nightEndTime: '05:00',
      effectiveFrom: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
    setRateFormError(null);
    setIsRatesDrawerOpen(true);
  };

  const handleOpenEditRate = (rate: RateCard) => {
    setEditingRateId(rate.id);
    setRateFormData({
      customerId: rate.customerId || '',
      clientType: rate.clientType,
      vehicleCategoryId: rate.vehicleCategoryId,
      halfDayRate: Number(rate.halfDayRate),
      fullDayRate: Number(rate.fullDayRate),
      includedKm: Number(rate.includedKm),
      extraKmRate: Number(rate.extraKmRate),
      extraHourRate: Number(rate.extraHourRate),
      minKmPerDay: Number(rate.minKmPerDay),
      outstationRatePerKm: Number(rate.outstationRatePerKm),
      driverAllowance: Number(rate.driverAllowance),
      nightCharge: Number(rate.nightCharge),
      nightStartTime: rate.nightStartTime || '23:00',
      nightEndTime: rate.nightEndTime || '05:00',
      effectiveFrom: new Date(rate.effectiveFrom).toISOString().split('T')[0],
      status: rate.status,
    });
    setRateFormError(null);
    setIsRatesDrawerOpen(true);
  };

  const handleCloneRate = async (id: string) => {
    if (!confirm('Are you sure you want to clone this rate card?')) return;
    try {
      await api.request(`/rate-management/rate-cards/${id}/clone`, { method: 'POST' });
      fetchRateCards();
    } catch (err: any) {
      alert(err.message || 'Failed to clone rate card');
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate card?')) return;
    try {
      await api.request(`/rate-management/rate-cards/${id}`, { method: 'DELETE' });
      fetchRateCards();
    } catch (err: any) {
      alert(err.message || 'Failed to delete rate card');
    }
  };

  const handleRateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateFormError(null);

    // Form validations
    if (!rateFormData.clientType || !rateFormData.vehicleCategoryId || !rateFormData.effectiveFrom) {
      setRateFormError('Client Type, Vehicle Category, and Effective Date are required.');
      return;
    }

    if (rateFormData.halfDayRate < 0 || rateFormData.fullDayRate < 0 || rateFormData.includedKm < 0) {
      setRateFormError('Rates and Included KM must be non-negative values.');
      return;
    }

    setSubmittingRate(true);
    try {
      const payload = {
        ...rateFormData,
        customerId: rateFormData.customerId || undefined,
        halfDayRate: Number(rateFormData.halfDayRate),
        fullDayRate: Number(rateFormData.fullDayRate),
        includedKm: Number(rateFormData.includedKm),
        extraKmRate: Number(rateFormData.extraKmRate),
        extraHourRate: Number(rateFormData.extraHourRate),
        minKmPerDay: Number(rateFormData.minKmPerDay),
        outstationRatePerKm: Number(rateFormData.outstationRatePerKm),
        driverAllowance: Number(rateFormData.driverAllowance),
        nightCharge: Number(rateFormData.nightCharge),
      };

      if (editingRateId) {
        await api.request(`/rate-management/rate-cards/${editingRateId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api.request('/rate-management/rate-cards', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsRatesDrawerOpen(false);
      fetchRateCards();
    } catch (err: any) {
      setRateFormError(err.message || 'Operation failed');
    } finally {
      setSubmittingRate(false);
    }
  };

  // =========================================================================
  // TAX CONFIG ACTIONS
  // =========================================================================

  const handleOpenCreateTax = () => {
    setEditingTaxId(null);
    setTaxFormData({
      taxName: '',
      cgst: 2.5,
      sgst: 2.5,
      igst: 5.0,
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: false,
    });
    setTaxFormError(null);
    setIsTaxesDrawerOpen(true);
  };

  const handleOpenEditTax = (tax: TaxConfiguration) => {
    setEditingTaxId(tax.id);
    setTaxFormData({
      taxName: tax.taxName,
      cgst: Number(tax.cgst),
      sgst: Number(tax.sgst),
      igst: Number(tax.igst),
      effectiveFrom: new Date(tax.effectiveFrom).toISOString().split('T')[0],
      isActive: tax.isActive,
    });
    setTaxFormError(null);
    setIsTaxesDrawerOpen(true);
  };

  const handleActivateTax = async (id: string) => {
    try {
      await api.request(`/rate-management/tax-configs/${id}/activate`, { method: 'POST' });
      fetchTaxConfigs();
    } catch (err: any) {
      alert(err.message || 'Failed to activate tax configuration');
    }
  };

  const handleDeleteTax = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax configuration?')) return;
    try {
      await api.request(`/rate-management/tax-configs/${id}`, { method: 'DELETE' });
      fetchTaxConfigs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete tax configuration');
    }
  };

  const handleTaxFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaxFormError(null);

    // Validation
    if (!taxFormData.taxName || !taxFormData.effectiveFrom) {
      setTaxFormError('Tax Name and Effective Date are required.');
      return;
    }

    if (taxFormData.cgst < 0 || taxFormData.sgst < 0 || taxFormData.igst < 0) {
      setTaxFormError('Tax percentages cannot be negative.');
      return;
    }

    setSubmittingTax(true);
    try {
      const payload = {
        taxName: taxFormData.taxName,
        cgst: Number(taxFormData.cgst),
        sgst: Number(taxFormData.sgst),
        igst: Number(taxFormData.igst),
        effectiveFrom: new Date(taxFormData.effectiveFrom).toISOString(),
        isActive: taxFormData.isActive,
      };

      if (editingTaxId) {
        await api.request(`/rate-management/tax-configs/${editingTaxId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api.request('/rate-management/tax-configs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsTaxesDrawerOpen(false);
      fetchTaxConfigs();
    } catch (err: any) {
      setTaxFormError(err.message || 'Operation failed');
    } finally {
      setSubmittingTax(false);
    }
  };

  if (!user) return null;

  const canEdit = user.role === 'SUPER_ADMIN' || user.role === 'OPERATOR_ADMIN';

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans bg-[#F8FAFC] min-h-screen">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Rate & Billing Settings</h1>
          <p className="text-sm text-[#64748B] mt-1">Configure client-specific pricing grids, default values, and regional tax brackets.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAuditLogs}
            className="py-2.5 px-4 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#0F172A] font-semibold rounded-lg text-sm transition flex items-center gap-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <span>Audit Logs</span>
          </button>

          {activeTab === 'rates' ? (
            <>
              <button
                onClick={handleExportCsv}
                className="py-2.5 px-4 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#0F172A] font-semibold rounded-lg text-sm transition flex items-center gap-2 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span>Export CSV</span>
              </button>
              {canEdit && (
                <button
                  onClick={handleOpenCreateRate}
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-sm transition flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Add Rate Card</span>
                </button>
              )}
            </>
          ) : (
            canEdit && (
              <button
                onClick={handleOpenCreateTax}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-sm transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Add Tax Settings</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#E2E8F0] gap-6 mb-6">
        <button
          onClick={() => setActiveTab('rates')}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === 'rates' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Rate Cards
        </button>
        <button
          onClick={() => setActiveTab('taxes')}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === 'taxes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Tax Settings
        </button>
      </div>

      {/* =========================================================================
          TAB 1: RATE CARDS
          ========================================================================= */}
      {activeTab === 'rates' && (
        <div>
          {/* Filters Row */}
          <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl flex flex-wrap items-center gap-3 shadow-sm mb-6">
            <form onSubmit={handleRatesSearchSubmit} className="relative w-full md:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search rates..."
                value={ratesSearch}
                onChange={(e) => setRatesSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 transition"
              />
            </form>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:flex-1 md:justify-end">
              {/* Client Type Filter */}
              <select
                value={filterClientType}
                onChange={(e) => { setFilterClientType(e.target.value); setRatesPage(1); }}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-medium text-[#475569] focus:outline-none focus:border-blue-500 transition"
              >
                <option value="ALL">All Client Types</option>
                <option value="Company">Company</option>
                <option value="Travel Company">Travel Company</option>
                <option value="Individual">Individual</option>
              </select>

              {/* Customer Filter */}
              <select
                value={filterCustomerId}
                onChange={(e) => { setFilterCustomerId(e.target.value); setRatesPage(1); }}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-medium text-[#475569] focus:outline-none focus:border-blue-500 transition max-w-[180px]"
              >
                <option value="ALL">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Vehicle Category Filter */}
              <select
                value={filterCategoryId}
                onChange={(e) => { setFilterCategoryId(e.target.value); setRatesPage(1); }}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-medium text-[#475569] focus:outline-none focus:border-blue-500 transition"
              >
                <option value="ALL">All Vehicle Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Effective From Date Filter */}
              <input
                type="date"
                value={filterEffectiveDate}
                onChange={(e) => { setFilterEffectiveDate(e.target.value); setRatesPage(1); }}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs font-medium text-[#475569] focus:outline-none focus:border-blue-500 transition"
              />

              {/* Reset button */}
              {(filterClientType !== 'ALL' || filterCustomerId !== 'ALL' || filterCategoryId !== 'ALL' || filterEffectiveDate || ratesSearch) && (
                <button
                  onClick={() => {
                    setRatesSearch('');
                    setFilterClientType('ALL');
                    setFilterCustomerId('ALL');
                    setFilterCategoryId('ALL');
                    setFilterEffectiveDate('');
                    setRatesPage(1);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 font-semibold px-3 py-2 rounded-lg transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Rates Table Grid */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            {loadingRates ? (
              <div className="p-12 flex justify-center">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : rateCards.length === 0 ? (
              <div className="p-12 text-center text-[#64748B]">
                No rate cards matching the criteria. Click "Add Rate Card" to register new rates.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase bg-[#F8FAFC]">
                      <th className="py-3 px-4" rowSpan={2}>Client Type</th>
                      <th className="py-3 px-4" rowSpan={2}>Customer Name</th>
                      <th className="py-3 px-4" rowSpan={2}>Category</th>
                      <th className="py-2 px-4 text-center border-b border-[#E2E8F0]" colSpan={5}>Local Rates (₹)</th>
                      <th className="py-2 px-4 text-center border-b border-[#E2E8F0]" colSpan={4}>Outstation Rates (₹)</th>
                      <th className="py-3 px-4" rowSpan={2}>Effective From</th>
                      <th className="py-3 px-4" rowSpan={2}>Status</th>
                      <th className="py-3 px-4 text-right" rowSpan={2}>Actions</th>
                    </tr>
                    <tr className="border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase bg-[#F8FAFC]">
                      <th className="py-2 px-2 text-center">Half Day</th>
                      <th className="py-2 px-2 text-center">Full Day</th>
                      <th className="py-2 px-2 text-center">Incl. KM</th>
                      <th className="py-2 px-2 text-center">Ext. KM</th>
                      <th className="py-2 px-2 text-center">Ext. Hr</th>
                      <th className="py-2 px-2 text-center">Min KM/Day</th>
                      <th className="py-2 px-2 text-center">Rate/KM</th>
                      <th className="py-2 px-2 text-center">Driver Allow</th>
                      <th className="py-2 px-2 text-center">Night Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                    {rateCards.map((rc) => (
                      <tr key={rc.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-4 px-4">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            rc.clientType === 'Company'
                              ? 'text-indigo-700 bg-indigo-50 border border-indigo-200'
                              : rc.clientType === 'Travel Company'
                              ? 'text-teal-700 bg-teal-50 border border-teal-200'
                              : 'text-amber-700 bg-amber-50 border border-amber-200'
                          }`}>
                            {rc.clientType}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-medium text-[#0F172A]">
                          {rc.customer?.name || (
                            <span className="text-[#94A3B8] italic font-normal">Default (All Clients)</span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-semibold text-gray-700">{rc.vehicleCategory.name}</td>
                        {/* Local Rates */}
                        <td className="py-4 px-2 text-center font-mono text-[#0F172A]">₹{Number(rc.halfDayRate).toFixed(0)}</td>
                        <td className="py-4 px-2 text-center font-mono text-[#0F172A]">₹{Number(rc.fullDayRate).toFixed(0)}</td>
                        <td className="py-4 px-2 text-center font-mono text-[#64748B]">{Number(rc.includedKm).toFixed(0)} km</td>
                        <td className="py-4 px-2 text-center font-mono text-[#0F172A]">₹{Number(rc.extraKmRate).toFixed(0)}</td>
                        <td className="py-4 px-2 text-center font-mono text-[#0F172A]">₹{Number(rc.extraHourRate).toFixed(0)}</td>
                        {/* Outstation Rates */}
                        <td className="py-4 px-2 text-center font-mono text-[#64748B]">{Number(rc.minKmPerDay).toFixed(0)} km</td>
                        <td className="py-4 px-2 text-center font-mono text-[#0F172A]">₹{Number(rc.outstationRatePerKm).toFixed(0)}</td>
                        <td className="py-4 px-2 text-center font-mono text-[#0F172A]">₹{Number(rc.driverAllowance).toFixed(0)}</td>
                        <td className="py-4 px-2 text-center font-mono text-[#0F172A]">
                          ₹{Number(rc.nightCharge).toFixed(0)}
                          {rc.nightStartTime && (
                            <span className="block text-[10px] text-gray-400 font-sans mt-0.5">
                              {rc.nightStartTime}-{rc.nightEndTime}
                            </span>
                          )}
                        </td>
                        {/* Effective & Status */}
                        <td className="py-4 px-4 text-xs text-[#475569]">
                          {new Date(rc.effectiveFrom).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${rc.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`} title={rc.status} />
                        </td>
                        {/* Actions */}
                        <td className="py-4 px-4 text-right space-x-1.5 shrink-0">
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleCloneRate(rc.id)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                                title="Clone"
                              >
                                Clone
                              </button>
                              <button
                                onClick={() => handleOpenEditRate(rc)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-[#E2E8F0] hover:bg-gray-50 rounded-lg transition"
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRate(rc.id)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title="Delete"
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

            {/* Rates Pagination */}
            {!loadingRates && ratesTotalPages > 1 && (
              <div className="border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-[#F8FAFC]">
                <button
                  disabled={ratesPage === 1}
                  onClick={() => setRatesPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
                >
                  Previous
                </button>
                <span className="text-xs text-[#64748B]">
                  Page {ratesPage} of {ratesTotalPages}
                </span>
                <button
                  disabled={ratesPage === ratesTotalPages}
                  onClick={() => setRatesPage((p) => Math.min(p + 1, ratesTotalPages))}
                  className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TAX SETTINGS
          ========================================================================= */}
      {activeTab === 'taxes' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          {loadingTaxes ? (
            <div className="p-12 flex justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : taxConfigs.length === 0 ? (
            <div className="p-12 text-center text-[#64748B]">
              No tax configurations found. Click "Add Tax Settings" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase bg-[#F8FAFC]">
                    <th className="py-3 px-6">Tax Bracket Name</th>
                    <th className="py-3 px-6 text-center">CGST %</th>
                    <th className="py-3 px-6 text-center">SGST %</th>
                    <th className="py-3 px-6 text-center">IGST %</th>
                    <th className="py-3 px-6">Effective Date</th>
                    <th className="py-3 px-6">Active Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                  {taxConfigs.map((tax) => (
                    <tr key={tax.id} className={`hover:bg-[#F8FAFC] transition-colors ${tax.isActive ? 'bg-blue-50/20' : ''}`}>
                      <td className="py-4 px-6 font-semibold text-[#0F172A]">{tax.taxName}</td>
                      <td className="py-4 px-6 text-center font-mono text-gray-700">{Number(tax.cgst).toFixed(2)}%</td>
                      <td className="py-4 px-6 text-center font-mono text-gray-700">{Number(tax.sgst).toFixed(2)}%</td>
                      <td className="py-4 px-6 text-center font-mono text-gray-700">{Number(tax.igst).toFixed(2)}%</td>
                      <td className="py-4 px-6 text-xs text-[#475569]">
                        {new Date(tax.effectiveFrom).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-4 px-6">
                        {tax.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active Configuration
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        {canEdit && (
                          <>
                            {!tax.isActive && (
                              <button
                                onClick={() => handleActivateTax(tax.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-100 rounded-lg transition"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditTax(tax)}
                              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-[#E2E8F0] hover:bg-gray-50 rounded-lg transition"
                            >
                              Edit
                            </button>
                            {!tax.isActive && (
                              <button
                                onClick={() => handleDeleteTax(tax.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          DRAWER: RATE CARD FORM
          ========================================================================= */}
      {isRatesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-left">
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-[#E2E8F0] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {editingRateId ? 'Edit Pricing Rate Card' : 'Create Customer Rate Card'}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Set package thresholds and surcharge rates by vehicle tier.</p>
                </div>
                <button
                  onClick={() => setIsRatesDrawerOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {rateFormError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {rateFormError}
                </div>
              )}

              <form onSubmit={handleRateFormSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3 border-b pb-1">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Client Type
                      </label>
                      <select
                        value={rateFormData.clientType}
                        onChange={(e) => setRateFormData({ ...rateFormData, clientType: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      >
                        <option value="Company">Company</option>
                        <option value="Travel Company">Travel Company</option>
                        <option value="Individual">Individual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Vehicle Category
                      </label>
                      <select
                        value={rateFormData.vehicleCategoryId}
                        onChange={(e) => setRateFormData({ ...rateFormData, vehicleCategoryId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Customer (Optional)
                      </label>
                      <select
                        value={rateFormData.customerId}
                        onChange={(e) => setRateFormData({ ...rateFormData, customerId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      >
                        <option value="">Default (All Customers under type)</option>
                        {customers
                          .filter((c) => {
                            if (rateFormData.clientType === 'Individual') return c.type === 'INDIVIDUAL';
                            return c.type === 'CORPORATE';
                          })
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Effective From Date
                      </label>
                      <input
                        type="date"
                        required
                        value={rateFormData.effectiveFrom}
                        onChange={(e) => setRateFormData({ ...rateFormData, effectiveFrom: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Local Packages Rates */}
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3 border-b pb-1">Local Packages & Limits</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Half Day Rate (₹)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.halfDayRate}
                        onChange={(e) => setRateFormData({ ...rateFormData, halfDayRate: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Full Day Rate (₹)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.fullDayRate}
                        onChange={(e) => setRateFormData({ ...rateFormData, fullDayRate: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Included KM
                      </label>
                      <input
                        type="number"
                        value={rateFormData.includedKm}
                        onChange={(e) => setRateFormData({ ...rateFormData, includedKm: Number(e.target.value) })}
                        placeholder="80"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Extra KM Rate (₹)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.extraKmRate}
                        onChange={(e) => setRateFormData({ ...rateFormData, extraKmRate: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Extra Hour Rate (₹)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.extraHourRate}
                        onChange={(e) => setRateFormData({ ...rateFormData, extraHourRate: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Outstation Rates */}
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3 border-b pb-1">Outstation Packages</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Min KM Per Day
                      </label>
                      <input
                        type="number"
                        value={rateFormData.minKmPerDay}
                        onChange={(e) => setRateFormData({ ...rateFormData, minKmPerDay: Number(e.target.value) })}
                        placeholder="250"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Rate Per KM (₹)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.outstationRatePerKm}
                        onChange={(e) => setRateFormData({ ...rateFormData, outstationRatePerKm: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Driver Allowance (₹)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.driverAllowance}
                        onChange={(e) => setRateFormData({ ...rateFormData, driverAllowance: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Night Charges */}
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3 border-b pb-1">Night Surcharges</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Night Charge (₹)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.nightCharge}
                        onChange={(e) => setRateFormData({ ...rateFormData, nightCharge: Number(e.target.value) })}
                        placeholder="200"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Start Time
                      </label>
                      <input
                        type="text"
                        value={rateFormData.nightStartTime}
                        onChange={(e) => setRateFormData({ ...rateFormData, nightStartTime: e.target.value })}
                        placeholder="23:00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        End Time
                      </label>
                      <input
                        type="text"
                        value={rateFormData.nightEndTime}
                        onChange={(e) => setRateFormData({ ...rateFormData, nightEndTime: e.target.value })}
                        placeholder="05:00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Status Options */}
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Card Status
                  </label>
                  <div className="flex bg-gray-100 p-0.5 border border-[#E2E8F0] rounded-lg self-start w-max">
                    {['ACTIVE', 'INACTIVE'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setRateFormData({ ...rateFormData, status: st })}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${
                          rateFormData.status === st ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                        }`}
                      >
                        {st.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-8 border-t border-[#E2E8F0] pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsRatesDrawerOpen(false)}
                className="w-1/2 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg text-sm transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRateFormSubmit}
                disabled={submittingRate}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {submittingRate ? 'Saving...' : 'Save Rate Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER: TAX BRACKET FORM
          ========================================================================= */}
      {isTaxesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-left">
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-[#E2E8F0] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {editingTaxId ? 'Edit Tax Configuration' : 'Create Tax Configuration'}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Specify tax rates for CGST, SGST, and IGST.</p>
                </div>
                <button
                  onClick={() => setIsTaxesDrawerOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {taxFormError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {taxFormError}
                </div>
              )}

              <form onSubmit={handleTaxFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Tax Configuration Name
                  </label>
                  <input
                    type="text"
                    required
                    value={taxFormData.taxName}
                    onChange={(e) => setTaxFormData({ ...taxFormData, taxName: e.target.value })}
                    placeholder="e.g. Standard GST 5%"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      CGST (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={taxFormData.cgst}
                      onChange={(e) => setTaxFormData({ ...taxFormData, cgst: Number(e.target.value) })}
                      placeholder="2.5"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      SGST (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={taxFormData.sgst}
                      onChange={(e) => setTaxFormData({ ...taxFormData, sgst: Number(e.target.value) })}
                      placeholder="2.5"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      IGST (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={taxFormData.igst}
                      onChange={(e) => setTaxFormData({ ...taxFormData, igst: Number(e.target.value) })}
                      placeholder="5.0"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Effective From
                  </label>
                  <input
                    type="date"
                    required
                    value={taxFormData.effectiveFrom}
                    onChange={(e) => setTaxFormData({ ...taxFormData, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={taxFormData.isActive}
                    onChange={(e) => setTaxFormData({ ...taxFormData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer select-none">
                    Set as Active Configuration
                  </label>
                </div>
              </form>
            </div>

            <div className="mt-8 border-t border-[#E2E8F0] pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsTaxesDrawerOpen(false)}
                className="w-1/2 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg text-sm transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTaxFormSubmit}
                disabled={submittingTax}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {submittingTax ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: AUDIT LOGS OVERLAY
          ========================================================================= */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Rate & Tax Audit Logs</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Track modifications, creators, and history timestamps.</p>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
              {loadingLogs ? (
                <div className="flex justify-center items-center h-48">
                  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No audit logs available for rates or taxes.</div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="border border-[#E2E8F0] p-4 rounded-xl text-xs flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/50 hover:bg-gray-50 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                            log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                            log.action.includes('UPDATE') ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                            'bg-red-50 text-red-800 border border-red-100'
                          }`}>
                            {log.action.replace('_', ' ')}
                          </span>
                          <span className="font-semibold text-gray-700">on {log.entityName}</span>
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          ID: <span className="font-mono">{log.entityId}</span>
                        </div>
                        {log.user && (
                          <div className="text-gray-600 font-medium">
                            By {log.user.firstName} {log.user.lastName} ({log.user.email})
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[#64748B] text-[10px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString('en-GB')} {new Date(log.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#E2E8F0] bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition shadow-sm"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
