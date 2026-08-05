import { ServiceTarget, RetryConfig } from '../config/config.js';
import { executeWithRetry } from './retry.js';
import { logger } from '../logger/logger.js';

export interface CheckResult {
  serviceId: string;
  serviceName: string;
  url: string;
  isHealthy: boolean;
  statusCode: number | null;
  responseTimeMs: number;
  attempts: number;
  error?: string;
  timestamp: string;
}

export class ServiceChecker {
  private retryConfig: RetryConfig;

  constructor(retryConfig: RetryConfig) {
    this.retryConfig = retryConfig;
  }

  public async checkService(target: ServiceTarget): Promise<CheckResult> {
    const startTime = process.hrtime.bigint();
    let attemptsCount = 1;
    let lastError: Error | undefined;
    let statusCode: number | null = null;

    const performFetch = async (): Promise<{ status: number }> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), target.timeoutMs);

      try {
        const response = await fetch(target.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Node-Health-Monitor/1.0',
            'Accept': '*/*',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        statusCode = response.status;

        if (response.status !== target.expectedStatus) {
          throw new Error(`Unexpected HTTP status code: ${response.status} (expected ${target.expectedStatus})`);
        }

        return { status: response.status };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error(`Request timed out after ${target.timeoutMs}ms`);
        }
        throw err;
      }
    };

    try {
      await executeWithRetry(
        async () => {
          return await performFetch();
        },
        this.retryConfig,
        (retryInfo) => {
          attemptsCount = retryInfo.attempt + 1;
          logger.warn(`Health check attempt ${retryInfo.attempt} failed for ${target.name} (${target.url})`, {
            serviceId: target.id,
            error: retryInfo.error.message,
            nextDelayMs: retryInfo.delayMs,
          });
        }
      );

      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number((endTime - startTime) / BigInt(1000000));

      logger.info(`Health check passed for ${target.name}`, {
        serviceId: target.id,
        url: target.url,
        statusCode,
        responseTimeMs,
        attempts: attemptsCount,
      });

      return {
        serviceId: target.id,
        serviceName: target.name,
        url: target.url,
        isHealthy: true,
        statusCode,
        responseTimeMs,
        attempts: attemptsCount,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number((endTime - startTime) / BigInt(1000000));
      lastError = err instanceof Error ? err : new Error(String(err));

      logger.error(`Health check failed for ${target.name}`, {
        serviceId: target.id,
        url: target.url,
        statusCode,
        responseTimeMs,
        attempts: attemptsCount,
        error: lastError.message,
      });

      return {
        serviceId: target.id,
        serviceName: target.name,
        url: target.url,
        isHealthy: false,
        statusCode,
        responseTimeMs,
        attempts: attemptsCount,
        error: lastError.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
