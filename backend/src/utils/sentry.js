const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry error tracking
 */
const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not provided, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    integrations: [
      // Enable profiling
      nodeProfilingIntegration(),
      // HTTP integration
      new Sentry.Integrations.Http({ tracing: true }),
      // Express integration
      new Sentry.Integrations.Express({ app: null }) // Will be set when app is available
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Data filtering
    beforeSend(event) {
      // Don't send events in test environment
      if (process.env.NODE_ENV === 'test') {
        return null;
      }
      
      // Filter out sensitive information
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers['x-api-key'];
        }
        
        // Remove sensitive query parameters
        if (event.request.query_string) {
          event.request.query_string = event.request.query_string
            .replace(/password=[^&]*/g, 'password=[FILTERED]')
            .replace(/token=[^&]*/g, 'token=[FILTERED]')
            .replace(/api_key=[^&]*/g, 'api_key=[FILTERED]');
        }
      }
      
      // Filter out form data
      if (event.request && event.request.data) {
        if (typeof event.request.data === 'object') {
          const filtered = { ...event.request.data };
          if (filtered.password) filtered.password = '[FILTERED]';
          if (filtered.token) filtered.token = '[FILTERED]';
          if (filtered.apiKey) filtered.apiKey = '[FILTERED]';
          if (filtered.api_key) filtered.api_key = '[FILTERED]';
          event.request.data = filtered;
        }
      }
      
      return event;
    },
    // Tag all events with server info
    initialScope: {
      tags: {
        component: 'backend',
        server: process.env.SERVER_NAME || 'unknown'
      }
    }
  });

  console.log('Sentry initialized successfully');
};

/**
 * Capture exception with context
 */
const captureException = (error, context = {}) => {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.withScope((scope) => {
    // Add context information
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
        role: context.user.role
      });
    }
    
    if (context.request) {
      scope.setContext('request', {
        url: context.request.originalUrl,
        method: context.request.method,
        ip: context.request.ip,
        userAgent: context.request.get('User-Agent')
      });
    }
    
    if (context.extra) {
      Object.keys(context.extra).forEach(key => {
        scope.setExtra(key, context.extra[key]);
      });
    }
    
    if (context.tags) {
      Object.keys(context.tags).forEach(key => {
        scope.setTag(key, context.tags[key]);
      });
    }
    
    // Set level if provided
    if (context.level) {
      scope.setLevel(context.level);
    }
    
    Sentry.captureException(error);
  });
};

/**
 * Capture message with context
 */
const captureMessage = (message, level = 'info', context = {}) => {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.withScope((scope) => {
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
        role: context.user.role
      });
    }
    
    if (context.extra) {
      Object.keys(context.extra).forEach(key => {
        scope.setExtra(key, context.extra[key]);
      });
    }
    
    if (context.tags) {
      Object.keys(context.tags).forEach(key => {
        scope.setTag(key, context.tags[key]);
      });
    }
    
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
};

/**
 * Express middleware for request handling
 */
const requestHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next(); // No-op middleware
  }
  
  return Sentry.Handlers.requestHandler({
    // Include request body in breadcrumbs
    request: ['cookies', 'data', 'headers', 'method', 'query_string', 'url'],
    // Don't include the user
    user: false
  });
};

/**
 * Express middleware for tracing
 */
const tracingHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next(); // No-op middleware
  }
  
  return Sentry.Handlers.tracingHandler();
};

/**
 * Express error handler
 */
const errorHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err); // Pass through to next error handler
  }
  
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Don't report certain types of errors
      if (error.status && error.status < 500) {
        return false;
      }
      
      // Don't report validation errors
      if (error.name === 'ValidationError') {
        return false;
      }
      
      // Don't report authentication errors
      if (error.name === 'UnauthorizedError') {
        return false;
      }
      
      return true;
    }
  });
};

/**
 * Add user context to current scope
 */
const setUser = (user) => {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
    username: user.username
  });
};

/**
 * Clear user context
 */
const clearUser = () => {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 */
const addBreadcrumb = (message, category = 'default', level = 'info', data = {}) => {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data
  });
};

/**
 * Start a transaction for performance monitoring
 */
const startTransaction = (name, op = 'http') => {
  if (!process.env.SENTRY_DSN) return null;
  
  return Sentry.startTransaction({ name, op });
};

/**
 * Performance monitoring middleware
 */
const performanceMiddleware = (req, res, next) => {
  if (!process.env.SENTRY_DSN) {
    return next();
  }
  
  const transaction = Sentry.startTransaction({
    op: 'http',
    name: `${req.method} ${req.path}`,
    data: {
      url: req.originalUrl,
      method: req.method,
      query: req.query
    }
  });
  
  // Add transaction to request for access in routes
  req.transaction = transaction;
  
  res.on('finish', () => {
    transaction.setHttpStatus(res.statusCode);
    transaction.finish();
  });
  
  next();
};

/**
 * Custom integration for database operations
 */
class DatabaseIntegration {
  static id = 'DatabaseIntegration';
  name = DatabaseIntegration.id;
  
  setupOnce() {
    // This would integrate with your ORM to track database queries
    console.log('Database integration initialized');
  }
}

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  requestHandler,
  tracingHandler,
  errorHandler,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  performanceMiddleware,
  DatabaseIntegration,
  Sentry // Export Sentry instance for advanced usage
};