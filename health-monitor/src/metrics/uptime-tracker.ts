import { CheckResult } from '../checker/service-checker.js';

export interface ServiceStats {
  serviceId: string;
  serviceName: string;
  url: string;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uptimePercentage: number;
  uptimeRatio: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastResponseTimeMs: number;
  avgResponseTimeMs: number;
  lastStatus: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
  lastCheckTimestamp: string | null;
  lastError?: string;
}

export class UptimeTracker {
  private statsMap: Map<string, ServiceStats> = new Map();

  public recordResult(result: CheckResult): ServiceStats {
    let stats = this.statsMap.get(result.serviceId);

    if (!stats) {
      stats = {
        serviceId: result.serviceId,
        serviceName: result.serviceName,
        url: result.url,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        uptimePercentage: 100.0,
        uptimeRatio: 1.0,
        consecutiveSuccesses: 0,
        consecutiveFailures: 0,
        lastResponseTimeMs: 0,
        avgResponseTimeMs: 0,
        lastStatus: 'UNKNOWN',
        lastCheckTimestamp: null,
      };
    }

    stats.totalChecks += 1;
    stats.lastCheckTimestamp = result.timestamp;
    stats.lastResponseTimeMs = result.responseTimeMs;

    // Rolling avg response time
    stats.avgResponseTimeMs = Math.round(
      (stats.avgResponseTimeMs * (stats.totalChecks - 1) + result.responseTimeMs) / stats.totalChecks
    );

    if (result.isHealthy) {
      stats.successfulChecks += 1;
      stats.consecutiveSuccesses += 1;
      stats.consecutiveFailures = 0;
      stats.lastStatus = 'HEALTHY';
      delete stats.lastError;
    } else {
      stats.failedChecks += 1;
      stats.consecutiveFailures += 1;
      stats.consecutiveSuccesses = 0;
      stats.lastStatus = 'UNHEALTHY';
      stats.lastError = result.error;
    }

    stats.uptimeRatio = stats.totalChecks > 0 ? stats.successfulChecks / stats.totalChecks : 1.0;
    stats.uptimePercentage = parseFloat((stats.uptimeRatio * 100).toFixed(2));

    this.statsMap.set(result.serviceId, stats);
    return stats;
  }

  public getStats(serviceId: string): ServiceStats | undefined {
    return this.statsMap.get(serviceId);
  }

  public getAllStats(): ServiceStats[] {
    return Array.from(this.statsMap.values());
  }

  public resetStats(serviceId?: string): void {
    if (serviceId) {
      this.statsMap.delete(serviceId);
    } else {
      this.statsMap.clear();
    }
  }
}
