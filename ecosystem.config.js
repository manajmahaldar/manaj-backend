module.exports = {
  apps: [
    {
      name: 'monaj-api',
      script: './src/server.js',
      instances: 'max', // Spread across all available CPU cores
      exec_mode: 'cluster', // Enables Node.js clustering
      watch: false, // Don't restart on every file change in production mode
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
