import { HealthMonitorScheduler } from '../src/scheduler/scheduler.js';
import { ServiceTarget, RetryConfig } from '../src/config/config.js';
import { UptimeTracker } from '../src/metrics/uptime-tracker.js';
import { PrometheusMetricsManager } from '../src/metrics/prometheus.js';
import { AlertManager } from '../src/alerts/alert-manager.js';

describe('HealthMonitorScheduler', () => {
  const service: ServiceTarget = {
    id: 's-sched',
    name: 'Scheduled Service',
    url: 'https://example.com/health',
    expectedStatus: 200,
    timeoutMs: 1000,
    checkIntervalMs: 60000,
  };

  const retryConfig: RetryConfig = {
    maxRetries: 0,
    initialBackoffMs: 10,
    backoffFactor: 2,
    maxBackoffMs: 50,
  };

  let tracker: UptimeTracker;
  let metricsManager: PrometheusMetricsManager;
  let alertManager: AlertManager;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    tracker = new UptimeTracker();
    metricsManager = new PrometheusMetricsManager();
    alertManager = new AlertManager();
  });

  test('executes single check and records stats', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true } as Response);

    const scheduler = new HealthMonitorScheduler(
      [service],
      retryConfig,
      tracker,
      metricsManager,
      alertManager
    );

    const result = await scheduler.checkSingleService(service);

    expect(result.isHealthy).toBe(true);
    expect(result.serviceId).toBe('s-sched');

    const stats = tracker.getStats('s-sched');
    expect(stats?.totalChecks).toBe(1);
    expect(stats?.successfulChecks).toBe(1);
  });

  test('starts and stops scheduler without leaking timers', () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true } as Response);

    const scheduler = new HealthMonitorScheduler(
      [service],
      retryConfig,
      tracker,
      metricsManager,
      alertManager
    );

    scheduler.start();
    expect(scheduler.getIsRunning()).toBe(true);

    scheduler.stop();
    expect(scheduler.getIsRunning()).toBe(false);
  });
});
