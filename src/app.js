const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const client = require('prom-client');

const app = express();

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0", // Replace with real DSN
  integrations: [
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

// Configure Prometheus Metrics Collecton
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'monaj_core_' });

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/listings', require('./routes/listingRoutes.js'));
app.use('/api/posts', require('./routes/buyingPostRoutes.js'));
app.use('/api/admin', require('./routes/adminRoutes.js'));
app.use('/api/knowledge', require('./routes/knowledgeRoutes.js'));
// Auth, User, and Order routes removed because they are now independent Microservices

// Expose a route for Prometheus to scrape
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

// Basic Route
app.get('/', (req, res) => {
    res.send('Fish Marketplace API is running...');
});

// Optional fake error route to test Sentry
app.get('/debug-sentry', function mainHandler(req, res) {
    throw new Error('My first Sentry error!');
});

// Sentry error handler must be before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

module.exports = app;
