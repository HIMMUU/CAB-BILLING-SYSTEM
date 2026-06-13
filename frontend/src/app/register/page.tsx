'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyGst: '',
    subscriptionPlan: 'Growth', // Recommended default
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (api.getToken()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectPlan = (plan: string) => {
    setFormData((prev) => ({ ...prev, subscriptionPlan: plan }));
  };

  const validateStep1 = () => {
    if (!formData.companyName || !formData.companyEmail || !formData.companyPhone) {
      setError('Please fill in the required company details');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.companyEmail)) {
      setError('Please enter a valid company email');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep3 = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all administrator credentials');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid administrator email');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleUseCompanyEmail = () => {
    setFormData((prev) => ({ ...prev, email: prev.companyEmail }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);
    setError(null);

    try {
      const { confirmPassword, ...registerPayload } = formData;
      await api.register(registerPayload);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Onboarding registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F8FAFC] py-12 px-4 font-sans">
      <div className="w-full max-w-[700px] bg-white border border-[#E2E8F0] rounded-2xl shadow-md p-8 md:p-10 flex flex-col transition-all duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shadow-sm mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75a.75.75 0 0 0 .75.75Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            SaaS Fleet Onboarding
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Register your travel company and spin up your isolated billing platform
          </p>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center text-xs font-bold text-[#64748B] mb-2 px-1">
            <span className={step >= 1 ? 'text-blue-600' : ''}>1. COMPANY DETAILS</span>
            <span className={step >= 2 ? 'text-blue-600' : ''}>2. SELECT PLAN</span>
            <span className={step >= 3 ? 'text-blue-600' : ''}>3. ADMIN ACCOUNT</span>
          </div>
          <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${step === 1 ? 33.3 : step === 2 ? 66.6 : 100}%` }}
            />
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-rose-600 shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-rose-800 leading-normal font-semibold">{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider mb-2 border-b border-[#E2E8F0] pb-2">
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="companyName">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Travel Dream Holiday"
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="companyEmail">
                    Company Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="companyEmail"
                    name="companyEmail"
                    type="email"
                    required
                    value={formData.companyEmail}
                    onChange={handleChange}
                    placeholder="info@company.com"
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="companyPhone">
                    Company Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="companyPhone"
                    name="companyPhone"
                    type="text"
                    required
                    value={formData.companyPhone}
                    onChange={handleChange}
                    placeholder="e.g. +91 99999 88888"
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="companyGst">
                    GST Number
                  </label>
                  <input
                    id="companyGst"
                    name="companyGst"
                    type="text"
                    value={formData.companyGst}
                    onChange={handleChange}
                    placeholder="Optional (15 digits GSTIN)"
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="companyAddress">
                    Company Address
                  </label>
                  <textarea
                    id="companyAddress"
                    name="companyAddress"
                    value={formData.companyAddress}
                    onChange={handleChange}
                    placeholder="Enter registered head office address"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider mb-2 border-b border-[#E2E8F0] pb-2">
                Choose Subscription Plan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Starter Plan */}
                <div 
                  onClick={() => handleSelectPlan('Starter')}
                  className={`p-5 border rounded-xl cursor-pointer transition flex flex-col justify-between ${
                    formData.subscriptionPlan === 'Starter'
                      ? 'border-blue-600 bg-blue-50/10 shadow-sm ring-1 ring-blue-600'
                      : 'border-[#E2E8F0] bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A]">Starter Plan</h4>
                    <p className="text-[10px] text-[#64748B] mt-1">Ideal for small or local operators starting out.</p>
                  </div>
                  <div className="mt-4">
                    <span className="text-lg font-extrabold text-[#0F172A]">INR 2,999</span>
                    <span className="text-[9px] text-[#64748B] block mt-0.5">per month, billed yearly</span>
                  </div>
                  <div className="mt-4 border-t border-[#E2E8F0] pt-3 text-[10px] text-[#475569] space-y-1">
                    <div>✓ Up to 10 Vehicles</div>
                    <div>✓ 5 Operator Accounts</div>
                    <div>✓ PDF Receipts</div>
                  </div>
                </div>

                {/* Growth Plan (Recommended) */}
                <div 
                  onClick={() => handleSelectPlan('Growth')}
                  className={`relative p-5 border rounded-xl cursor-pointer transition flex flex-col justify-between ${
                    formData.subscriptionPlan === 'Growth'
                      ? 'border-blue-600 bg-blue-50/10 shadow-sm ring-1 ring-blue-600'
                      : 'border-[#E2E8F0] bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <span className="absolute -top-2.5 right-4 bg-blue-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    RECOMMENDED
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A]">Growth Plan</h4>
                    <p className="text-[10px] text-[#64748B] mt-1">For expanding fleets requiring full billing automation.</p>
                  </div>
                  <div className="mt-4">
                    <span className="text-lg font-extrabold text-[#0F172A]">INR 6,999</span>
                    <span className="text-[9px] text-[#64748B] block mt-0.5">per month, billed yearly</span>
                  </div>
                  <div className="mt-4 border-t border-[#E2E8F0] pt-3 text-[10px] text-[#475569] space-y-1">
                    <div>✓ Up to 50 Vehicles</div>
                    <div>✓ 20 Operator Accounts</div>
                    <div>✓ Advanced GST Invoicing</div>
                    <div>✓ Custom Rate Cards</div>
                  </div>
                </div>

                {/* Enterprise Plan */}
                <div 
                  onClick={() => handleSelectPlan('Enterprise')}
                  className={`p-5 border rounded-xl cursor-pointer transition flex flex-col justify-between ${
                    formData.subscriptionPlan === 'Enterprise'
                      ? 'border-blue-600 bg-blue-50/10 shadow-sm ring-1 ring-blue-600'
                      : 'border-[#E2E8F0] bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A]">Enterprise</h4>
                    <p className="text-[10px] text-[#64748B] mt-1">For corporate transporters requiring absolute scale.</p>
                  </div>
                  <div className="mt-4">
                    <span className="text-lg font-extrabold text-[#0F172A]">INR 14,999</span>
                    <span className="text-[9px] text-[#64748B] block mt-0.5">per month, billed yearly</span>
                  </div>
                  <div className="mt-4 border-t border-[#E2E8F0] pt-3 text-[10px] text-[#475569] space-y-1">
                    <div>✓ Unlimited Vehicles</div>
                    <div>✓ Unlimited Operators</div>
                    <div>✓ Premium 24/7 Support</div>
                    <div>✓ Custom Subdomains</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                  Create Administrator User
                </h3>
                <button
                  type="button"
                  onClick={handleUseCompanyEmail}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition"
                >
                  Use Company Email
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="e.g. Rahul"
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="e.g. Sharma"
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="email">
                    Admin Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@company.com"
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1" htmlFor="confirmPassword">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-[#E2E8F0] pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-[#64748B]">
            Already onboarding? <a href="/login" className="text-blue-600 font-bold hover:underline">Sign In here</a>
          </span>
          <div className="flex gap-3 w-full sm:w-auto">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={loading}
                className="w-full sm:w-auto py-2.5 px-6 border border-[#E2E8F0] hover:bg-gray-50 text-[#475569] font-bold rounded-xl text-sm transition"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto py-2.5 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition flex items-center justify-center"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto py-2.5 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deploying SaaS Portal...</span>
                  </>
                ) : (
                  <span>Launch Portal</span>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
