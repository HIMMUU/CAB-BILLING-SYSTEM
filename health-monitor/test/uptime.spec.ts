import { UptimeTracker } from '../src/metrics/uptime-tracker.js';
import { CheckResult } from '../src/checker/service-checker.js';

describe('UptimeTracker', () => {
  let tracker: UptimeTracker;

  beforeEach(() => {
    tracker = new UptimeTracker();
  });

  test('calculates uptime percentage correctly for mixed results', () => {
    const successResult: CheckResult = {
      serviceId: 's1',
      serviceName: 'Test Service',
      url: 'http://test.com',
      isHealthy: true,
      statusCode: 200,
      responseTimeMs: 150,
      attempts: 1,
      timestamp: new Date().toISOString(),
    };

    const failResult: CheckResult = {
      ...successResult,
      isHealthy: false,
      statusCode: 500,
      error: 'Internal Error',
    };

    // 3 successes
    tracker.recordResult(successResult);
    tracker.recordResult(successResult);
    tracker.recordResult(successResult);
    // 1 failure
    const stats = tracker.recordResult(failResult);

    expect(stats.totalChecks).toBe(4);
    expect(stats.successfulChecks).toBe(3);
    expect(stats.failedChecks).toBe(1);
    expect(stats.uptimeRatio).toBe(0.75);
    expect(stats.uptimePercentage).toBe(75.0);
    expect(stats.consecutiveFailures).toBe(1);
    expect(stats.consecutiveSuccesses).toBe(0);
    expect(stats.lastStatus).toBe('UNHEALTHY');
  });

  test('tracks consecutive successes and failures accurately', () => {
    const successResult: CheckResult = {
      serviceId: 's2',
      serviceName: 'Service 2',
      url: 'http://test2.com',
      isHealthy: true,
      statusCode: 200,
      responseTimeMs: 100,
      attempts: 1,
      timestamp: new Date().toISOString(),
    };

    const failResult: CheckResult = {
      ...successResult,
      isHealthy: false,
      statusCode: null,
      error: 'Timeout',
    };

    tracker.recordResult(successResult);
    let stats = tracker.recordResult(successResult);
    expect(stats.consecutiveSuccesses).toBe(2);

    stats = tracker.recordResult(failResult);
    expect(stats.consecutiveFailures).toBe(1);
    expect(stats.consecutiveSuccesses).toBe(0);

    stats = tracker.recordResult(failResult);
    expect(stats.consecutiveFailures).toBe(2);
  });
});
