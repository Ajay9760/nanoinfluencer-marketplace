// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Import security and monitoring modules
const { initSentry, requestHandler, tracingHandler, errorHandler: sentryErrorHandler, performanceMiddleware } = require('./utils/sentry');
const { generalLimiter, authLimiter, securityHeaders, sanitizeRequest } = require('./middleware/security');
const { logger, metricsMiddleware, healthCheck, errorHandler: monitoringErrorHandler, register } = require('./utils/monitoring');

// Import database and models
const { testConnection, sequelize } = require('./config/database');
const models = require('./models'); // This handles all models and associations

// Initialize Sentry first (before other imports)
initSentry();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for proper IP detection (needed for rate limiting)
app.set('trust proxy', 1);

// Sentry request handling (must be first)
app.use(requestHandler());
app.use(tracingHandler());

// Security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Request sanitization
app.use(sanitizeRequest);

// Cookie parsing middleware
app.use(cookieParser());

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging middleware (structured logging for production)
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { 
    stream: { 
      write: (message) => logger.info(message.trim()) 
    } 
  }));
} else {
  app.use(morgan('dev'));
}

// Performance and metrics middleware
app.use(performanceMiddleware);
app.use(metricsMiddleware);

// General rate limiting
app.use(generalLimiter);

// Health check endpoint with comprehensive monitoring
app.get('/api/health', async (req, res) => {
  try {
    const health = await healthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message, stack: error.stack });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Metrics collection failed', { error: error.message });
    res.status(500).end('Error collecting metrics');
  }
});

// Root route with API information
app.get('/', (req, res) => {
  res.json({
    name: 'NanoInfluencer Marketplace API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      metrics: '/metrics',
      auth: '/api/auth',
      campaigns: '/api/campaigns',
      applications: '/api/applications',
      socialMedia: '/api/social-media',
      analytics: '/api/analytics',
      search: '/api/search',
      profile: '/api/profile',
      influencers: '/api/influencers',
      payments: '/api/payments'
    },
    documentation: 'API documentation available at /api-docs (when implemented)'
  });
});

// API routes with specific rate limiting
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/social-media', require('./routes/socialMedia'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/search', require('./routes/search'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/influencers', require('./routes/influencers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/uploads', require('./routes/uploads'));

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler());

// Global error handler with monitoring
app.use(monitoringErrorHandler);

// Initialize virus scan worker
const { initializeVirusScanWorker } = require('./workers/virusScanWorker');

// Initialize database and start server
const startServer = async () => {
  try {
    logger.info('Starting NanoInfluencer Marketplace server...');
    
    // Test database connection
    await testConnection();
    logger.info('Database connection established successfully');
    
    // Model associations are already configured in models/index.js
    logger.info('Model associations configured');
    
    // Sync database models (create tables if they don't exist)
    // Use force: true to recreate tables with new schema during development
    await sequelize.sync({ force: process.env.NODE_ENV !== 'production', alter: process.env.NODE_ENV === 'production' });
    logger.info('Database models synchronized successfully');
    
    // Initialize virus scan worker
    if (process.env.ENABLE_VIRUS_SCANNER !== 'false') {
      initializeVirusScanWorker();
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info('NanoInfluencer API server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthCheck: `http://localhost:${PORT}/api/health`,
        metrics: `http://localhost:${PORT}/metrics`,
        timestamp: new Date().toISOString()
      });
      
      // Console logs for development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🚀 NanoInfluencer API server running on port ${PORT}`);
        console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
        console.log(`📈 Metrics available at http://localhost:${PORT}/metrics`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('✅ Server startup completed successfully!');
      }
    });
    
    // Set keep-alive timeout for load balancers
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  console.log(`🔄 ${signal} received. Shutting down gracefully...`);
  
  try {
    // Close database connections
    await sequelize.close();
    logger.info('Database connections closed');
    
    // Close Prometheus registry
    register.clear();
    
    logger.info('Server shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;