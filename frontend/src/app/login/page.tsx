'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const demoAccounts = [
  { role: 'TDH Staff Admin', email: 'staff@traveldreamholiday.com', desc: 'Travel Dream Holiday' },
  { role: 'Acme Operator', email: 'admin@acme.cabbs.local', desc: 'Acme Cabs' }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('staff@traveldreamholiday.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (api.getToken()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setError(null);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F8FAFC] font-sans">
      <div className="w-full max-w-[440px] p-8 mx-4 bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col">
        {/* Brand / Logo */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img 
            src="/images/tdh-logo.png" 
            alt="Travel Dream Holiday Logo" 
            className="w-32 h-32 object-contain mb-3 rounded-xl border border-gray-100 shadow-sm"
          />
          <h1 className="text-xl font-extrabold tracking-tight text-[#0F172A]">
            TRAVEL DREAM HOLIDAY
          </h1>
          <span className="text-xs font-semibold text-amber-600 tracking-wider uppercase mt-1">
            Cab Billing & Fleet Portal
          </span>
        </div>

        <h2 className="text-lg font-bold text-[#0F172A] tracking-tight text-center mb-1">Sign in to your account</h2>
        <p className="text-xs text-[#64748B] text-center mb-6">Enter password to access Travel Dream Holiday console</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-600 shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-800 leading-normal">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-4 py-2.5 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoFocus
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <p className="text-xs text-[#64748B] text-center mt-5">
          Don't have a portal?{' '}
          <a href="/register" className="text-blue-600 font-semibold hover:underline">
            Register a new company
          </a>
        </p>

        {/* Quick Demo Logins */}
        <div className="mt-6 border-t border-[#E2E8F0] pt-5">
          <p className="text-xs font-semibold text-[#64748B] text-center uppercase tracking-wider mb-4">
            Quick Demo Logins
          </p>
          <div className="grid grid-cols-2 gap-3">
            {demoAccounts.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => handleQuickLogin(account.email)}
                className="p-3 text-left bg-[#F8FAFC] hover:bg-gray-100/80 border border-[#E2E8F0] rounded-lg transition"
              >
                <div className="text-xs font-semibold text-blue-600">
                  {account.role}
                </div>
                <div className="text-[10px] text-[#64748B] truncate mt-0.5">
                  {account.email}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
