'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full rounded-b-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-blue-500/20">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-[#0F172A]">CABBS</span>
            <span className="text-[9px] font-bold text-blue-600 tracking-widest uppercase">Multi-Tenant SaaS</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#64748B]">
          <a href="#features" className="hover:text-blue-600 transition-colors">Core Features</a>
          <a href="#architecture" className="hover:text-blue-600 transition-colors">SaaS Isolation</a>
          <a href="#plans" className="hover:text-blue-600 transition-colors">Pricing Tiers</a>
        </nav>

        <div className="flex items-center gap-3">
          {loading ? null : isAuthenticated ? (
            <button
              onClick={() => handleNavigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/10 transition"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => handleNavigate('/login')}
                className="px-4 py-2 text-[#475569] hover:text-[#0F172A] font-bold text-xs transition"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNavigate('/register')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/10 transition"
              >
                Register Company
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-[#0F172A]">
            The Quantum Leap in{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Fleet Billing
            </span>
          </h2>
          <p className="text-base text-[#64748B] leading-relaxed max-w-xl mx-auto lg:mx-0">
            A production-ready multi-tenant SaaS platform built for modern travel companies and corporate fleet operators. 
            Isolated environments, automatic GST compliance, duty slip generators, and centralized audit ledgers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            {isAuthenticated ? (
              <button
                onClick={() => handleNavigate('/dashboard')}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
              >
                <span>Access Console</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNavigate('/register')}
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition"
                >
                  Spin Up SaaS Instance
                </button>
                <button
                  onClick={() => handleNavigate('/login')}
                  className="w-full sm:w-auto px-8 py-3.5 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#475569] font-bold rounded-xl text-sm transition"
                >
                  Operator Sign In
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hero Illustration / Dashboard Preview */}
        <div className="flex-1 w-full max-w-[540px] lg:max-w-none">
          <div className="relative bg-white border border-[#E2E8F0] rounded-2xl shadow-xl p-6 md:p-8 flex flex-col gap-6 overflow-hidden">
            {/* Visual Glassmorphism Background Accent */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/10 blur-3xl rounded-full" />
            
            {/* Mock Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2.5 py-0.5 rounded-full">
                ACTIVE INSTANCE
              </span>
            </div>

            {/* Mock Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50/50 border border-[#E2E8F0] rounded-xl">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Fleet Capacity</span>
                <span className="text-2xl font-black text-[#0F172A] block mt-1">48 Cabs</span>
              </div>
              <div className="p-4 bg-gray-50/50 border border-[#E2E8F0] rounded-xl">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Monthly Revenue</span>
                <span className="text-2xl font-black text-[#0F172A] block mt-1">INR 4.2L</span>
              </div>
            </div>

            {/* Mock List */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide block">Recent Generated Invoices</span>
              <div className="flex items-center justify-between p-3 border border-emerald-100 bg-emerald-50/10 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-[#0F172A]">INV-2026-1184</span>
                  <span className="block text-[10px] text-[#64748B] mt-0.5">Travel Dream Holiday</span>
                </div>
                <span className="font-extrabold text-[#0F172A]">INR 12,480</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-[#E2E8F0] bg-white rounded-xl text-xs">
                <div>
                  <span className="font-bold text-[#0F172A]">INV-2026-1183</span>
                  <span className="block text-[10px] text-[#64748B] mt-0.5">Acme Operators</span>
                </div>
                <span className="font-extrabold text-[#0F172A]">INR 8,640</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="bg-white border-t border-[#E2E8F0] py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A]">
              Engineered for Complete Tenant Isolation
            </h3>
            <p className="text-sm text-[#64748B]">
              Your business records are critical. Our multi-tenant middleware guarantees absolute data separation and platform compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h4 className="font-bold text-sm text-[#0F172A]">Logical Data Isolation</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Prisma database row-level injection intercepts all operations, making cross-company data leakage mathematically impossible.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25" />
                </svg>
              </div>
              <h4 className="font-bold text-sm text-[#0F172A]">Interactive Duty Slips</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Print high-fidelity duty slips with custom headers, or compile them dynamically as PDF documents hosted on AWS S3 storage.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </div>
              <h4 className="font-bold text-sm text-[#0F172A]">Tax Configuration Rules</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Configure intrastate (CGST/SGST) and interstate (IGST) taxation templates per tenant to ensure accurate corporate billing.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h4 className="font-bold text-sm text-[#0F172A]">Central Audit Ledgers</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Platform actions write to immutable logs mapping IP addresses, previous record states, and current operators dynamically.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6 border-t border-gray-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span>© 2026 CABBS Cab Billing System. All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
