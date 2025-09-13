const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * General API rate limiting
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.round(15 * 60 * 1000 / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.round(15 * 60 * 1000 / 1000)
    });
  }
});

/**
 * Strict rate limiting for auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: Math.round(15 * 60 * 1000 / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: Math.round(15 * 60 * 1000 / 1000)
    });
  }
});

/**
 * Create campaign rate limiting
 */
const createCampaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 campaign creations per hour
  message: {
    error: 'Too many campaigns created',
    message: 'You have created too many campaigns. Please try again later.',
    retryAfter: Math.round(60 * 60 * 1000 / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many campaigns created',
      message: 'You have created too many campaigns. Please try again later.',
      retryAfter: Math.round(60 * 60 * 1000 / 1000)
    });
  }
});

/**
 * Security headers configuration
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: "no-referrer-when-downgrade"
  }
});

/**
 * IP whitelist middleware for admin endpoints
 */
const adminIPWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (process.env.NODE_ENV === 'development') {
      return next(); // Skip IP restriction in development
    }
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      return next();
    }
    
    res.status(403).json({
      error: 'Access forbidden',
      message: 'Your IP address is not authorized to access this endpoint'
    });
  };
};

/**
 * Request sanitization middleware
 */
const sanitizeRequest = (req, res, next) => {
  // Remove potentially dangerous characters from query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = req.query[key].replace(/[<>\"']/g, '');
    }
  }
  
  // Limit request body size (handled by express.json middleware, but double-check)
  if (req.body && JSON.stringify(req.body).length > 1024 * 1024) { // 1MB limit
    return res.status(413).json({
      error: 'Request too large',
      message: 'Request body exceeds maximum size limit'
    });
  }
  
  next();
};

/**
 * Security event logging
 */
const logSecurityEvent = (req, eventType, details = {}) => {
  const securityEvent = {
    timestamp: new Date().toISOString(),
    type: eventType,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    ...details
  };
  
  // Log to security log file or external service
  console.warn('[SECURITY EVENT]', JSON.stringify(securityEvent));
  
  // In production, you might want to send this to a SIEM or alerting system
  if (process.env.NODE_ENV === 'production') {
    // Send to external security monitoring service
    // Example: sendToSecurityService(securityEvent);
  }
};

module.exports = {
  generalLimiter,
  authLimiter,
  createCampaignLimiter,
  securityHeaders,
  adminIPWhitelist,
  sanitizeRequest,
  logSecurityEvent
};