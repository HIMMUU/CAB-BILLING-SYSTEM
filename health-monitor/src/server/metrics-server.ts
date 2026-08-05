import http, { IncomingMessage, ServerResponse } from 'node:http';
import { PrometheusMetricsManager } from '../metrics/prometheus.js';
import { UptimeTracker } from '../metrics/uptime-tracker.js';
import { MetricsServerConfig } from '../config/config.js';
import { logger } from '../logger/logger.js';

export class MetricsServer {
  private server: http.Server | null = null;
  private config: MetricsServerConfig;
  private metricsManager: PrometheusMetricsManager;
  private uptimeTracker: UptimeTracker;

  constructor(
    config: MetricsServerConfig,
    metricsManager: PrometheusMetricsManager,
    uptimeTracker: UptimeTracker
  ) {
    this.config = config;
    this.metricsManager = metricsManager;
    this.uptimeTracker = uptimeTracker;
  }

  public async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Metrics HTTP server is disabled.');
      return;
    }

    this.server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = req.url || '/';

      if (req.method === 'GET' && url === this.config.path) {
        try {
          const metrics = await this.metricsManager.getMetricsString();
          const contentType = await this.metricsManager.getMetricsContentType();
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(metrics);
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      } else if (req.method === 'GET' && url === this.config.statusPath) {
        const stats = this.uptimeTracker.getAllStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              status: 'OK',
              timestamp: new Date().toISOString(),
              servicesCount: stats.length,
              services: stats,
            },
            null,
            2
          )
        );
      } else if (req.method === 'GET' && url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'UP', service: 'Health-Monitoring-Module' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    return new Promise((resolve) => {
      this.server?.listen(this.config.port, this.config.host, () => {
        logger.info(
          `Metrics & Status HTTP server running at http://${this.config.host}:${this.config.port}${this.config.path}`
        );
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server?.close((err) => {
          if (err) return reject(err);
          logger.info('Metrics HTTP server stopped.');
          resolve();
        });
      });
    }
  }
}
