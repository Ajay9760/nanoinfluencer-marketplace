const promClient = require('prom-client');
const winston = require('winston');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'nanoinfluencer-marketplace'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

const databaseOperationsTotal = new promClient.Counter({
  name: 'database_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'table', 'status'],
  registers: [register]
});

const databaseOperationDuration = new promClient.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1.0],
  registers: [register]
});

const activeUsersGauge = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Number of currently active users',
  registers: [register]
});

const campaignsGauge = new promClient.Gauge({
  name: 'campaigns_total',
  help: 'Total number of campaigns',
  labelNames: ['status'],
  registers: [register]
});

const authFailuresTotal = new promClient.Counter({
  name: 'auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['reason'],
  registers: [register]
});

// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'nanoinfluencer-marketplace' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    })
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Middleware to track HTTP request metrics
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  });
  
  next();
};

/**
 * Database operation metrics wrapper
 */
const trackDatabaseOperation = async (operation, table, queryFunction) => {
  const start = Date.now();
  let status = 'success';
  
  try {
    const result = await queryFunction();
    return result;
  } catch (error) {
    status = 'error';
    logger.error('Database operation failed', {
      operation,
      table,
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    const duration = (Date.now() - start) / 1000;
    databaseOperationsTotal.inc({ operation, table, status });
    databaseOperationDuration.observe({ operation, table }, duration);
  }
};

/**
 * Update active users count
 */
const updateActiveUsers = (count) => {
  activeUsersGauge.set(count);
};

/**
 * Update campaigns count by status
 */
const updateCampaignsCount = (status, count) => {
  campaignsGauge.set({ status }, count);
};

/**
 * Track authentication failure
 */
const trackAuthFailure = (reason) => {
  authFailuresTotal.inc({ reason });
  logger.warn('Authentication failure', { reason });
};

/**
 * Health check function
 */
const healthCheck = async () => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'connected', // This should be checked against actual DB connection
    dependencies: {}
  };
  
  try {
    // Add database connection check here
    // const dbStatus = await checkDatabaseConnection();
    // checks.database = dbStatus ? 'connected' : 'disconnected';
    
    // Add external service checks here if needed
    // checks.dependencies.redis = await checkRedisConnection();
    // checks.dependencies.emailService = await checkEmailService();
    
  } catch (error) {
    checks.status = 'unhealthy';
    checks.error = error.message;
    logger.error('Health check failed', { error: error.message });
  }
  
  return checks;
};

/**
 * Performance monitoring utilities
 */
const performanceTimer = (label) => {
  const start = process.hrtime.bigint();
  
  return {
    end: () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      logger.debug('Performance timer', { label, duration: `${duration}ms` });
      return duration;
    }
  };
};

/**
 * Error handler with monitoring
 */
const errorHandler = (error, req, res, next) => {
  const errorId = Math.random().toString(36).substring(2, 15);
  
  logger.error('Unhandled error', {
    errorId,
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  
  // Track error metrics
  httpRequestsTotal.inc({ 
    method: req.method, 
    route: req.route ? req.route.path : req.path, 
    status_code: '500' 
  });
  
  // Don't expose error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal server error',
      errorId,
      message: 'An unexpected error occurred'
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      errorId,
      message: error.message,
      stack: error.stack
    });
  }
};

module.exports = {
  register,
  logger,
  metricsMiddleware,
  trackDatabaseOperation,
  updateActiveUsers,
  updateCampaignsCount,
  trackAuthFailure,
  healthCheck,
  performanceTimer,
  errorHandler,
  metrics: {
    httpRequestsTotal,
    httpRequestDuration,
    databaseOperationsTotal,
    databaseOperationDuration,
    activeUsersGauge,
    campaignsGauge,
    authFailuresTotal
  }
};