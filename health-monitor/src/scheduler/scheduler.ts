import { ServiceTarget, RetryConfig } from '../config/config.js';
import { ServiceChecker, CheckResult } from '../checker/service-checker.js';
import { UptimeTracker } from '../metrics/uptime-tracker.js';
import { PrometheusMetricsManager } from '../metrics/prometheus.js';
import { AlertManager } from '../alerts/alert-manager.js';
import { logger } from '../logger/logger.js';

export class HealthMonitorScheduler {
  private services: ServiceTarget[];
  private checker: ServiceChecker;
  private uptimeTracker: UptimeTracker;
  private metricsManager: PrometheusMetricsManager;
  private alertManager: AlertManager;
  private timerHandles: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(
    services: ServiceTarget[],
    retryConfig: RetryConfig,
    uptimeTracker: UptimeTracker,
    metricsManager: PrometheusMetricsManager,
    alertManager: AlertManager
  ) {
    this.services = services;
    this.checker = new ServiceChecker(retryConfig);
    this.uptimeTracker = uptimeTracker;
    this.metricsManager = metricsManager;
    this.alertManager = alertManager;
  }

  public async checkSingleService(target: ServiceTarget): Promise<CheckResult> {
    const result = await this.checker.checkService(target);
    const stats = this.uptimeTracker.recordResult(result);
    this.metricsManager.recordCheckResult(result, stats.uptimeRatio);
    await this.alertManager.evaluateAlerts(result, stats);
    return result;
  }

  public start(): void {
    if (this.isRunning) {
      logger.warn('Health monitor scheduler is already running.');
      return;
    }

    this.isRunning = true;
    logger.info(`Starting health monitor scheduler for ${this.services.length} services...`);

    for (const service of this.services) {
      // Execute initial check immediately
      this.checkSingleService(service).catch((err) => {
        logger.error(`Initial check failed for service ${service.name}: ${err.message}`);
      });

      // Schedule periodic timer
      const handle = setInterval(() => {
        if (!this.isRunning) return;
        this.checkSingleService(service).catch((err) => {
          logger.error(`Scheduled check error for ${service.name}: ${err.message}`);
        });
      }, service.checkIntervalMs);

      this.timerHandles.set(service.id, handle);
      logger.info(
        `Scheduled service '${service.name}' (${service.url}) every ${service.checkIntervalMs}ms`
      );
    }
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const [serviceId, handle] of this.timerHandles.entries()) {
      clearInterval(handle);
      this.timerHandles.delete(serviceId);
    }

    logger.info('Health monitor scheduler stopped successfully.');
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
