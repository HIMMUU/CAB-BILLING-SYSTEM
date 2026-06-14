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
    pdfFontFamily: 'Helvetica',
    pdfShowBank: true,
    pdfShowTerms: true,
    pdfHeaderLayout: 'SINGLE_LINE',
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'tax' | 'bank' | 'pdf'>('profile');

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
        pdfFontFamily: settings.pdfFontFamily || 'Helvetica',
        pdfShowBank: settings.pdfShowBank !== false,
        pdfShowTerms: settings.pdfShowTerms !== false,
        pdfHeaderLayout: settings.pdfHeaderLayout || 'SINGLE_LINE',
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
                  
                  {/* Hex Color Accent Picker */}
                  <div className="p-4 bg-gray-50 border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#475569] uppercase">Primary Brand Color</label>
                      <span className="text-xs text-[#64748B]">Used for PDF text headers, accents, and summary highlights</span>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
                      <input
                        type="color"
                        name="pdfColorPrimary"
                        value={formData.pdfColorPrimary}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="h-10 w-16 cursor-pointer border border-[#E2E8F0] rounded bg-transparent"
                      />
                      <input
                        type="text"
                        name="pdfColorPrimary"
                        value={formData.pdfColorPrimary}
                        onChange={handleChange}
                        disabled={!canEdit}
                        maxLength={7}
                        className="w-24 border border-[#E2E8F0] bg-white rounded-lg p-2 text-sm text-[#0F172A] font-mono focus:outline-none focus:border-blue-500 uppercase"
                      />
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
    </main>
  );
}
