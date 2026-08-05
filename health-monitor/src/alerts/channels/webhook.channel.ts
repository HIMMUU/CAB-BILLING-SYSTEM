import { AlertChannel, AlertEvent } from '../alert.types.js';
import { logger } from '../../logger/logger.js';

export class WebhookAlertChannel implements AlertChannel {
  public name = 'Webhook';
  private url: string;
  private headers?: Record<string, string>;

  constructor(url: string, headers?: Record<string, string>) {
    this.url = url;
    this.headers = headers;
  }

  public async sendAlert(event: AlertEvent): Promise<void> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.headers || {}),
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        logger.error(`Webhook alert failed with HTTP status ${response.status}`, {
          channel: this.name,
          url: this.url,
          serviceId: event.serviceId,
        });
      } else {
        logger.info(`Webhook alert successfully sent for ${event.serviceName}`, {
          channel: this.name,
          serviceId: event.serviceId,
          type: event.type,
        });
      }
    } catch (err: any) {
      logger.error(`Error sending Webhook alert: ${err.message}`, {
        channel: this.name,
        serviceId: event.serviceId,
        url: this.url,
      });
    }
  }
}
