import nodemailer, { Transporter } from 'nodemailer';
import { AlertChannel, AlertEvent } from '../alert.types.js';
import { logger } from '../../logger/logger.js';

export interface EmailChannelOptions {
  smtpHost: string;
  smtpPort: number;
  smtpSecure?: boolean;
  authUser?: string;
  authPass?: string;
  from: string;
  to: string[];
}

export class EmailAlertChannel implements AlertChannel {
  public name = 'Email';
  private options: EmailChannelOptions;
  private transporter: Transporter;

  constructor(options: EmailChannelOptions) {
    this.options = options;
    this.transporter = nodemailer.createTransport({
      host: options.smtpHost,
      port: options.smtpPort,
      secure: options.smtpSecure ?? false,
      auth:
        options.authUser && options.authPass
          ? { user: options.authUser, pass: options.authPass }
          : undefined,
    });
  }

  public async sendAlert(event: AlertEvent): Promise<void> {
    const isUnhealthy = event.type === 'UNHEALTHY';
    const subject = `[${event.type}] Health Monitor: ${event.serviceName} is ${isUnhealthy ? 'DOWN' : 'RECOVERED'}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: ${isUnhealthy ? '#d9534f' : '#5cb85c'};">
          ${isUnhealthy ? '🚨 Service Failure Alert' : '✅ Service Recovery Notification'}
        </h2>
        <p><strong>Service Name:</strong> ${event.serviceName}</p>
        <p><strong>URL:</strong> <a href="${event.url}">${event.url}</a></p>
        <p><strong>Status:</strong> ${event.message}</p>
        <p><strong>HTTP Status Code:</strong> ${event.statusCode ?? 'N/A'}</p>
        <p><strong>Response Time:</strong> ${event.responseTimeMs} ms</p>
        <p><strong>Current Uptime Percentage:</strong> ${event.stats.uptimePercentage}%</p>
        <p><strong>Timestamp:</strong> ${event.timestamp}</p>
        ${event.error ? `<div style="background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-top: 15px;"><strong>Error:</strong> ${event.error}</div>` : ''}
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.options.from,
        to: this.options.to.join(', '),
        subject,
        html,
      });

      logger.info(`Email alert sent for ${event.serviceName}`, {
        channel: this.name,
        serviceId: event.serviceId,
        recipients: this.options.to,
      });
    } catch (err: any) {
      logger.error(`Failed to send email alert: ${err.message}`, {
        channel: this.name,
        serviceId: event.serviceId,
      });
    }
  }
}
