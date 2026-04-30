const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const Sentry       = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const client       = require('prom-client');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const compression  = require('compression');
const app          = express();

// Initialize Sentry FIRST before any other middleware
Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",
  integrations: [
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

// Configure Prometheus Metrics Collection
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'monaj_core_' });

// --- Rate Limiters ---
// General API limiter: 200 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many requests from this IP, please try again after 15 minutes.' },
});

// Strict limiter for auth routes: 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many login/register attempts. Please try again after 15 minutes.' },
});

// --- Security Middleware ---
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://lh3.googleusercontent.com"],
      connectSrc: ["'self'", "https://monaj-frontend.vercel.app", "https://manaj-backend.onrender.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "no-referrer" },
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'https://monaj-frontend.vercel.app', 'https://manaj-backend.onrender.com'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// --------------------------------------------------------------------------
// Custom XSS + NoSQL Injection sanitization (both xss-clean and
// express-mongo-sanitize crash on Express v5 because req.query became a
// read-only getter; we replicate their protection manually)
// --------------------------------------------------------------------------
const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const sanitizeValue = (val) => {
  if (typeof val === 'string') return escapeHtml(val);
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === 'object') return sanitizeObj(val);
  return val;
};

const sanitizeObj = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    // Strip NoSQL injection operators (keys starting with '$' or containing '.')
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      obj[key] = sanitizeValue(obj[key]);
    }
  }
  return obj;
};

app.use((req, _res, next) => {
  if (req.body) sanitizeObj(req.body);
  if (req.params) sanitizeObj(req.params);
  // Do NOT mutate req.query (read-only in Express v5). Query params are
  // sanitized at controller level or validated via schema.
  next();
});

app.use(morgan('dev'));
app.use(compression()); // Compress all responses
app.use(cookieParser()); // Parse httpOnly refresh token cookies

// Performance Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[SLOW API] ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });
  next();
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

const { isVerified, auth } = require('./middleware/auth.middleware');

// Routes
app.use('/api/auth', require('./routes/auth.routes.js'));
app.use('/api/users', require('./routes/user.routes.js'));
app.use('/api/listings', require('./routes/listing.routes.js'));
app.use('/api/posts', require('./routes/buying-post.routes.js'));
app.use('/api/orders', require('./routes/order.routes.js'));
app.use('/api/admin', require('./routes/admin.routes.js'));
app.use('/api/knowledge', require('./routes/knowledge.routes.js'));

// Role-specific RBAC routes
app.use('/api/farmer', require('./routes/farmer.routes.js'));
app.use('/api/seller', require('./routes/seller.routes.js'));
app.use('/api/trader', require('./routes/trader.routes.js'));
app.use('/api/hatchery', require('./routes/hatchery.routes.js'));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Expose a route for Prometheus to scrape
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Basic Route
app.get('/', (_req, res) => {
  res.send('Fish Marketplace API is running...');
});

// Optional fake error route to test Sentry
app.get('/debug-sentry', function mainHandler(_req, _res) {
  throw new Error('My first Sentry error!');
});

// Sentry error handler must be before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

// Global error handler
app.use((err, _req, res, _next) => {
  // Log full error internally
  console.error(err.stack);

  // Return clean message to client
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({ 
    msg: err.message || 'Internal Server Error',
    ...(isProd ? {} : { stack: err.stack }) // Hide stack in production
  });
});

module.exports = app;
