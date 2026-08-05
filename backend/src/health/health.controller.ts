import { Controller, Get, Logger } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger('KeepAliveHealth');
  private startTime = Date.now();

  @Public()
  @Get()
  checkHealth() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const heapUsedMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    // Server-side logging for incoming 30s keep-alive pings
    this.logger.log(
      `[30s Keep-Alive Ping Received] Status: OK | Uptime: ${uptimeSeconds}s | RSS: ${rssMb} MB | Heap: ${heapUsedMb} MB`
    );

    return {
      status: 'ok',
      service: 'cab-billing-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      memoryUsage: {
        rss: `${rssMb} MB`,
        heapUsed: `${heapUsedMb} MB`,
      },
    };
  }
}
