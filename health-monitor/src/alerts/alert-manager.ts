import { AlertChannel, AlertEvent, AlertType } from './alert.types.js';
import { ServiceStats } from '../metrics/uptime-tracker.js';
import { CheckResult } from '../checker/service-checker.js';
import { logger } from '../logger/logger.js';

interface ServiceAlertState {
  lastState: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
  lastAlertTimestamp: number;
}

export class AlertManager {
  private channels: AlertChannel[] = [];
  private alertCooldownMs: number;
  private serviceStates: Map<string, ServiceAlertState> = new Map();

  constructor(alertCooldownMs: number = 300000) {
    this.alertCooldownMs = alertCooldownMs;
  }

  public registerChannel(channel: AlertChannel): void {
    this.channels.push(channel);
    logger.info(`Registered alert channel: ${channel.name}`);
  }

  public getChannels(): AlertChannel[] {
    return this.channels;
  }

  public async evaluateAlerts(result: CheckResult, stats: ServiceStats): Promise<void> {
    if (this.channels.length === 0) {
      return;
    }

    const serviceId = result.serviceId;
    let stateInfo = this.serviceStates.get(serviceId);

    if (!stateInfo) {
      stateInfo = { lastState: 'HEALTHY', lastAlertTimestamp: 0 };
      this.serviceStates.set(serviceId, stateInfo);
    }

    const now = Date.now();
    const currentState = result.isHealthy ? 'HEALTHY' : 'UNHEALTHY';
    const isStateChanged = stateInfo.lastState !== currentState;
    const isCooldownElapsed = now - stateInfo.lastAlertTimestamp >= this.alertCooldownMs;

    let shouldAlert = false;
    let alertType: AlertType | null = null;

    if (isStateChanged) {
      if (currentState === 'UNHEALTHY') {
        shouldAlert = true;
        alertType = 'UNHEALTHY';
      } else if (currentState === 'HEALTHY' && stateInfo.lastState === 'UNHEALTHY') {
        shouldAlert = true;
        alertType = 'RECOVERED';
      }
    } else if (currentState === 'UNHEALTHY' && isCooldownElapsed) {
      // Repeat alert for persistent outage after cooldown
      shouldAlert = true;
      alertType = 'UNHEALTHY';
    }

    if (shouldAlert && alertType) {
      stateInfo.lastState = currentState;
      stateInfo.lastAlertTimestamp = now;

      const event: AlertEvent = {
        type: alertType,
        serviceId: result.serviceId,
        serviceName: result.serviceName,
        url: result.url,
        timestamp: result.timestamp,
        error: result.error,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        stats,
        message:
          alertType === 'UNHEALTHY'
            ? `Service is unhealthy: ${result.error || 'Check failed'}`
            : `Service has recovered and is now healthy.`,
      };

      logger.warn(`Dispatching alert [${alertType}] for ${result.serviceName}`, {
        serviceId: result.serviceId,
        type: alertType,
        channelsCount: this.channels.length,
      });

      await Promise.all(
        this.channels.map((channel) =>
          channel.sendAlert(event).catch((err) => {
            logger.error(`Error in channel ${channel.name}: ${err.message}`);
          })
        )
      );
    }
  }
}
