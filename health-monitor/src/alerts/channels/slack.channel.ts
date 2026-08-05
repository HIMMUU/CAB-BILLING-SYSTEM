import { AlertChannel, AlertEvent } from '../alert.types.js';
import { logger } from '../../logger/logger.js';

export class SlackAlertChannel implements AlertChannel {
  public name = 'Slack';
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  public async sendAlert(event: AlertEvent): Promise<void> {
    const isUnhealthy = event.type === 'UNHEALTHY';
    const color = isUnhealthy ? '#FF0000' : '#00FF00';
    const emoji = isUnhealthy ? '🚨' : '✅';
    const title = `${emoji} Service ${event.type === 'UNHEALTHY' ? 'UNHEALTHY Alert' : 'Recovery Notice'}`;

    const payload = {
      text: `${title}: ${event.serviceName}`,
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${title}*\n*Service:* ${event.serviceName} (${event.url})\n*Status:* ${event.message}`,
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*HTTP Code:* ${event.statusCode ?? 'N/A'}` },
                { type: 'mrkdwn', text: `*Response Time:* ${event.responseTimeMs} ms` },
                { type: 'mrkdwn', text: `*Uptime Ratio:* ${event.stats.uptimePercentage}%` },
                { type: 'mrkdwn', text: `*Timestamp:* ${event.timestamp}` },
              ],
            },
            ...(event.error
              ? [
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `*Error Details:*\n\`\`\`${event.error}\`\`\``,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.error(`Slack alert failed with HTTP status ${response.status}`, {
          channel: this.name,
          serviceId: event.serviceId,
        });
      } else {
        logger.info(`Slack alert sent for ${event.serviceName}`, {
          channel: this.name,
          serviceId: event.serviceId,
          type: event.type,
        });
      }
    } catch (err: any) {
      logger.error(`Error sending Slack alert: ${err.message}`, {
        channel: this.name,
        serviceId: event.serviceId,
      });
    }
  }
}
