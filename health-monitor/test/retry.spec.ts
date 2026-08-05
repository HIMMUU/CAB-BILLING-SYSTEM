import { executeWithRetry, calculateBackoffDelay } from '../src/checker/retry.js';
import { RetryConfig } from '../src/config/config.js';

describe('Retry Utility', () => {
  const retryConfig: RetryConfig = {
    maxRetries: 3,
    initialBackoffMs: 100,
    backoffFactor: 2,
    maxBackoffMs: 1000,
  };

  test('calculateBackoffDelay computes exponential delays correctly without jitter', () => {
    const delay0 = calculateBackoffDelay(0, retryConfig, false);
    const delay1 = calculateBackoffDelay(1, retryConfig, false);
    const delay2 = calculateBackoffDelay(2, retryConfig, false);

    expect(delay0).toBe(100); // 100 * 2^0
    expect(delay1).toBe(200); // 100 * 2^1
    expect(delay2).toBe(400); // 100 * 2^2
  });

  test('calculateBackoffDelay respects maxBackoffMs cap', () => {
    const delayLarge = calculateBackoffDelay(10, retryConfig, false);
    expect(delayLarge).toBe(1000); // capped at maxBackoffMs
  });

  test('executeWithRetry succeeds on first attempt if no error', async () => {
    const op = jest.fn().mockResolvedValue('success');
    const result = await executeWithRetry(op, retryConfig);

    expect(result).toBe('success');
    expect(op).toHaveBeenCalledTimes(1);
  });

  test('executeWithRetry retries until success', async () => {
    const op = jest
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success on 3rd');

    const onRetry = jest.fn();
    const result = await executeWithRetry(op, retryConfig, onRetry);

    expect(result).toBe('success on 3rd');
    expect(op).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  test('executeWithRetry throws error when max retries exceeded', async () => {
    const op = jest.fn().mockRejectedValue(new Error('Persistent Failure'));

    await expect(executeWithRetry(op, retryConfig)).rejects.toThrow('Persistent Failure');
    expect(op).toHaveBeenCalledTimes(4); // initial + 3 retries
  });
});
