'use client';

import React, { useState, useEffect, useRef } from 'react';

interface HealthData {
  status: string;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  memoryUsage?: {
    rss: string;
    heapUsed: string;
  };
}

export function KeepAlivePinger() {
  const [status, setStatus] = useState<'INITIALIZING' | 'UP' | 'COLD_START' | 'DOWN'>('INITIALIZING');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [pingCount, setPingCount] = useState<number>(0);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [healthInfo, setHealthInfo] = useState<HealthData | null>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState<boolean>(false);

  const countdownRef = useRef<number>(30);

  const pingBackend = async () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const healthEndpoint = `${backendUrl.replace(/\/$/, '')}/health`;

    const startTime = performance.now();
    try {
      const res = await fetch(healthEndpoint, {
        method: 'GET',
        cache: 'no-store',
      });
      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);

      if (res.ok) {
        const data: HealthData = await res.json();
        setHealthInfo(data);
        setLatencyMs(elapsed);
        setStatus(elapsed > 2500 ? 'COLD_START' : 'UP');
      } else {
        setStatus('DOWN');
        setLatencyMs(elapsed);
      }
    } catch {
      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));
      setStatus('DOWN');
    } finally {
      setPingCount((c) => c + 1);
      setLastPingTime(new Date().toLocaleTimeString());
      setCountdown(30);
      countdownRef.current = 30;
    }
  };

  useEffect(() => {
    // Initial ping on load
    pingBackend();

    // 30-second main interval
    const interval = setInterval(() => {
      pingBackend();
    }, 30000);

    // 1-second countdown ticker
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 30;
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={pingBackend}
        onMouseEnter={() => setIsTooltipOpen(true)}
        onMouseLeave={() => setIsTooltipOpen(false)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all select-none cursor-pointer ${
          status === 'UP'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : status === 'COLD_START'
            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            : status === 'DOWN'
            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
            : 'bg-slate-50 text-slate-600 border-slate-200'
        }`}
        title="Backend 30-Second Keep-Alive Pinger (Click to Ping Now)"
      >
        {/* Animated Status Dot */}
        <span className="relative flex h-2 w-2">
          {status === 'UP' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          {status === 'DOWN' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status === 'UP'
                ? 'bg-emerald-500'
                : status === 'COLD_START'
                ? 'bg-amber-500'
                : status === 'DOWN'
                ? 'bg-rose-500'
                : 'bg-slate-400'
            }`}
          />
        </span>

        {/* Status Text & Latency */}
        <span className="font-mono text-[11px] tracking-tight">
          {status === 'INITIALIZING'
            ? 'Pinging...'
            : status === 'DOWN'
            ? 'Backend Offline'
            : status === 'COLD_START'
            ? `Cold Start (${latencyMs}ms)`
            : `Backend ${latencyMs}ms`}
        </span>

        {/* 30s Countdown Badge */}
        <span className="bg-white/80 border border-slate-200/60 rounded px-1 text-[10px] font-mono text-slate-500">
          {countdown}s
        </span>
      </button>

      {/* Hover Info Tooltip */}
      {isTooltipOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs z-50 pointer-events-none border border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="font-bold text-slate-200">⚡ Backend Keep-Alive</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
              30s Cycle Active
            </span>
          </div>

          <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Endpoint:</span>
              <span className="text-slate-200 truncate max-w-[120px]">/health</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Latency:</span>
              <span className="text-emerald-400 font-bold">{latencyMs ? `${latencyMs} ms` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Server Uptime:</span>
              <span className="text-slate-200">{healthInfo?.uptimeSeconds ? `${healthInfo.uptimeSeconds}s` : '—'}</span>
            </div>
            {healthInfo?.memoryUsage && (
              <div className="flex justify-between">
                <span className="text-slate-400">Memory RSS:</span>
                <span className="text-slate-200">{healthInfo.memoryUsage.rss}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Total Pings:</span>
              <span className="text-slate-200">{pingCount}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800/80 pt-1.5 mt-1">
              <span className="text-slate-400">Last Pinged:</span>
              <span className="text-slate-300">{lastPingTime || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
