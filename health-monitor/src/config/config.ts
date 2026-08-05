import { z } from 'zod';

export const ServiceTargetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  timeoutMs: z.number().int().positive().default(5000),
  checkIntervalMs: z.number().int().positive().default(60000), // e.g. every 60s or 5-10m for Render keepalive
});

export type ServiceTarget = z.infer<typeof ServiceTargetSchema>;

export const RetryConfigSchema = z.object({
  maxRetries: z.number().int().min(0).default(3),
  initialBackoffMs: z.number().int().positive().default(1000),
  backoffFactor: z.number().positive().default(2),
  maxBackoffMs: z.number().int().positive().default(10000),
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

export const AlertChannelConfigSchema = z.object({
  webhook: z.object({
    enabled: z.boolean().default(false),
    url: z.string().url().optional(),
    headers: z.record(z.string()).optional(),
  }).optional(),
  slack: z.object({
    enabled: z.boolean().default(false),
    webhookUrl: z.string().url().optional(),
  }).optional(),
  email: z.object({
    enabled: z.boolean().default(false),
    smtpHost: z.string().optional(),
    smtpPort: z.number().int().optional(),
    smtpSecure: z.boolean().default(false),
    authUser: z.string().optional(),
    authPass: z.string().optional(),
    from: z.string().email().optional(),
    to: z.array(z.string().email()).optional(),
  }).optional(),
  alertCooldownMs: z.number().int().positive().default(300000), // 5 min cooldown between repeat alerts
});

export type AlertChannelConfig = z.infer<typeof AlertChannelConfigSchema>;

export const MetricsServerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  port: z.number().int().min(1).max(65535).default(9090),
  host: z.string().default('0.0.0.0'),
  path: z.string().default('/metrics'),
  statusPath: z.string().default('/status'),
});

export type MetricsServerConfig = z.infer<typeof MetricsServerConfigSchema>;

export const HealthMonitorConfigSchema = z.object({
  services: z.array(ServiceTargetSchema).min(1),
  retry: RetryConfigSchema.default({}),
  alerts: AlertChannelConfigSchema.default({}),
  metricsServer: MetricsServerConfigSchema.default({}),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type HealthMonitorConfig = z.infer<typeof HealthMonitorConfigSchema>;

export function loadConfigFromEnv(): Partial<HealthMonitorConfig> {
  const servicesJson = process.env.SERVICES_CONFIG;
  let services: ServiceTarget[] = [];

  if (servicesJson) {
    try {
      services = JSON.parse(servicesJson);
    } catch (err) {
      throw new Error(`Failed to parse SERVICES_CONFIG JSON: ${(err as Error).message}`);
    }
  } else if (process.env.TARGET_SERVICES) {
    // Format: "Service A|https://servicea.com/health|60000,Service B|https://serviceb.com/health|300000"
    const rawServices = process.env.TARGET_SERVICES.split(',');
    services = rawServices.map((item, idx) => {
      const [name, url, intervalStr] = item.split('|').map(s => s.trim());
      return {
        id: `service-${idx + 1}`,
        name: name || `Service ${idx + 1}`,
        url: url || '',
        expectedStatus: parseInt(process.env.DEFAULT_EXPECTED_STATUS || '200', 10),
        timeoutMs: parseInt(process.env.DEFAULT_TIMEOUT_MS || '5000', 10),
        checkIntervalMs: intervalStr ? parseInt(intervalStr, 10) : parseInt(process.env.DEFAULT_CHECK_INTERVAL_MS || '300000', 10),
      };
    });
  }

  return {
    services,
    retry: {
      maxRetries: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES, 10) : 3,
      initialBackoffMs: process.env.INITIAL_BACKOFF_MS ? parseInt(process.env.INITIAL_BACKOFF_MS, 10) : 1000,
      backoffFactor: process.env.BACKOFF_FACTOR ? parseFloat(process.env.BACKOFF_FACTOR) : 2,
      maxBackoffMs: process.env.MAX_BACKOFF_MS ? parseInt(process.env.MAX_BACKOFF_MS, 10) : 10000,
    },
    alerts: {
      alertCooldownMs: process.env.ALERT_COOLDOWN_MS ? parseInt(process.env.ALERT_COOLDOWN_MS, 10) : 300000,
      webhook: {
        enabled: process.env.WEBHOOK_ENABLED === 'true',
        url: process.env.WEBHOOK_URL,
      },
      slack: {
        enabled: process.env.SLACK_ENABLED === 'true',
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
      },
      email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
        smtpSecure: process.env.SMTP_SECURE === 'true',
        authUser: process.env.SMTP_USER,
        authPass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO ? process.env.EMAIL_TO.split(',').map(s => s.trim()) : undefined,
      },
    },
    metricsServer: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      port: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT, 10) : 9090,
      host: process.env.METRICS_HOST || '0.0.0.0',
      path: process.env.METRICS_PATH || '/metrics',
      statusPath: process.env.STATUS_PATH || '/status',
    },
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
  };
}
