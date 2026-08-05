import { AlertManager } from '../src/alerts/alert-manager.js';
import { AlertChannel, AlertEvent } from '../src/alerts/alert.types.js';
import { CheckResult } from '../src/checker/service-checker.js';
import { ServiceStats } from '../src/metrics/uptime-tracker.js';

describe('AlertManager', () => {
  let alertManager: AlertManager;
  let mockChannel: jest.Mocked<AlertChannel>;

  beforeEach(() => {
    alertManager = new AlertManager(1000); // 1 sec cooldown for test
    mockChannel = {
      name: 'MockChannel',
      sendAlert: jest.fn().mockResolvedValue(undefined),
    };
    alertManager.registerChannel(mockChannel);
  });

  const baseStats: ServiceStats = {
    serviceId: 's1',
    serviceName: 'App Service',
    url: 'http://app.local/health',
    totalChecks: 5,
    successfulChecks: 4,
    failedChecks: 1,
    uptimePercentage: 80.0,
    uptimeRatio: 0.8,
    consecutiveSuccesses: 0,
    consecutiveFailures: 1,
    lastResponseTimeMs: 200,
    avgResponseTimeMs: 180,
    lastStatus: 'UNHEALTHY',
    lastCheckTimestamp: new Date().toISOString(),
  };

  const unhealthyResult: CheckResult = {
    serviceId: 's1',
    serviceName: 'App Service',
    url: 'http://app.local/health',
    isHealthy: false,
    statusCode: 503,
    responseTimeMs: 200,
    attempts: 3,
    error: 'Service Unavailable',
    timestamp: new Date().toISOString(),
  };

  const healthyResult: CheckResult = {
    ...unhealthyResult,
    isHealthy: true,
    statusCode: 200,
    error: undefined,
  };

  test('triggers alert on transition from HEALTHY to UNHEALTHY', async () => {
    await alertManager.evaluateAlerts(unhealthyResult, baseStats);

    expect(mockChannel.sendAlert).toHaveBeenCalledTimes(1);
    const sentEvent: AlertEvent = mockChannel.sendAlert.mock.calls[0][0];
    expect(sentEvent.type).toBe('UNHEALTHY');
    expect(sentEvent.serviceId).toBe('s1');
  });

  test('suppresses repeat alerts when within cooldown window', async () => {
    // First failure triggers alert
    await alertManager.evaluateAlerts(unhealthyResult, baseStats);
    expect(mockChannel.sendAlert).toHaveBeenCalledTimes(1);

    // Immediate second failure within cooldown should be suppressed
    await alertManager.evaluateAlerts(unhealthyResult, baseStats);
    expect(mockChannel.sendAlert).toHaveBeenCalledTimes(1);
  });

  test('triggers RECOVERED alert on transition from UNHEALTHY to HEALTHY', async () => {
    // Shift to UNHEALTHY
    await alertManager.evaluateAlerts(unhealthyResult, baseStats);
    expect(mockChannel.sendAlert).toHaveBeenCalledTimes(1);

    // Shift to HEALTHY
    const recoveredStats: ServiceStats = { ...baseStats, lastStatus: 'HEALTHY', consecutiveSuccesses: 1 };
    await alertManager.evaluateAlerts(healthyResult, recoveredStats);

    expect(mockChannel.sendAlert).toHaveBeenCalledTimes(2);
    const recoveryEvent: AlertEvent = mockChannel.sendAlert.mock.calls[1][0];
    expect(recoveryEvent.type).toBe('RECOVERED');
  });
});
