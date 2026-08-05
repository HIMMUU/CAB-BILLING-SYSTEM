# Production-Ready Health Monitoring Module (TypeScript / Node.js)

A lightweight, high-performance, production-ready Health Monitoring Module built in TypeScript for Node.js. It periodically validates the health of configurable HTTP services, records high-precision response times, tracks uptime percentages, executes exponential backoff retries on failure, exposes Prometheus metrics, logs structured JSON events, and dispatches real-time alerts via Webhooks, Slack, and Email.

---

## 🌟 Key Features

- **Periodic Health Checking**: Periodically sends HTTP `GET` requests to target `/health` endpoints.
- **Render Free Tier Keep-Alive Support**: Designed to solve Render free-tier inactivity spin-downs (~15 minutes threshold). Pinging services every 5–10 minutes continuously resets the 15-minute countdown.
- **Exponential Backoff & Retry Logic**: Configurable retries with exponential backoff and randomized jitter to prevent thundering herd issues.
- **High-Precision Timing & Metrics**: Response time recorded in milliseconds using `process.hrtime.bigint()`. Cumulative & rolling window uptime percentages (`(successful / total) * 100`).
- **Prometheus Scraping & Status Server**: Built-in HTTP server exposing `/metrics` (Prometheus gauge & counter metrics) and `/status` (JSON summary).
- **Structured JSON Logging**: Standardized JSON logs (`DEBUG`, `INFO`, `WARN`, `ERROR`) with context metadata.
- **Multi-Channel Alerting**: Built-in alerting channels for **Webhook**, **Slack**, and **Email (SMTP)** with state-transition alerts (`HEALTHY` -> `UNHEALTHY` & recovery notice) and alert cooldown suppression.
- **Dual Usage**: Run directly as a standalone CLI microservice or import programmatically into any TypeScript/JavaScript application.

---

## 💡 Render Inactivity & Keep-Alive Strategy

Render's free tier services operate on an **inactivity timer**:
- **0–15 minutes after last request:** Service stays active.
- **~15 minutes of no incoming requests:** Service spins down.
- **Next request:** Triggers a cold start (takes seconds to over a minute).

```
Request received ──► Service Active ──► (No requests for 15 min) ──► Spins Down ──► Cold Start on Next Request
```

### Prevention Strategy
By configuring this health monitor with a check interval of **5 to 10 minutes** (`300000ms` - `600000ms`), every check resets Render's 15-minute inactivity countdown, keeping your Render free tier services continuously warm and responsive.

---

## 🚀 Quick Start

### 1. Installation

Navigate into the `health-monitor` directory and install dependencies:

```bash
cd health-monitor
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Define your target services in `.env`:

```env
LOG_LEVEL=info
TARGET_SERVICES="Billing Backend|http://localhost:3000/health|60000,Render App|https://my-app.onrender.com/health|300000"
METRICS_PORT=9090
```

### 3. Run Standalone Service

```bash
# Build TypeScript code
npm run build

# Start production monitor server
npm start
```

Or for development:

```bash
npm run dev
```

---

## 🛠️ Configuration Reference

The module accepts configuration via Environment Variables or Programmatic Options.

### Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `LOG_LEVEL` | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |
| `TARGET_SERVICES` | — | Pipe-delimited services: `Name\|URL\|IntervalMs,Name2\|URL2\|IntervalMs` |
| `SERVICES_CONFIG` | — | Alternative JSON string array of `ServiceTarget` objects |
| `DEFAULT_TIMEOUT_MS` | `5000` | HTTP request timeout in milliseconds |
| `DEFAULT_CHECK_INTERVAL_MS` | `300000` | Interval between health checks (5 minutes) |
| `MAX_RETRIES` | `3` | Maximum retry attempts per failed check |
| `INITIAL_BACKOFF_MS` | `1000` | Initial exponential backoff delay (ms) |
| `BACKOFF_FACTOR` | `2` | Exponential backoff multiplier |
| `MAX_BACKOFF_MS` | `10000` | Maximum cap on retry backoff delay (ms) |
| `ALERT_COOLDOWN_MS` | `300000` | Cooldown period between repeated failure alerts (5 mins) |
| `METRICS_ENABLED` | `true` | Enable built-in HTTP server |
| `METRICS_PORT` | `9090` | HTTP server port for `/metrics` and `/status` |
| `WEBHOOK_ENABLED` | `false` | Enable Webhook alert channel |
| `WEBHOOK_URL` | — | Webhook destination URL |
| `SLACK_ENABLED` | `false` | Enable Slack Webhook alert channel |
| `SLACK_WEBHOOK_URL` | — | Incoming Slack Webhook URL |
| `EMAIL_ENABLED` | `false` | Enable Email SMTP alert channel |
| `SMTP_HOST` | — | SMTP Host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | `587` | SMTP Port |
| `SMTP_USER` | — | SMTP authentication user |
| `SMTP_PASS` | — | SMTP authentication password/app key |
| `EMAIL_FROM` | — | Sender email address |
| `EMAIL_TO` | — | Comma-separated recipient email addresses |

---

## 💻 Programmatic Usage (Library API)

You can import `HealthMonitor` into any existing Node.js / Nest.js / Express TypeScript application:

```typescript
import { HealthMonitor } from './health-monitor/src/index';

const monitor = new HealthMonitor({
  services: [
    {
      id: 'billing-api',
      name: 'Billing Backend API',
      url: 'https://api.cabbs.com/health',
      expectedStatus: 200,
      timeoutMs: 5000,
      checkIntervalMs: 60000,
    },
    {
      id: 'render-microservice',
      name: 'Render Service (KeepAlive)',
      url: 'https://service.onrender.com/health',
      expectedStatus: 200,
      timeoutMs: 10000,
      checkIntervalMs: 300000, // Every 5 min keeps Render warm
    },
  ],
  retry: {
    maxRetries: 3,
    initialBackoffMs: 1000,
    backoffFactor: 2,
    maxBackoffMs: 10000,
  },
  alerts: {
    alertCooldownMs: 300000,
    slack: {
      enabled: true,
      webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
    },
  },
  metricsServer: {
    enabled: true,
    port: 9090,
  },
});

// Start checking
await monitor.start();

// Access runtime statistics
const stats = monitor.getUptimeTracker().getAllStats();
console.log(stats);

// Graceful shutdown
// await monitor.stop();
```

---

## 📊 Prometheus Metrics & Status Endpoint

When `METRICS_ENABLED=true`, an HTTP server starts on port `9090`.

### Scrape Endpoint: `GET http://localhost:9090/metrics`

Prometheus metrics exposed:

- `http_health_check_duration_seconds`: Gauge of request response time.
- `http_health_check_status`: Gauge (1 for healthy, 0 for unhealthy).
- `http_health_check_uptime_ratio`: Gauge (0.0 to 1.0 ratio).
- `http_health_check_total`: Counter of completed checks with `result="success"|"failure"`.

### JSON Status Endpoint: `GET http://localhost:9090/status`

Sample Output:

```json
{
  "status": "OK",
  "timestamp": "2026-08-05T16:45:00.000Z",
  "servicesCount": 1,
  "services": [
    {
      "serviceId": "service-1",
      "serviceName": "Billing Backend",
      "url": "http://localhost:3000/health",
      "totalChecks": 12,
      "successfulChecks": 12,
      "failedChecks": 0,
      "uptimePercentage": 100,
      "uptimeRatio": 1,
      "consecutiveSuccesses": 12,
      "consecutiveFailures": 0,
      "lastResponseTimeMs": 14,
      "avgResponseTimeMs": 18,
      "lastStatus": "HEALTHY",
      "lastCheckTimestamp": "2026-08-05T16:45:00.000Z"
    }
  ]
}
```

---

## 🧪 Testing

Run Jest unit test suite:

```bash
npm test
```

Run test coverage report:

```bash
npm run test:coverage
```

---

## 📜 License

MIT License. Designed and crafted for production reliability.
