'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'duty-slips' | 'rate-cards' | 'invoicing' | 'fleet'>('duty-slips');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const steps = [
    {
      step: 1,
      title: 'Create Booking & Dispatch Vehicle',
      tag: 'Dispatch Stage',
      desc: 'Select a corporate customer or guest, pick a registered vehicle or direct cab, and assign a driver with instant mobile notifications.',
      highlight: 'Auto-fetches Customer Rate Cards & Vehicle Categories',
      metrics: { cabs: '54 Available', driver: 'Vijay Singh', vehicle: 'DL1CA9999 (Innova Crysta)' }
    },
    {
      step: 2,
      title: 'Log Duty Slip Start & End Metrics',
      tag: 'Trip Execution',
      desc: 'Record actual Start KM & Time when duty commences, and End KM & Time upon trip completion. Auto-detects night hours and outstation trips.',
      highlight: 'Smart Auto-Toggle for Night Allowance & Driver Allowance',
      metrics: { startKm: '100.00 KM', endKm: '220.00 KM', totalHrs: '11.0 Hours' }
    },
    {
      step: 3,
      title: 'Automated Rate Matrix Calculation',
      tag: 'Rate Engine',
      desc: 'System applies customer rate cards (e.g. 8h/80km Base Fare + Extra KM @ ₹11/km + Extra Hours @ ₹90/hr) with manual override safety controls.',
      highlight: 'Zero Billing Errors — 100% Contract Compliance',
      metrics: { baseFare: '₹1,600', extraKm: '₹440 (40 km)', extraHrs: '₹270 (3 hrs)' }
    },
    {
      step: 4,
      title: 'One-Click GST Invoice & PDF Generation',
      tag: 'Billing & Audit',
      desc: 'Consolidate single or multiple closed duty slips into an official GST Invoice. Auto-calculates Intra-state CGST+SGST (5%) or Inter-state IGST with RCM support.',
      highlight: 'Download High-Fidelity PDF Duty Slips & GST Tax Bills',
      metrics: { subtotal: '₹2,310', gst: '₹115.50 (5%)', grandTotal: '₹2,425.50' }
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900 relative overflow-x-hidden">
      
      {/* Soft Background Accents */}
      <div className="absolute top-0 left-1/3 -translate-x-1/2 w-[700px] h-[700px] bg-blue-400/10 blur-[150px] rounded-full pointer-events-none animate-pulse-glow" />
      <div className="absolute top-[35%] right-10 w-[600px] h-[600px] bg-indigo-400/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[700px] h-[700px] bg-emerald-400/10 blur-[170px] rounded-full pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
              C
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-[#0F172A] flex items-center gap-2">
                CABBS
                <span className="text-[10px] font-extrabold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ERP v2.4
                </span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Multi-Tenant Cab Billing System</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#interactive-showcase" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Interactive Showcase
            </a>
            <a href="#workflow-simulator" className="hover:text-blue-600 transition-colors">4-Step Workflow</a>
            <a href="#features" className="hover:text-blue-600 transition-colors">Core Modules</a>
            <a href="#saas-architecture" className="hover:text-blue-600 transition-colors">Enterprise Security</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {loading ? null : isAuthenticated ? (
              <button
                onClick={() => handleNavigate('/dashboard')}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
              >
                <span>Access Console</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNavigate('/login')}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-xs transition cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavigate('/register')}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  Register Enterprise SaaS
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto w-full px-6 pt-16 pb-24 flex flex-col lg:flex-row items-center gap-14">
        
        {/* Left Column Text */}
        <div className="flex-1 space-y-7 text-center lg:text-left">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold animate-float">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>Built for Fleet Operators, Travel Agencies & Corporate Mobility</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-[#0F172A]">
            Automate Fleet Billing &{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
              Duty Slips in Seconds
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
            Eliminate billing disputes and manual rate calculations. CABBS combines corporate Rate Cards, 
            interactive Duty Slips with odometer tracking, GST compliance (CGST/SGST/IGST + RCM), 
            and high-resolution PDF exports into a production-grade multi-tenant SaaS.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            {isAuthenticated ? (
              <button
                onClick={() => handleNavigate('/dashboard')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
              >
                <span>Launch Fleet Console</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNavigate('/register')}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                >
                  <span>Start Free Instance</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
                <button
                  onClick={() => handleNavigate('/login')}
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition cursor-pointer shadow-xs"
                >
                  Operator Sign In
                </button>
              </>
            )}
          </div>

          {/* Micro Feature Badges */}
          <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-200 text-left">
            <div>
              <span className="text-xl font-black text-[#0F172A] block">100%</span>
              <span className="text-[11px] text-slate-500 font-medium">Tenant Data Isolation</span>
            </div>
            <div>
              <span className="text-xl font-black text-emerald-600 block">Instant</span>
              <span className="text-[11px] text-slate-500 font-medium">PDF Duty Slip Export</span>
            </div>
            <div>
              <span className="text-xl font-black text-blue-600 block">Automated</span>
              <span className="text-[11px] text-slate-500 font-medium">Intra/Interstate GST</span>
            </div>
          </div>

        </div>

        {/* Right Column: Live App Mockup Dashboard */}
        <div className="flex-1 w-full max-w-[580px] lg:max-w-none">
          <div className="relative bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xl space-y-6">
            
            {/* Top Bar / App Controls */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono font-medium text-slate-500 ml-2">app.cabbs.io/dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE DEMO TENANT
                </span>
              </div>
            </div>

            {/* Quick Metrics Header */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Fleet</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">54 Cabs</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Duty Slips Today</span>
                <span className="text-xl font-black text-blue-600 mt-0.5 block">18 Slips</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly Revenue</span>
                <span className="text-xl font-black text-emerald-600 mt-0.5 block">₹8.45 Lakhs</span>
              </div>
            </div>

            {/* Operational Duty Slip Preview Mockup */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-700">DS-2026-1006</span>
                  <span className="text-[10px] font-bold text-slate-600">Dream Resorts India</span>
                </div>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full uppercase">
                  CLOSED & FINALIZED
                </span>
              </div>

              {/* Duty Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-white border border-slate-200/80 p-2 rounded-lg">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Start Meter</span>
                  <span className="font-bold text-slate-900">100.00 KM</span>
                </div>
                <div className="bg-white border border-slate-200/80 p-2 rounded-lg">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">End Meter</span>
                  <span className="font-bold text-slate-900">220.00 KM</span>
                </div>
                <div className="bg-white border border-slate-200/80 p-2 rounded-lg">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Start Time</span>
                  <span className="font-bold text-slate-900">22/07 09:00</span>
                </div>
                <div className="bg-white border border-slate-200/80 p-2 rounded-lg">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">End Time</span>
                  <span className="font-bold text-slate-900">22/07 20:00</span>
                </div>
              </div>

              {/* Rate Card Breakdown Sample */}
              <div className="bg-white border border-slate-200/80 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Base Package (8 Hrs / 80 KM)</span>
                  <span className="font-mono font-bold text-slate-900">₹1,600.00</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Extra KM (40 KM @ ₹11/KM)</span>
                  <span className="font-mono font-semibold text-slate-800">₹440.00</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Extra Hours (3 Hrs @ ₹90/Hr)</span>
                  <span className="font-mono font-semibold text-slate-800">₹270.00</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-emerald-700">
                  <span>Calculated Total</span>
                  <span className="font-mono text-sm">₹2,310.00</span>
                </div>
              </div>
            </div>

            {/* Floating Live Badge */}
            <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-2xl shadow-xl border border-blue-300 flex items-center gap-3 animate-float-delayed max-w-xs">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
                PDF
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white">Auto GST Invoices</span>
                <span className="text-[10px] text-blue-100">Ready for Instant Download</span>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* Interactive Screenshot & Module Showcase Section */}
      <section id="interactive-showcase" className="py-24 px-6 bg-white border-t border-slate-200 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              LIVE INTERACTIVE PREVIEW
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A]">
              Explore the Core Modules of CABBS
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Click through the interactive module tabs below to view full-fidelity live application UI screenshots and operational features.
            </p>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 max-w-4xl mx-auto">
            <button
              onClick={() => setActiveTab('duty-slips')}
              className={`px-5 py-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'duty-slips'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25" />
              </svg>
              <span>1. Duty Slips & Meters</span>
            </button>

            <button
              onClick={() => setActiveTab('rate-cards')}
              className={`px-5 py-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'rate-cards'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15i" />
              </svg>
              <span>2. Customer Rate Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('invoicing')}
              className={`px-5 py-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'invoicing'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              <span>3. GST Tax Invoicing</span>
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-5 py-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'fleet'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25" />
              </svg>
              <span>4. Direct & Fleet Dispatch</span>
            </button>
          </div>

          {/* Active Tab Screen Content Container */}
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            
            {activeTab === 'duty-slips' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                      Duty Slip & Odometer Tracking Console
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                        Interactive Module
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      Log exact Start/End Odometer readings, Travel Dates, and auto-computed extra KM & Extra Hours with Night/Driver Allowance toggles.
                    </p>
                  </div>
                  <button
                    onClick={() => handleNavigate('/dashboard/duty-slips')}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Open Live Duty Slips →
                  </button>
                </div>

                {/* Full Visual Mockup Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Form Fields Simulator */}
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-3">
                      <span className="font-bold text-slate-900">Edit Duty Slip: DS-2026-1006</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">STATUS: FILLED</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Customer</label>
                        <input type="text" readOnly value="Dream Resorts India" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 text-xs font-medium" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Reporting Date & Time</label>
                        <input type="text" readOnly value="22/07/2026  09:00" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 text-xs font-medium font-mono" />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Odometer & Schedule Metrics</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[9px] text-slate-500 block font-semibold">Start Meter</span>
                          <input type="text" readOnly value="100.00 KM" className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 text-xs font-bold" />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block font-semibold">End Meter</span>
                          <input type="text" readOnly value="220.00 KM" className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 text-xs font-bold" />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block font-semibold">Start Date/Time</span>
                          <input type="text" readOnly value="22/07 09:00" className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 text-xs font-bold" />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block font-semibold">End Date/Time</span>
                          <input type="text" readOnly value="22/07 20:00" className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 text-xs font-bold" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-slate-700 text-[11px] font-medium">Driver Allowance</span>
                        <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">Off (Local)</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-slate-700 text-[11px] font-medium">Night Charges</span>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">Auto (0 Hrs)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Calculated Breakup Mockup */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Rate Breakup</span>
                      <span className="text-[10px] font-bold text-blue-700">8 Hr / 80 KM Sedan</span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-slate-700">
                        <span>Base Fare (Package)</span>
                        <span className="font-bold text-slate-900">₹1,600.00</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Extra KM (40.0 KM @ ₹11)</span>
                        <span className="font-bold text-slate-800">₹440.00</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Extra Hours (3.0 Hrs @ ₹90)</span>
                        <span className="font-bold text-slate-800">₹270.00</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Toll / Parking / State Tax</span>
                        <span className="font-bold text-slate-800">₹0.00</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-emerald-700 font-bold">
                      <span className="text-xs uppercase">Grand Total Amount</span>
                      <span className="text-lg font-mono">₹2,310.00</span>
                    </div>

                    <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer">
                      ✓ Close & Finalize Duty Slip
                    </button>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'rate-cards' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                      Corporate Customer Rate Card Engine
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                        Strict Rate Rules
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      Define custom pricing templates per corporate account. Filters Car Group dropdowns strictly to agreed categories.
                    </p>
                  </div>
                  <button
                    onClick={() => handleNavigate('/dashboard/settings/rate-management')}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Manage Rate Cards →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-900">Sedan Package</span>
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold">LOCAL</span>
                    </div>
                    <div className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                      <div>Base Fare: <strong className="text-slate-900">₹1,600 (8h / 80km)</strong></div>
                      <div>Extra KM Rate: <strong className="text-slate-900">₹11.00 / KM</strong></div>
                      <div>Extra Hr Rate: <strong className="text-slate-900">₹90.00 / Hr</strong></div>
                      <div>Driver Allowance: <strong className="text-slate-900">₹300.00 / Day</strong></div>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-900">SUV (Innova)</span>
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">LOCAL</span>
                    </div>
                    <div className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                      <div>Base Fare: <strong className="text-slate-900">₹2,500 (8h / 80km)</strong></div>
                      <div>Extra KM Rate: <strong className="text-slate-900">₹16.00 / KM</strong></div>
                      <div>Extra Hr Rate: <strong className="text-slate-900">₹150.00 / Hr</strong></div>
                      <div>Driver Allowance: <strong className="text-slate-900">₹400.00 / Day</strong></div>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-900">Outstation Tour</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold">OUTSTATION</span>
                    </div>
                    <div className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                      <div>Min Daily KM: <strong className="text-slate-900">250 KM / Day</strong></div>
                      <div>Per KM Rate: <strong className="text-slate-900">₹14.00 / KM</strong></div>
                      <div>Driver Allowance: <strong className="text-slate-900">₹500.00 / Night</strong></div>
                      <div>Night Charges: <strong className="text-slate-900">Included if &gt; 22:00</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoicing' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                      GST Compliance & Tax Invoicing Matrix
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        CGST / SGST / IGST / RCM
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      Compile one or multiple duty slips into clean GST Invoices. Auto-calculates tax breakdown and Reverse Charge Mechanism (RCM).
                    </p>
                  </div>
                  <button
                    onClick={() => handleNavigate('/dashboard/invoices')}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Open Invoices Console →
                  </button>
                </div>

                {/* Sample Invoice Box */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-sm font-bold text-slate-900 font-mono">INVOICE NO: INV-2026-1184</span>
                      <span className="block text-[11px] text-slate-500">Customer: Travel Dream Holiday (Intrastate intra-state GST)</span>
                    </div>
                    <span className="text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                      UNPAID (DUE IN 15 DAYS)
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span>Subtotal (Closed Duty Slips)</span>
                      <span className="font-mono font-bold text-slate-900">₹12,480.00</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 bg-slate-50 rounded-lg flex justify-between border border-slate-200/80">
                        <span className="text-slate-600">CGST (2.5%)</span>
                        <span className="font-mono text-slate-800">₹312.00</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg flex justify-between border border-slate-200/80">
                        <span className="text-slate-600">SGST (2.5%)</span>
                        <span className="font-mono text-slate-800">₹312.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold text-emerald-800">
                      <span>Total Invoice Amount Payable</span>
                      <span className="font-mono text-base">₹13,104.00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fleet' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                      Dual-Mode Fleet & Dispatch Management
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        Registered + Direct Cabs
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      Seamlessly handle both owned fleet vehicles and third-party direct/manual cab entries without breaking rate card automation.
                    </p>
                  </div>
                  <button
                    onClick={() => handleNavigate('/dashboard/vehicles')}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    View Fleet Register →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-xs">
                    <span className="text-xs font-bold text-slate-900 block">Mode A: Registered Fleet Vehicles</span>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Pre-registered cabs with driver assignment, RC documents, insurance expiry warnings, and odometer maintenance history.
                    </p>
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-xs">
                    <span className="text-xs font-bold text-amber-700 block">Mode B: Direct Cab / Manual Vehicle</span>
                    <p className="text-[11px] text-slate-600 font-medium">
                      On-demand market cabs with instant Car Group selection (`Sedan`, `SUV`, `Hatchback`) ensuring rate cards still calculate automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* Workflow Simulator Section: "4-Step Automation Lifecycle" */}
      <section id="workflow-simulator" className="py-24 px-6 border-t border-slate-200 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              EFFORTLESS WORKFLOW
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A]">
              From Booking to GST Invoice in 4 Simple Steps
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Click through the lifecycle steps to see how CABBS automates operations for every trip.
            </p>
          </div>

          {/* Interactive Steps Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s) => (
              <div
                key={s.step}
                onClick={() => setActiveStep(s.step)}
                className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                  activeStep === s.step
                    ? 'bg-white border-blue-600 text-slate-900 shadow-xl shadow-blue-500/10'
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                    activeStep === s.step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    0{s.step}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.tag}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Active Step Highlight Box */}
          {(() => {
            const current = steps.find(s => s.step === activeStep)!;
            return (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in shadow-xl">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                      Step {current.step} of 4 · {current.tag}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">{current.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{current.desc}</p>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>{current.highlight}</span>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 font-mono text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                    Live Operational Telemetry
                  </div>
                  {Object.entries(current.metrics).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center p-2.5 bg-white border border-slate-200/80 rounded-lg">
                      <span className="text-slate-600 capitalize font-medium">{k.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-bold text-slate-900">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>
      </section>

      {/* Multi-Tenant SaaS Architecture & Security */}
      <section id="saas-architecture" className="py-24 px-6 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
              ENTERPRISE SECURITY
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A]">
              Built for Complete Multi-Tenant Security
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Each fleet company receives an isolated SaaS instance with encrypted records and strict database-level row access controls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 bg-[#F8FAFC] border border-slate-200 rounded-2xl space-y-3 hover:border-slate-300 transition shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Row-Level Tenant Isolation</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Prisma database middleware enforces automatic `tenantId` filtering across every SQL query, preventing cross-company data leakage.
              </p>
            </div>

            <div className="p-6 bg-[#F8FAFC] border border-slate-200 rounded-2xl space-y-3 hover:border-slate-300 transition shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25" />
                </svg>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Instant PDF Duty Slips</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Generates high-resolution PDF duty slips with your company logo, status badges, operational logs, and driver signatures.
              </p>
            </div>

            <div className="p-6 bg-[#F8FAFC] border border-slate-200 rounded-2xl space-y-3 hover:border-slate-300 transition shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Corporate Rate Matrix</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Set customer-specific contract rates for 8h/80km, outstation per-km rates, extra hour charges, and night allowances.
              </p>
            </div>

            <div className="p-6 bg-[#F8FAFC] border border-slate-200 rounded-2xl space-y-3 hover:border-slate-300 transition shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Bill & Duty Registers</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Export comprehensive operational ledgers, tax reports, and vehicle usage registers for accounting audit readiness.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section id="faq" className="py-24 px-6 border-t border-slate-200 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto space-y-10">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl font-black text-[#0F172A]">Got Questions? We Have Answers</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How does CABBS handle multi-company rate cards for corporate clients?',
                a: 'Each corporate customer can have one or more custom Rate Cards assigned. When selecting a customer on a duty slip, the Car Group dropdown automatically filters strictly to that customer’s agreed rate categories.'
              },
              {
                q: 'How are Night Allowances and Driver Allowances toggled?',
                a: 'System rules automatically enable Driver Allowance for outstation trips and default Night Allowance to ON when trip hours extend past night limits. Users can also manually override toggles when required.'
              },
              {
                q: 'Can I manage non-registered or market cabs on duty slips?',
                a: 'Yes! CABBS features a Dual-Mode Dispatch selector where you can pick a registered fleet vehicle or enter a Direct Cab number and category seamlessly.'
              },
              {
                q: 'How are GST calculations handled for intrastate vs interstate trips?',
                a: 'CABBS checks customer state codes to automatically apply CGST (2.5%) + SGST (2.5%) for intrastate billing or IGST (5%) for interstate billing, with full support for RCM (Reverse Charge Mechanism).'
              }
            ].map((faq, idx) => (
              <div
                key={idx}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="p-5 bg-white border border-slate-200 rounded-2xl cursor-pointer transition space-y-2 hover:border-slate-300 shadow-xs"
              >
                <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>{faq.q}</span>
                  <span className="text-blue-600 text-base">{openFaq === idx ? '−' : '+'}</span>
                </div>
                {openFaq === idx && (
                  <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100 animate-fade-in font-medium">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Call to Action Footer Box */}
      <section className="py-20 px-6 border-t border-slate-200 bg-white relative">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-10 text-center space-y-6 shadow-2xl text-white relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 blur-3xl rounded-full pointer-events-none" />
          
          <h2 className="text-3xl sm:text-4xl font-black text-white max-w-2xl mx-auto">
            Ready to Supercharge Your Fleet Billing & Operations?
          </h2>
          <p className="text-sm text-blue-100 max-w-xl mx-auto font-medium">
            Join modern travel operators using CABBS for error-free duty slips, automated rate cards, and instant GST invoices.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleNavigate(isAuthenticated ? '/dashboard' : '/register')}
              className="w-full sm:w-auto px-8 py-4 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-sm shadow-xl transition cursor-pointer flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              <span>{isAuthenticated ? 'Go to Fleet Console' : 'Launch Enterprise Instance'}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-slate-400 py-12 px-6 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
              C
            </div>
            <span className="font-semibold text-slate-300">© 2026 CABBS Cab Billing System. Enterprise Multi-Tenant SaaS.</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <a href="#interactive-showcase" className="hover:text-white transition">Showcase</a>
            <a href="#workflow-simulator" className="hover:text-white transition">Workflow</a>
            <a href="#saas-architecture" className="hover:text-white transition">Security</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
