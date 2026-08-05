module.exports = {
  apps: [
    {
      name: 'backend-30s-pinger',
      script: './dist/pinger.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
        PING_TARGET_URL: 'https://cab-billing-system.onrender.com/health',
        PING_INTERVAL_MS: '30000',
        PING_MAX_RETRIES: '3',
      },
      env_production: {
        NODE_ENV: 'production',
        PING_TARGET_URL: 'https://cab-billing-system.onrender.com/health',
        PING_INTERVAL_MS: '30000',
        PING_MAX_RETRIES: '3',
      },
    },
  ],
};
