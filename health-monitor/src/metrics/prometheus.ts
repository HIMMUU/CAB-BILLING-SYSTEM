import { Registry, Gauge, Counter } from 'prom-client';
import { CheckResult } from '../checker/service-checker.js';

export class PrometheusMetricsManager {
  private registry: Registry;

  public responseTimeGauge: Gauge<string>;
  public healthStatusGauge: Gauge<string>;
  public uptimeRatioGauge: Gauge<string>;
  public checksCounter: Counter<string>;

  constructor() {
    this.registry = new Registry();

    this.responseTimeGauge = new Gauge({
      name: 'http_health_check_duration_seconds',
      help: 'Duration of HTTP health check requests in seconds',
      labelNames: ['service_id', 'service_name', 'url'],
      registers: [this.registry],
    });

    this.healthStatusGauge = new Gauge({
      name: 'http_health_check_status',
      help: 'Health status of target service (1 for healthy, 0 for unhealthy)',
      labelNames: ['service_id', 'service_name', 'url'],
      registers: [this.registry],
    });

    this.uptimeRatioGauge = new Gauge({
      name: 'http_health_check_uptime_ratio',
      help: 'Calculated uptime ratio of service (0.0 to 1.0)',
      labelNames: ['service_id', 'service_name'],
      registers: [this.registry],
    });

    this.checksCounter = new Counter({
      name: 'http_health_check_total',
      help: 'Total count of completed health checks',
      labelNames: ['service_id', 'service_name', 'result'],
      registers: [this.registry],
    });
  }

  public recordCheckResult(result: CheckResult, uptimeRatio: number): void {
    const labels = {
      service_id: result.serviceId,
      service_name: result.serviceName,
      url: result.url,
    };

    // Duration in seconds
    this.responseTimeGauge.set(labels, result.responseTimeMs / 1000);
    this.healthStatusGauge.set(labels, result.isHealthy ? 1 : 0);

    this.uptimeRatioGauge.set(
      { service_id: result.serviceId, service_name: result.serviceName },
      uptimeRatio
    );

    this.checksCounter.inc({
      service_id: result.serviceId,
      service_name: result.serviceName,
      result: result.isHealthy ? 'success' : 'failure',
    });
  }

  public async getMetricsContentType(): Promise<string> {
    return this.registry.contentType;
  }

  public async getMetricsString(): Promise<string> {
    return await this.registry.metrics();
  }

  public getRegistry(): Registry {
    return this.registry;
  }
}
