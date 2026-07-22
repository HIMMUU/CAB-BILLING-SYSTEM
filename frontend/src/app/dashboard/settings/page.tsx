'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function CompanySettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    digitalSignatureUrl: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyGst: '',
    companyPan: '',
    sacNo: '9966',
    serviceCategory: 'Rent-A-Cab',
    bankName: '',
    bankBranch: '',
    bankAccountNo: '',
    bankIfsc: '',
    bankAccountHolder: '',
    invoiceTitle: 'TAX INVOICE',
    dutySlipTitle: 'TRIP OPERATIONAL DUTY SLIP',
    hideLogoOnPdf: false,
    termsAndConditions: '',
    pdfTheme: 'MODERN',
    pdfColorPrimary: '#1E3A8A',
    pdfColorCompanyName: '#E11D48',
    pdfColorTableHeaderBg: '#1E3A8A',
    pdfColorTableHeaderText: '#FFFFFF',
    pdfFontFamily: 'Helvetica',
    pdfShowBank: true,
    pdfShowTerms: true,
    pdfHeaderLayout: 'SINGLE_LINE',
    invoicePrefix: 'INV-2026-',
    invoiceStartingNumber: 1001,
    bookingPrefix: 'BK-2026-',
    bookingStartingNumber: 1001,
    dutySlipPrefix: 'DS-2026-',
    dutySlipStartingNumber: 1001,
    currentFiscalYear: '2026-27',
    fiscalYearStartMonth: 4,
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'tax' | 'bank' | 'pdf' | 'docControl'>('profile');

  const [resetFyModalOpen, setResetFyModalOpen] = useState(false);
  const [resetFyValue, setResetFyValue] = useState('2027-28');
  const [resetInvoices, setResetInvoices] = useState(true);
  const [resetInvoicePrefix, setResetInvoicePrefix] = useState('TDH-INV-2027-28-');
  const [resetInvoiceStart, setResetInvoiceStart] = useState(1);
  const [resetBookings, setResetBookings] = useState(true);
  const [resetBookingPrefix, setResetBookingPrefix] = useState('BK-2027-28-');
  const [resetBookingStart, setResetBookingStart] = useState(1);
  const [resetDutySlips, setResetDutySlips] = useState(true);
  const [resetDutySlipPrefix, setResetDutySlipPrefix] = useState('DS-2027-28-');
  const [resetDutySlipStart, setResetDutySlipStart] = useState(1);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await api.request('/tenant-settings');
      setFormData({
        name: settings.name || '',
        logoUrl: settings.logoUrl || '',
        digitalSignatureUrl: settings.digitalSignatureUrl || '',
        companyAddress: settings.companyAddress || '',
        companyPhone: settings.companyPhone || '',
        companyEmail: settings.companyEmail || '',
        companyGst: settings.companyGst || '',
        companyPan: settings.companyPan || '',
        sacNo: settings.sacNo || '9966',
        serviceCategory: settings.serviceCategory || 'Rent-A-Cab',
        bankName: settings.bankName || '',
        bankBranch: settings.bankBranch || '',
        bankAccountNo: settings.bankAccountNo || '',
        bankIfsc: settings.bankIfsc || '',
        bankAccountHolder: settings.bankAccountHolder || '',
        invoiceTitle: settings.invoiceTitle || 'TAX INVOICE',
        dutySlipTitle: settings.dutySlipTitle || 'TRIP OPERATIONAL DUTY SLIP',
        hideLogoOnPdf: !!settings.hideLogoOnPdf,
        termsAndConditions: settings.termsAndConditions || '',
        pdfTheme: settings.pdfTheme || 'MODERN',
        pdfColorPrimary: settings.pdfColorPrimary || '#1E3A8A',
        pdfColorCompanyName: settings.pdfColorCompanyName || '#E11D48',
        pdfColorTableHeaderBg: settings.pdfColorTableHeaderBg || '#1E3A8A',
        pdfColorTableHeaderText: settings.pdfColorTableHeaderText || '#FFFFFF',
        pdfFontFamily: settings.pdfFontFamily || 'Helvetica',
        pdfShowBank: settings.pdfShowBank !== false,
        pdfShowTerms: settings.pdfShowTerms !== false,
        pdfHeaderLayout: settings.pdfHeaderLayout || 'SINGLE_LINE',
        invoicePrefix: settings.invoicePrefix !== undefined ? settings.invoicePrefix : 'INV-2026-',
        invoiceStartingNumber: settings.invoiceStartingNumber || 1001,
        bookingPrefix: settings.bookingPrefix !== undefined ? settings.bookingPrefix : 'BK-2026-',
        bookingStartingNumber: settings.bookingStartingNumber || 1001,
        dutySlipPrefix: settings.dutySlipPrefix !== undefined ? settings.dutySlipPrefix : 'DS-2026-',
        dutySlipStartingNumber: settings.dutySlipStartingNumber || 1001,
        currentFiscalYear: settings.currentFiscalYear || '2026-27',
        fiscalYearStartMonth: settings.fiscalYearStartMonth || 4,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => {
      const updated = { ...prev, [name]: val };
      // Auto-derive PAN from GSTIN if GSTIN is modified
      if (name === 'companyGst' && value.length === 15) {
        updated.companyPan = value.substring(2, 12).toUpperCase();
      }
      return updated;
    });
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'digitalSignatureUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'logoUrl') setUploadingLogo(true);
    else setUploadingSignature(true);

    setError(null);
    setSuccess(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await api.request('/tenant-settings/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      setFormData((prev) => ({
        ...prev,
        [field]: res.url,
      }));
      setSuccess(`${field === 'logoUrl' ? 'Logo' : 'Digital Signature'} uploaded successfully to Cloudinary!`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      if (field === 'logoUrl') setUploadingLogo(false);
      else setUploadingSignature(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'OPERATOR_ADMIN') {
      setError('You do not have permission to modify settings.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    // Basic format validations
    if (formData.companyGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.companyGst)) {
      setError('Invalid GSTIN format. Must be 15 characters (e.g. 07AAAAA1111A1Z1)');
      setSaving(false);
      return;
    }

    try {
      await api.request('/tenant-settings', {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      setSuccess('Settings updated successfully!');
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to update company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteFiscalYearReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !confirm(
        `Are you sure you want to initialize New Fiscal Year (${resetFyValue})? This will update prefixes and starting numbers for new documents while preserving existing historical records.`
      )
    ) {
      return;
    }
    setResetSubmitting(true);
    try {
      await api.request('/tenant-settings/reset-fiscal-year', {
        method: 'POST',
        body: JSON.stringify({
          newFiscalYear: resetFyValue,
          resetInvoices,
          newInvoiceStartingNumber: resetInvoiceStart,
          newInvoicePrefix: resetInvoicePrefix,
          resetBookings,
          newBookingStartingNumber: resetBookingStart,
          newBookingPrefix: resetBookingPrefix,
          resetDutySlips,
          newDutySlipStartingNumber: resetDutySlipStart,
          newDutySlipPrefix: resetDutySlipPrefix,
        }),
      });
      setResetFyModalOpen(false);
      fetchSettings();
      alert('Fiscal Year successfully updated and document counters reset!');
    } catch (err: any) {
      alert(err.message || 'Failed to reset fiscal year');
    } finally {
      setResetSubmitting(false);
    }
  };

  if (!user) return null;
  const canEdit = user.role === 'SUPER_ADMIN' || user.role === 'OPERATOR_ADMIN';

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">System Settings</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Configure company profile, tax identities, and bank accounts for dynamic invoice and duty slip rendering.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl font-medium flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-emerald-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Navigation Tabs */}
        <aside className="w-full md:w-60 bg-gray-50 border-r border-[#E2E8F0] p-4 flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'profile'
                ? 'bg-blue-50 text-blue-600'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100'
            }`}
          >
            Company Profile
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'tax'
                ? 'bg-blue-50 text-blue-600'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100'
            }`}
          >
            GST & Tax Identity
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'bank'
                ? 'bg-blue-50 text-blue-600'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100'
            }`}
          >
            Bank Accounts
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'pdf'
                ? 'bg-blue-50 text-blue-600'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100'
            }`}
          >
            PDF Customization
          </button>
          <button
            onClick={() => setActiveTab('docControl')}
            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'docControl'
                ? 'bg-blue-50 text-blue-600'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100'
            }`}
          >
            Document Control & Fiscal Year
          </button>
        </aside>

        {/* Form Details Area */}
        <div className="flex-1 p-6">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-500 gap-2">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading configuration data...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="h-full flex flex-col justify-between space-y-6">
              {/* TAB CONTENT: PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-[#0F172A]">Company Profile Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-[#475569] uppercase">Operator Brand Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-[#475569] uppercase">Company Logo</label>
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex-1 w-full space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'logoUrl')}
                            disabled={!canEdit || uploadingLogo}
                            className="block w-full text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border file:border-blue-100
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
                          />
                          <input
                            type="text"
                            name="logoUrl"
                            value={formData.logoUrl}
                            onChange={handleChange}
                            disabled={!canEdit}
                            placeholder="Or enter logo URL manually"
                            className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        {formData.logoUrl && (
                          <div className="relative group shrink-0">
                            <img
                              src={formData.logoUrl}
                              alt="Logo preview"
                              className="w-20 h-20 object-contain border border-[#E2E8F0] rounded-lg bg-gray-50 p-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-[#475569] uppercase">Digital Signature of Tenant</label>
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex-1 w-full space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'digitalSignatureUrl')}
                            disabled={!canEdit || uploadingSignature}
                            className="block w-full text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border file:border-blue-100
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
                          />
                          <input
                            type="text"
                            name="digitalSignatureUrl"
                            value={formData.digitalSignatureUrl}
                            onChange={handleChange}
                            disabled={!canEdit}
                            placeholder="Or enter digital signature URL manually"
                            className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        {formData.digitalSignatureUrl && (
                          <div className="relative group shrink-0">
                            <img
                              src={formData.digitalSignatureUrl}
                              alt="Signature preview"
                              className="w-20 h-20 object-contain border border-[#E2E8F0] rounded-lg bg-gray-50 p-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Contact Email</label>
                      <input
                        type="email"
                        name="companyEmail"
                        value={formData.companyEmail}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Contact Phone numbers</label>
                      <input
                        type="text"
                        name="companyPhone"
                        value={formData.companyPhone}
                        onChange={handleChange}
                        disabled={!canEdit}
                        placeholder="Comma separated if multiple"
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-[#475569] uppercase">Company Address</label>
                      <textarea
                        name="companyAddress"
                        value={formData.companyAddress}
                        onChange={handleChange}
                        disabled={!canEdit}
                        rows={3}
                        placeholder="Full registered address"
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: TAX */}
              {activeTab === 'tax' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-[#0F172A]">GST & Corporate Identification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">GSTIN (Indian GST Number)</label>
                      <input
                        type="text"
                        name="companyGst"
                        value={formData.companyGst}
                        onChange={handleChange}
                        disabled={!canEdit}
                        placeholder="e.g. 07CICPS3802E2ZH"
                        maxLength={15}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">PAN Number</label>
                      <input
                        type="text"
                        name="companyPan"
                        value={formData.companyPan}
                        onChange={handleChange}
                        disabled={!canEdit}
                        placeholder="Auto-derived from GSTIN"
                        maxLength={10}
                        className="w-full border border-[#E2E8F0] bg-gray-50 rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">SAC Code</label>
                      <input
                        type="text"
                        name="sacNo"
                        value={formData.sacNo}
                        onChange={handleChange}
                        disabled={!canEdit}
                        placeholder="default: 9966"
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Service Category</label>
                      <input
                        type="text"
                        name="serviceCategory"
                        value={formData.serviceCategory}
                        onChange={handleChange}
                        disabled={!canEdit}
                        placeholder="default: Rent-A-Cab"
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: BANK */}
              {activeTab === 'bank' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-[#0F172A]">Default Bank Account (For Invoice Payments)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-[#475569] uppercase">Account Holder Name</label>
                      <input
                        type="text"
                        name="bankAccountHolder"
                        value={formData.bankAccountHolder}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Bank Name</label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Branch Name</label>
                      <input
                        type="text"
                        name="bankBranch"
                        value={formData.bankBranch}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Account Number</label>
                      <input
                        type="text"
                        name="bankAccountNo"
                        value={formData.bankAccountNo}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">IFSC Code (Bank Swift)</label>
                      <input
                        type="text"
                        name="bankIfsc"
                        value={formData.bankIfsc}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PDF CUSTOMIZATION */}
              {activeTab === 'pdf' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-[#0F172A]">PDF Title & Style Customization</h3>
                  
                  {/* Color Customization Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 border border-[#E2E8F0] rounded-xl">
                    {/* Primary Brand Color */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#475569] uppercase">Primary Brand Accent Color</label>
                      <span className="block text-[10px] text-[#64748B]">Used for totals, borders, and invoice highlights</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          name="pdfColorPrimary"
                          value={formData.pdfColorPrimary}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="h-9 w-12 cursor-pointer border border-[#E2E8F0] rounded bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          name="pdfColorPrimary"
                          value={formData.pdfColorPrimary}
                          onChange={handleChange}
                          disabled={!canEdit}
                          maxLength={7}
                          className="w-24 border border-[#E2E8F0] bg-white rounded-lg p-1.5 text-xs text-[#0F172A] font-mono uppercase focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Company Name Heading Color */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#475569] uppercase">Main Company Name Heading Color</label>
                      <span className="block text-[10px] text-[#64748B]">Used for top company brand title text</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          name="pdfColorCompanyName"
                          value={formData.pdfColorCompanyName}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="h-9 w-12 cursor-pointer border border-[#E2E8F0] rounded bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          name="pdfColorCompanyName"
                          value={formData.pdfColorCompanyName}
                          onChange={handleChange}
                          disabled={!canEdit}
                          maxLength={7}
                          className="w-24 border border-[#E2E8F0] bg-white rounded-lg p-1.5 text-xs text-[#0F172A] font-mono uppercase focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Table Column Header Background Color */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#475569] uppercase">Table Header Bar Background</label>
                      <span className="block text-[10px] text-[#64748B]">Background fill color for table column header bar</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          name="pdfColorTableHeaderBg"
                          value={formData.pdfColorTableHeaderBg}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="h-9 w-12 cursor-pointer border border-[#E2E8F0] rounded bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          name="pdfColorTableHeaderBg"
                          value={formData.pdfColorTableHeaderBg}
                          onChange={handleChange}
                          disabled={!canEdit}
                          maxLength={7}
                          className="w-24 border border-[#E2E8F0] bg-white rounded-lg p-1.5 text-xs text-[#0F172A] font-mono uppercase focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Table Column Header Text Color */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#475569] uppercase">Table Header Bar Text Color</label>
                      <span className="block text-[10px] text-[#64748B]">Text color for column headers (e.g. Date, Particulars, Rate)</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          name="pdfColorTableHeaderText"
                          value={formData.pdfColorTableHeaderText}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="h-9 w-12 cursor-pointer border border-[#E2E8F0] rounded bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          name="pdfColorTableHeaderText"
                          value={formData.pdfColorTableHeaderText}
                          onChange={handleChange}
                          disabled={!canEdit}
                          maxLength={7}
                          className="w-24 border border-[#E2E8F0] bg-white rounded-lg p-1.5 text-xs text-[#0F172A] font-mono uppercase focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bill Numbering Configuration Section */}
                  <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Bill Numbering & Serial Sequence</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#475569] uppercase">Bill Number Prefix</label>
                        <input
                          type="text"
                          name="invoicePrefix"
                          value={formData.invoicePrefix || ''}
                          onChange={handleChange}
                          disabled={!canEdit}
                          placeholder="e.g. INV-2026-"
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <span className="text-[10px] text-slate-500">e.g. INV-2026- will produce INV-2026-1001</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#475569] uppercase">Bill Starting Serial Number</label>
                        <input
                          type="number"
                          name="invoiceStartingNumber"
                          value={formData.invoiceStartingNumber || 1001}
                          onChange={handleChange}
                          disabled={!canEdit}
                          placeholder="1001"
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <span className="text-[10px] text-slate-500">Starting sequence counter for new bills</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Theme Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Design Template Theme</label>
                      <select
                        name="pdfTheme"
                        value={formData.pdfTheme}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      >
                        <option value="MODERN">Modern (Clean & Borderless)</option>
                        <option value="CLASSIC">Classic (Serif & Centered)</option>
                        <option value="REFINED">Refined (Accent highlights & double lines)</option>
                      </select>
                    </div>

                    {/* Font Family Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Typography Font Family</label>
                      <select
                        name="pdfFontFamily"
                        value={formData.pdfFontFamily}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono"
                      >
                        <option value="Helvetica">Helvetica (Sans-Serif)</option>
                        <option value="Times-Roman">Times New Roman (Elegant Serif)</option>
                        <option value="Courier">Courier (Monospace Code-like)</option>
                      </select>
                    </div>

                    {/* Header Layout Select */}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-[#475569] uppercase">Header Layout Style</label>
                      <select
                        name="pdfHeaderLayout"
                        value={formData.pdfHeaderLayout}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      >
                        <option value="SINGLE_LINE">Single Line (Company Left, Title Right)</option>
                        <option value="STACKED">Stacked (Company Left, Subtitle Below)</option>
                        <option value="SPLIT">Split Brand (Company Details Left, Cabs Logo Right)</option>
                      </select>
                    </div>

                    {/* PDF Titles */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Invoice Custom Title</label>
                      <input
                        type="text"
                        name="invoiceTitle"
                        value={formData.invoiceTitle}
                        onChange={handleChange}
                        disabled={!canEdit}
                        placeholder="default: TAX INVOICE"
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Duty Slip Custom Title</label>
                      <input
                        type="text"
                        name="dutySlipTitle"
                        value={formData.dutySlipTitle}
                        onChange={handleChange}
                        disabled={!canEdit}
                        placeholder="default: TRIP OPERATIONAL DUTY SLIP"
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Visibility Section Toggles */}
                    <div className="col-span-2 space-y-2 py-2 border-t border-b border-gray-100 my-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pdfShowBank"
                          name="pdfShowBank"
                          checked={formData.pdfShowBank}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="pdfShowBank" className="text-sm font-semibold text-[#334155] select-none cursor-pointer">
                          Show Bank account details on invoice footer
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pdfShowTerms"
                          name="pdfShowTerms"
                          checked={formData.pdfShowTerms}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="pdfShowTerms" className="text-sm font-semibold text-[#334155] select-none cursor-pointer">
                          Show Terms & Conditions on invoice footer
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="hideLogoOnPdf"
                          name="hideLogoOnPdf"
                          checked={formData.hideLogoOnPdf}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="hideLogoOnPdf" className="text-sm font-semibold text-[#334155] select-none cursor-pointer">
                          Force hide logo image on generated PDFs (even when Logo Layout is selected)
                        </label>
                      </div>
                    </div>

                    {/* Terms and Conditions block */}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-[#475569] uppercase">Custom Invoice Terms & Conditions</label>
                      <textarea
                        name="termsAndConditions"
                        value={formData.termsAndConditions}
                        onChange={handleChange}
                        disabled={!canEdit}
                        rows={4}
                        placeholder="Enter custom Terms & Conditions text block..."
                        className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 resize-none font-sans"
                      />
                    </div>
                  </div>

                  {/* LIVE SAMPLE PDF PREVIEW */}
                  <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                          <span>📄</span> Live Sample Invoice PDF Preview
                        </h4>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Real-time document preview showing your customized brand colors, table header bars, typography, title headers, and footer blocks.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-200/50 uppercase tracking-wider">
                        Live Preview
                      </span>
                    </div>

                    {/* Simulated Paper Document */}
                    <div className="bg-slate-100 p-4 sm:p-6 rounded-2xl border border-slate-200 overflow-x-auto">
                      <div
                        className="bg-white shadow-xl rounded-lg p-6 sm:p-8 max-w-3xl mx-auto border border-slate-200 text-[#0F172A] text-xs space-y-4 transition-all duration-200"
                        style={{
                          fontFamily:
                            formData.pdfFontFamily === 'Times-Roman'
                              ? 'Georgia, serif'
                              : formData.pdfFontFamily === 'Courier'
                              ? 'Courier New, monospace'
                              : 'Inter, sans-serif',
                        }}
                      >
                        {/* Header Branding */}
                        <div className="border-b border-slate-200 pb-4 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            {/* Logo */}
                            {!formData.hideLogoOnPdf && (
                              <div className="w-20 h-10 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                {formData.logoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                                ) : (
                                  'LOGO'
                                )}
                              </div>
                            )}

                            {/* Centered Title & Company Name */}
                            <div className="flex-1 text-center space-y-1">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 underline">
                                {formData.invoiceTitle || 'TAX INVOICE'}
                              </div>
                              <h2
                                className="text-2xl font-black tracking-tight uppercase"
                                style={{ color: formData.pdfColorCompanyName || '#E11D48' }}
                              >
                                {formData.name || 'ACME CABS'}
                              </h2>
                            </div>

                            <div className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              ORIGINAL
                            </div>
                          </div>

                          {/* Company Details Strip */}
                          <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-50 p-2.5 rounded border border-slate-100">
                            <div>
                              <span className="font-bold text-slate-700 block">GSTIN: <span className="font-normal text-slate-900">{formData.companyGst || '07CICPS3802E2ZH'}</span></span>
                              <span className="font-bold text-slate-700 block">SAC NO.: <span className="font-normal text-slate-900">{formData.sacNo || '9966'}</span></span>
                              <span className="font-bold text-slate-700 block">PAN NO.: <span className="font-normal text-slate-900">{formData.companyPan || 'CICPS3802E'}</span></span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-700 block">Address:</span>
                              <span className="text-slate-900 leading-tight block whitespace-pre-line leading-relaxed break-words">{formData.companyAddress || 'E57/A, HARI NAGAR EXTN, NEW DELHI'}</span>
                              <span className="font-bold text-slate-700 block mt-0.5">Email: <span className="font-normal text-slate-900">{formData.companyEmail || 'billing@acmecabs.com'}</span></span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-700 block">Contact No.:</span>
                              <span className="text-slate-900 block">{formData.companyPhone || '9310632440'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Client Info Block */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-3 rounded border border-slate-200 text-[10px]">
                          <div>
                            <span className="font-bold text-slate-700">Client Name : </span>
                            <span className="font-semibold text-slate-900">Acme Corp</span>
                            <br />
                            <span className="font-bold text-slate-700">Address : </span>
                            <span className="text-slate-900">123 Business Tower, Delhi, India</span>
                            <br />
                            <span className="font-bold text-slate-700">G.S.T. IN : </span>
                            <span className="text-slate-900">07AAAAA1111A1Z1</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-700">Bill No. : </span>
                            <span className="font-semibold text-slate-900">1</span>
                            <br />
                            <span className="font-bold text-slate-700">Bill Date : </span>
                            <span className="text-slate-900">22/07/2026</span>
                          </div>
                        </div>

                        {/* TABLE SECTION (FULLY CUSTOMIZABLE COLOR HEADER BAR & TEXT) */}
                        <div className="border border-slate-200 rounded overflow-hidden">
                          {/* Table Header Bar with Dynamic Hex Colors */}
                          <div
                            className="grid grid-cols-12 px-3 py-2 font-bold text-[10px] tracking-wide"
                            style={{
                              backgroundColor: formData.pdfColorTableHeaderBg || formData.pdfColorPrimary || '#1E3A8A',
                              color: formData.pdfColorTableHeaderText || '#FFFFFF',
                            }}
                          >
                            <div className="col-span-2 text-center">Date/D.S. No.</div>
                            <div className="col-span-2 text-center">Vehicle Detail</div>
                            <div className="col-span-5">Duty Description / Particulars</div>
                            <div className="col-span-1 text-right">Rate</div>
                            <div className="col-span-2 text-right">Amount</div>
                          </div>

                          {/* Item 1 */}
                          <div className="grid grid-cols-12 px-3 py-2.5 text-[10px] border-b border-slate-100 bg-white">
                            <div className="col-span-2 text-center font-bold text-slate-900">
                              10/06/2026
                              <span className="block font-normal text-slate-600">1001</span>
                            </div>
                            <div className="col-span-2 text-center font-bold text-slate-900">
                              MARUTI
                              <span className="block font-normal text-slate-600">1111</span>
                            </div>
                            <div className="col-span-5 space-y-0.5 text-slate-800">
                              <span className="font-semibold block text-slate-900">Guest - Acme Corp</span>
                              <span className="block text-slate-600 text-[9px]">LOCAL : 85 Kms & 8.00 Hrs. Duty</span>
                              <div className="pl-2 space-y-0.5 text-[9px]">
                                <div className="flex justify-between">
                                  <span>UPTO 80 Kms. & 8 Hrs Duty</span>
                                  <span className="font-mono">1800.00</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>Extra Km 5.00 @ 14.00</span>
                                  <span className="font-mono">70.00</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>DRIVER ALLOWANCE 1 @ 250.00</span>
                                  <span className="font-mono">250.00</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>Parking Charges</span>
                                  <span className="font-mono">80.00</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>Toll Charges</span>
                                  <span className="font-mono">120.00</span>
                                </div>
                              </div>
                              <div
                                className="font-bold pt-1 flex justify-between border-t border-slate-100 mt-1"
                                style={{ color: formData.pdfColorPrimary || '#1E3A8A' }}
                              >
                                <span>DUTY SLIP TOTAL</span>
                                <span className="font-mono">2320.00</span>
                              </div>
                            </div>
                            <div className="col-span-1 text-right font-mono text-slate-600">1800.00</div>
                            <div className="col-span-2 text-right font-mono font-bold text-slate-900">2320.00</div>
                          </div>

                          {/* Item 2 */}
                          <div className="grid grid-cols-12 px-3 py-2.5 text-[10px] bg-slate-50/50">
                            <div className="col-span-2 text-center font-bold text-slate-900">
                              11/06/2026
                              <span className="block font-normal text-slate-600">1002</span>
                            </div>
                            <div className="col-span-2 text-center font-bold text-slate-900">
                              TOYOTA
                              <span className="block font-normal text-slate-600">9999</span>
                            </div>
                            <div className="col-span-5 space-y-0.5 text-slate-800">
                              <span className="font-semibold block text-slate-900">Guest - Acme Corp</span>
                              <span className="block text-slate-600 text-[9px]">LOCAL : 90 Kms & 8.00 Hrs. Duty</span>
                              <div className="pl-2 space-y-0.5 text-[9px]">
                                <div className="flex justify-between">
                                  <span>UPTO 80 Kms. & 8 Hrs Duty</span>
                                  <span className="font-mono">2400.00</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>Extra Km 10.00 @ 18.00</span>
                                  <span className="font-mono">180.00</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>DRIVER ALLOWANCE 1 @ 250.00</span>
                                  <span className="font-mono">250.00</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>Parking Charges</span>
                                  <span className="font-mono">100.00</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>Toll Charges</span>
                                  <span className="font-mono">150.00</span>
                                </div>
                              </div>
                              <div
                                className="font-bold pt-1 flex justify-between border-t border-slate-100 mt-1"
                                style={{ color: formData.pdfColorPrimary || '#1E3A8A' }}
                              >
                                <span>DUTY SLIP TOTAL</span>
                                <span className="font-mono">3080.00</span>
                              </div>
                            </div>
                            <div className="col-span-1 text-right font-mono text-slate-600">2400.00</div>
                            <div className="col-span-2 text-right font-mono font-bold text-slate-900">3080.00</div>
                          </div>
                        </div>

                        {/* Summary & Totals */}
                        <div className="flex justify-end text-[10px]">
                          <div className="w-64 space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="flex justify-between text-slate-700">
                              <span>Sub Total:</span>
                              <span className="font-mono font-semibold">₹5,400.00</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>CGST (2.5%):</span>
                              <span className="font-mono">₹135.00</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>SGST (2.5%):</span>
                              <span className="font-mono">₹135.00</span>
                            </div>
                            <div
                              className="flex justify-between font-bold text-xs pt-1.5 border-t border-slate-300"
                              style={{ color: formData.pdfColorPrimary || '#1E3A8A' }}
                            >
                              <span>Grand Total:</span>
                              <span className="font-mono">₹5,670.00</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer: Bank Details */}
                        {formData.pdfShowBank && (
                          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded text-[9px] text-slate-700 space-y-1">
                            <span className="font-bold uppercase tracking-wider block" style={{ color: formData.pdfColorPrimary || '#1E3A8A' }}>
                              Bank Account Details
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span>Bank: <strong className="text-slate-900">{formData.bankName || 'HDFC Bank'}</strong></span>
                                <span className="block">Branch: {formData.bankBranch || 'Connaught Place'}</span>
                              </div>
                              <div>
                                <span>A/C No: <strong className="text-slate-900">{formData.bankAccountNo || '5010023456789'}</strong></span>
                                <span className="block">IFSC: {formData.bankIfsc || 'HDFC0000123'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Footer: Terms & Conditions */}
                        {formData.pdfShowTerms && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[9px] text-slate-600 space-y-0.5">
                            <span className="font-bold text-slate-900 uppercase block">Terms & Conditions</span>
                            <p className="whitespace-pre-line leading-relaxed">
                              {formData.termsAndConditions || '1. Payment due within 15 days of invoice date.\n2. All disputes subject to local jurisdiction.'}
                            </p>
                          </div>
                        )}

                        {/* Footer: Digital Signature & Authorized Signatory */}
                        <div className="flex items-end justify-between pt-4 border-t border-slate-200 text-[10px]">
                          <div className="text-slate-500 space-y-0.5">
                            <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                              Company Details Verification
                            </span>
                            <span className="block text-[9px]">Service Category: {formData.serviceCategory || 'Rent-A-Cab'}</span>
                            <span className="block text-[9px]">State Code: {formData.companyGst ? formData.companyGst.substring(0, 2) : '07'}</span>
                          </div>

                          <div className="text-center space-y-1">
                            {formData.digitalSignatureUrl ? (
                              <div className="h-12 w-36 border border-dashed border-slate-300 rounded bg-slate-50 p-1 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={formData.digitalSignatureUrl}
                                  alt="Digital Signature"
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-36 border border-dashed border-slate-300 rounded bg-slate-50 flex flex-col items-center justify-center text-[9px] text-slate-400">
                                <span>✍️ Digital Signature</span>
                                <span className="text-[8px] text-slate-400">Upload signature above</span>
                              </div>
                            )}
                            <span
                              className="font-bold block text-slate-900 uppercase tracking-wider text-[9px] pt-0.5"
                              style={{ color: formData.pdfColorPrimary || '#1E3A8A' }}
                            >
                              Authorized Signatory
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: DOCUMENT CONTROL & FISCAL YEAR */}
              {activeTab === 'docControl' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8F0] pb-3 gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#0F172A]">Document Control & Fiscal Year Management</h3>
                      <p className="text-xs text-[#64748B]">Configure prefixes, starting numbers, titles, and annual fiscal year resets.</p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setResetFyModalOpen(true)}
                        className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Start New Fiscal Year & Reset Sequences
                      </button>
                    )}
                  </div>

                  {/* Bill / Invoice Controls */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      Bill / Tax Invoice Document Controls
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Invoice Main Heading / Title</label>
                        <input
                          type="text"
                          name="invoiceTitle"
                          value={formData.invoiceTitle}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1"
                          placeholder="e.g. TAX INVOICE"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Invoice Number Prefix / Template</label>
                        <input
                          type="text"
                          name="invoicePrefix"
                          value={formData.invoicePrefix}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1 font-mono"
                          placeholder="e.g. TDH-INV-2026- or TDH/2026-27/"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Starting Invoice Counter Number</label>
                        <input
                          type="number"
                          name="invoiceStartingNumber"
                          value={formData.invoiceStartingNumber}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1 font-mono"
                          placeholder="e.g. 1001"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Booking Controls */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
                      </svg>
                      Booking Reference Document Controls
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Booking Number Prefix / Template</label>
                        <input
                          type="text"
                          name="bookingPrefix"
                          value={formData.bookingPrefix}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1 font-mono"
                          placeholder="e.g. BK-2026- or TDH-BK-"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Starting Booking Counter Number</label>
                        <input
                          type="number"
                          name="bookingStartingNumber"
                          value={formData.bookingStartingNumber}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1 font-mono"
                          placeholder="e.g. 1001"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duty Slip Controls */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5h7.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5h-7.5Z" />
                      </svg>
                      Duty Slip Document Controls
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Duty Slip Heading / Title</label>
                        <input
                          type="text"
                          name="dutySlipTitle"
                          value={formData.dutySlipTitle}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1"
                          placeholder="e.g. TRIP OPERATIONAL DUTY SLIP"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Duty Slip Prefix / Template</label>
                        <input
                          type="text"
                          name="dutySlipPrefix"
                          value={formData.dutySlipPrefix}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1 font-mono"
                          placeholder="e.g. DS-2026- or TDH-DS-"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Starting Duty Slip Counter Number</label>
                        <input
                          type="number"
                          name="dutySlipStartingNumber"
                          value={formData.dutySlipStartingNumber}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1 font-mono"
                          placeholder="e.g. 1001"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fiscal Year System Configuration */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-purple-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
                      </svg>
                      Fiscal Year System Configuration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Current Active Fiscal Year</label>
                        <input
                          type="text"
                          name="currentFiscalYear"
                          value={formData.currentFiscalYear}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1 font-mono font-bold"
                          placeholder="e.g. 2026-27"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#475569] uppercase">Fiscal Year Starting Month</label>
                        <select
                          name="fiscalYearStartMonth"
                          value={formData.fiscalYearStartMonth}
                          onChange={handleChange}
                          disabled={!canEdit}
                          className="w-full border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                        >
                          <option value={4}>April (Indian Fiscal Year - Apr to Mar)</option>
                          <option value={1}>January (Calendar Year - Jan to Dec)</option>
                          <option value={7}>July (Mid-Year - Jul to Jun)</option>
                          <option value={10}>October (Q4 FY - Oct to Sep)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {canEdit && (
                <div className="border-t border-[#E2E8F0] pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    {saving ? 'Saving changes...' : 'Save Settings'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Fiscal Year Reset Modal */}
      {resetFyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-[#E2E8F0] w-full max-w-xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4 bg-[#FAFBFD]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Initialize New Fiscal Year & Reset Sequences</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Set up document prefixes and counters for the upcoming fiscal year.</p>
              </div>
              <button
                type="button"
                onClick={() => setResetFyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleExecuteFiscalYearReset} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800">
                <span className="font-bold block mb-0.5">Fiscal Year Reset Mode:</span>
                This will set new document prefixes and starting numbers for future Bills, Bookings, and Duty Slips. All historical records remain safely archived!
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Target Fiscal Year</label>
                <input
                  type="text"
                  value={resetFyValue}
                  onChange={(e) => {
                    const fy = e.target.value;
                    setResetFyValue(fy);
                    setResetInvoicePrefix(`TDH-INV-${fy}-`);
                    setResetBookingPrefix(`BK-${fy}-`);
                    setResetDutySlipPrefix(`DS-${fy}-`);
                  }}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono font-bold text-slate-900 focus:border-blue-500"
                  placeholder="e.g. 2027-28"
                />
              </div>

              {/* Invoice Reset Options */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Tax Invoice / Bill Sequence</span>
                  <input
                    type="checkbox"
                    checked={resetInvoices}
                    onChange={(e) => setResetInvoices(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </div>
                {resetInvoices && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">New Invoice Prefix</label>
                      <input
                        type="text"
                        value={resetInvoicePrefix}
                        onChange={(e) => setResetInvoicePrefix(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Starting Counter</label>
                      <input
                        type="number"
                        value={resetInvoiceStart}
                        onChange={(e) => setResetInvoiceStart(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg p-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Reset Options */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Booking Sequence</span>
                  <input
                    type="checkbox"
                    checked={resetBookings}
                    onChange={(e) => setResetBookings(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </div>
                {resetBookings && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">New Booking Prefix</label>
                      <input
                        type="text"
                        value={resetBookingPrefix}
                        onChange={(e) => setResetBookingPrefix(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Starting Counter</label>
                      <input
                        type="number"
                        value={resetBookingStart}
                        onChange={(e) => setResetBookingStart(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg p-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Duty Slip Reset Options */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Duty Slip Sequence</span>
                  <input
                    type="checkbox"
                    checked={resetDutySlips}
                    onChange={(e) => setResetDutySlips(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </div>
                {resetDutySlips && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">New Duty Slip Prefix</label>
                      <input
                        type="text"
                        value={resetDutySlipPrefix}
                        onChange={(e) => setResetDutySlipPrefix(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Starting Counter</label>
                      <input
                        type="number"
                        value={resetDutySlipStart}
                        onChange={(e) => setResetDutySlipStart(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg p-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setResetFyModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-slate-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {resetSubmitting ? 'Initializing...' : 'Execute Fiscal Year Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
