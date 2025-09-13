// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Import security and monitoring modules
const { initSentry, requestHandler, tracingHandler, errorHandler: sentryErrorHandler, performanceMiddleware } = require('./utils/sentry');
const { generalLimiter, authLimiter, securityHeaders, sanitizeRequest } = require('./middleware/security');
const { logger, metricsMiddleware, healthCheck, errorHandler: monitoringErrorHandler, register } = require('./utils/monitoring');

// Import database and models
const { testConnection, sequelize } = require('./config/database');
const User = require('./models/User');
const Campaign = require('./models/Campaign');

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

// API routes with specific rate limiting
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/campaigns', require('./routes/campaigns'));
// Additional routes will be added here
// app.use('/api/influencers', require('./routes/influencers'));
// app.use('/api/brands', require('./routes/brands'));
// app.use('/api/payments', require('./routes/payments'));
// app.use('/api/analytics', require('./routes/analytics'));

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

// Initialize database and start server
const startServer = async () => {
  try {
    logger.info('Starting NanoInfluencer Marketplace server...');
    
    // Test database connection
    await testConnection();
    logger.info('Database connection established successfully');
    
    // Set up model associations
    const models = { User, Campaign };
    Object.keys(models).forEach(modelName => {
      if (models[modelName].associate) {
        models[modelName].associate(models);
      }
    });
    logger.info('Model associations configured');
    
    // Sync database models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    logger.info('Database models synchronized successfully');
    
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