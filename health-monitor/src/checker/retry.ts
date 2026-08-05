import { RetryConfig } from '../config/config.js';
import { logger } from '../logger/logger.js';

export interface RetryAttemptInfo {
  attempt: number;
  maxRetries: number;
  delayMs: number;
  error: Error;
}

export type OnRetryCallback = (info: RetryAttemptInfo) => void;

export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig,
  enableJitter: boolean = true
): number {
  const exponential = Math.pow(config.backoffFactor, attempt);
  const baseDelay = config.initialBackoffMs * exponential;
  const cappedDelay = Math.min(config.maxBackoffMs, baseDelay);

  if (!enableJitter) {
    return Math.floor(cappedDelay);
  }

  // Jitter between 0% and 25% of delay
  const jitter = Math.random() * 0.25 * cappedDelay;
  return Math.floor(cappedDelay + jitter);
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retryConfig: RetryConfig,
  onRetry?: OnRetryCallback
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (attempt >= retryConfig.maxRetries) {
        logger.warn(`Max retries (${retryConfig.maxRetries}) reached. Failing operation.`, {
          error: err.message,
          attempt,
        });
        throw err;
      }

      const delayMs = calculateBackoffDelay(attempt, retryConfig);

      if (onRetry) {
        onRetry({ attempt: attempt + 1, maxRetries: retryConfig.maxRetries, delayMs, error: err });
      } else {
        logger.warn(`Operation failed, retrying in ${delayMs}ms (Attempt ${attempt + 1}/${retryConfig.maxRetries})`, {
          error: err.message,
          attempt: attempt + 1,
          delayMs,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
}
