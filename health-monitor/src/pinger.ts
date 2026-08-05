import dotenv from 'dotenv';
import { executeWithRetry } from './checker/retry.js';

dotenv.config();

const TARGET_URL = process.env.PING_TARGET_URL || process.env.BACKEND_URL || 'http://localhost:3000/health';
const PING_INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || '30000', 10); // 30 seconds
const MAX_RETRIES = parseInt(process.env.PING_MAX_RETRIES || '3', 10);

interface HealthResponse {
  status: string;
  service?: string;
  timestamp?: string;
  uptimeSeconds?: number;
  memoryUsage?: {
    rss: string;
    heapUsed: string;
  };
}

interface PingStats {
  totalPings: number;
  successfulPings: number;
  failedPings: number;
  lastLatencyMs: number;
  avgLatencyMs: number;
  lastStatus: 'UP' | 'DOWN' | 'COLD_START';
}

const stats: PingStats = {
  totalPings: 0,
  successfulPings: 0,
  failedPings: 0,
  lastLatencyMs: 0,
  avgLatencyMs: 0,
  lastStatus: 'DOWN',
};

async function pingBackend(): Promise<void> {
  stats.totalPings++;
  const startTime = process.hrtime.bigint();
  const timestamp = new Date().toISOString();

  try {
    const result = await executeWithRetry<HealthResponse>(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const res = await fetch(TARGET_URL, {
            method: 'GET',
            headers: { 'User-Agent': '30s-KeepAlive-Pinger/1.0' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            throw new Error(`HTTP Error ${res.status}`);
          }
          return (await res.json()) as HealthResponse;
        } catch (err: any) {
          clearTimeout(timeoutId);
          throw err;
        }
      },
      {
        maxRetries: MAX_RETRIES,
        initialBackoffMs: 1000,
        backoffFactor: 2,
        maxBackoffMs: 5000,
      }
    );

    const endTime = process.hrtime.bigint();
    const latencyMs = Number((endTime - startTime) / BigInt(1000000));

    stats.successfulPings++;
    stats.lastLatencyMs = latencyMs;
    stats.avgLatencyMs = Math.round(
      (stats.avgLatencyMs * (stats.successfulPings - 1) + latencyMs) / stats.successfulPings
    );

    // Detect if cold start occurred (latency > 2500ms)
    stats.lastStatus = latencyMs > 2500 ? 'COLD_START' : 'UP';

    const statusBadge = stats.lastStatus === 'COLD_START' ? '🟡 COLD_START' : '🟢 UP';
    const memoryInfo = result?.memoryUsage ? ` | RSS: ${result.memoryUsage.rss}` : '';
    const uptimeInfo = typeof result?.uptimeSeconds !== 'undefined' ? ` | Uptime: ${result.uptimeSeconds}s` : '';

    console.log(
      `[${timestamp}] ${statusBadge} | Target: ${TARGET_URL} | Latency: ${latencyMs}ms | Success: ${stats.successfulPings}/${stats.totalPings}${memoryInfo}${uptimeInfo}`
    );
  } catch (err: any) {
    const endTime = process.hrtime.bigint();
    const latencyMs = Number((endTime - startTime) / BigInt(1000000));

    stats.failedPings++;
    stats.lastLatencyMs = latencyMs;
    stats.lastStatus = 'DOWN';

    console.error(
      `[${timestamp}] 🔴 DOWN | Target: ${TARGET_URL} | Latency: ${latencyMs}ms | Error: ${err.message} | Failures: ${stats.failedPings}/${stats.totalPings}`
    );
  }
}

function startPinger(): void {
  console.log(`=======================================================`);
  console.log(` 🚀 30-Second Backend Keep-Alive Pinger Initialized`);
  console.log(` 🎯 Target URL  : ${TARGET_URL}`);
  console.log(` ⏱️ Interval    : ${PING_INTERVAL_MS / 1000} seconds`);
  console.log(` 🔄 Max Retries : ${MAX_RETRIES}`);
  console.log(`=======================================================\n`);

  // Execute first ping immediately
  pingBackend();

  // Schedule periodic ping every 30 seconds
  const intervalHandle = setInterval(pingBackend, PING_INTERVAL_MS);

  const gracefulExit = () => {
    clearInterval(intervalHandle);
    console.log(`\n=======================================================`);
    console.log(` 🛑 Keep-Alive Pinger Stopped cleanly.`);
    console.log(` 📊 Total Pings : ${stats.totalPings}`);
    console.log(` ✅ Successful  : ${stats.successfulPings}`);
    console.log(` ❌ Failed      : ${stats.failedPings}`);
    console.log(` ⚡ Avg Latency : ${stats.avgLatencyMs}ms`);
    console.log(`=======================================================\n`);
    process.exit(0);
  };

  process.on('SIGINT', gracefulExit);
  process.on('SIGTERM', gracefulExit);
}

startPinger();
