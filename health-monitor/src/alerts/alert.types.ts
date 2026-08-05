import { ServiceStats } from '../metrics/uptime-tracker.js';

export type AlertType = 'UNHEALTHY' | 'RECOVERED';

export interface AlertEvent {
  type: AlertType;
  serviceId: string;
  serviceName: string;
  url: string;
  timestamp: string;
  error?: string;
  statusCode?: number | null;
  responseTimeMs: number;
  stats: ServiceStats;
  message: string;
}

export interface AlertChannel {
  name: string;
  sendAlert(event: AlertEvent): Promise<void>;
}
