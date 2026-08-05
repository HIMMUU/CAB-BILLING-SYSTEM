import { Controller, Get, Logger } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger('KeepAliveHealth');
  private startTime = Date.now();
  private pingCount = 0;

  @Public()
  @Get()
  checkHealth() {
    this.pingCount++;
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const heapUsedMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const timestamp = new Date().toISOString();

    const logMsg = `⚡ [30s KEEP-ALIVE PING #${this.pingCount}] ${timestamp} | Status: 200 OK | Server Uptime: ${uptimeSeconds}s | RAM RSS: ${rssMb}MB | Heap: ${heapUsedMb}MB`;

    // Standard console log (visible in raw stdout/stderr logs on Render & Docker)
    console.log(`\n=======================================================\n${logMsg}\n=======================================================\n`);

    // NestJS structured logger
    this.logger.log(logMsg);

    return {
      status: 'ok',
      service: 'cab-billing-backend',
      timestamp,
      pingCount: this.pingCount,
      uptimeSeconds,
      memoryUsage: {
        rss: `${rssMb} MB`,
        heapUsed: `${heapUsedMb} MB`,
      },
    };
  }
}
