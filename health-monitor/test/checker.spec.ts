import { ServiceChecker } from '../src/checker/service-checker.js';
import { ServiceTarget, RetryConfig } from '../src/config/config.js';

describe('ServiceChecker', () => {
  const retryConfig: RetryConfig = {
    maxRetries: 1,
    initialBackoffMs: 10,
    backoffFactor: 2,
    maxBackoffMs: 50,
  };

  const target: ServiceTarget = {
    id: 'test-1',
    name: 'Test Endpoint',
    url: 'https://example.com/health',
    expectedStatus: 200,
    timeoutMs: 1000,
    checkIntervalMs: 60000,
  };

  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  test('returns healthy result on HTTP 200', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
    } as Response);

    const checker = new ServiceChecker(retryConfig);
    const result = await checker.checkService(target);

    expect(result.isHealthy).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.attempts).toBe(1);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  test('returns unhealthy result on unexpected status code with retries', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 500,
      ok: false,
    } as Response);

    const checker = new ServiceChecker(retryConfig);
    const result = await checker.checkService(target);

    expect(result.isHealthy).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.attempts).toBe(2); // 1 initial + 1 retry
    expect(result.error).toContain('Unexpected HTTP status code: 500');
  });

  test('returns unhealthy result on fetch network error', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('DNS Resolution Failed'));

    const checker = new ServiceChecker(retryConfig);
    const result = await checker.checkService(target);

    expect(result.isHealthy).toBe(false);
    expect(result.statusCode).toBeNull();
    expect(result.error).toContain('DNS Resolution Failed');
  });
});
