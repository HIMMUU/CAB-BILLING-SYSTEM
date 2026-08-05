import dotenv from 'dotenv';
import {
  HealthMonitorConfig,
  HealthMonitorConfigSchema,
  loadConfigFromEnv,
} from './config/config.js';
import { UptimeTracker } from './metrics/uptime-tracker.js';
import { PrometheusMetricsManager } from './metrics/prometheus.js';
import { AlertManager } from './alerts/alert-manager.js';
import { WebhookAlertChannel } from './alerts/channels/webhook.channel.js';
import { SlackAlertChannel } from './alerts/channels/slack.channel.js';
import { EmailAlertChannel } from './alerts/channels/email.channel.js';
import { MetricsServer } from './server/metrics-server.js';
import { HealthMonitorScheduler } from './scheduler/scheduler.js';
import { logger } from './logger/logger.js';

dotenv.config();

export class HealthMonitor {
  private config: HealthMonitorConfig;
  private uptimeTracker: UptimeTracker;
  private metricsManager: PrometheusMetricsManager;
  private alertManager: AlertManager;
  private metricsServer: MetricsServer;
  private scheduler: HealthMonitorScheduler;

  constructor(options?: Partial<HealthMonitorConfig>) {
    const rawConfig = options ? { ...loadConfigFromEnv(), ...options } : loadConfigFromEnv();
    
    // Parse & validate with Zod
    const validated = HealthMonitorConfigSchema.safeParse(rawConfig);
    if (!validated.success) {
      const errorFormatted = validated.error.format();
      throw new Error(`Invalid HealthMonitor Configuration: ${JSON.stringify(errorFormatted, null, 2)}`);
    }

    this.config = validated.data;
    logger.setLevel(this.config.logLevel);

    this.uptimeTracker = new UptimeTracker();
    this.metricsManager = new PrometheusMetricsManager();
    this.alertManager = new AlertManager(this.config.alerts.alertCooldownMs);

    this.configureAlertChannels();

    this.metricsServer = new MetricsServer(
      this.config.metricsServer,
      this.metricsManager,
      this.uptimeTracker
    );

    this.scheduler = new HealthMonitorScheduler(
      this.config.services,
      this.config.retry,
      this.uptimeTracker,
      this.metricsManager,
      this.alertManager
    );
  }

  private configureAlertChannels(): void {
    const alerts = this.config.alerts;

    if (alerts.webhook?.enabled && alerts.webhook.url) {
      this.alertManager.registerChannel(
        new WebhookAlertChannel(alerts.webhook.url, alerts.webhook.headers)
      );
    }

    if (alerts.slack?.enabled && alerts.slack.webhookUrl) {
      this.alertManager.registerChannel(
        new SlackAlertChannel(alerts.slack.webhookUrl)
      );
    }

    if (alerts.email?.enabled && alerts.email.smtpHost && alerts.email.from && alerts.email.to) {
      this.alertManager.registerChannel(
        new EmailAlertChannel({
          smtpHost: alerts.email.smtpHost,
          smtpPort: alerts.email.smtpPort || 587,
          smtpSecure: alerts.email.smtpSecure,
          authUser: alerts.email.authUser,
          authPass: alerts.email.authPass,
          from: alerts.email.from,
          to: alerts.email.to,
        })
      );
    }
  }

  public async start(): Promise<void> {
    logger.info('Initializing Health Monitor Engine...');
    await this.metricsServer.start();
    this.scheduler.start();
  }

  public async stop(): Promise<void> {
    logger.info('Shutting down Health Monitor Engine...');
    this.scheduler.stop();
    await this.metricsServer.stop();
    logger.info('Health Monitor Engine stopped cleanly.');
  }

  public getUptimeTracker(): UptimeTracker {
    return this.uptimeTracker;
  }

  public getMetricsManager(): PrometheusMetricsManager {
    return this.metricsManager;
  }

  public getScheduler(): HealthMonitorScheduler {
    return this.scheduler;
  }
}

// Re-export sub-modules for library consumers
export * from './config/config.js';
export * from './checker/service-checker.js';
export * from './checker/retry.js';
export * from './metrics/uptime-tracker.js';
export * from './metrics/prometheus.js';
export * from './alerts/alert.types.js';
export * from './alerts/alert-manager.js';

// Self-run entry point if started as CLI / application
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('index.ts'))) {
  try {
    const monitor = new HealthMonitor();
    monitor.start().catch((err) => {
      logger.error(`Failed to start HealthMonitor: ${err.message}`);
      process.exit(1);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down...`);
      await monitor.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (err: any) {
    logger.error(`Initialization Error: ${err.message}`);
    process.exit(1);
  }
}
