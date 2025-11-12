const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Use environment variables with secure defaults for production
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-super-secret-access-key-change-in-production-min-32-chars';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-super-secret-refresh-key-change-in-production-min-32-chars';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // Refresh tokens last longer

// Backward compatibility
const JWT_SECRET = ACCESS_TOKEN_SECRET;
const JWT_EXPIRES_IN = ACCESS_TOKEN_EXPIRES_IN;
const JWT_REFRESH_SECRET = REFRESH_TOKEN_SECRET;
const JWT_REFRESH_EXPIRES_IN = REFRESH_TOKEN_EXPIRES_IN;

/**
 * Generate secure random token hash
 */
const generateTokenHash = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate JWT access token (short-lived)
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'nanoinfluencer-api',
    audience: 'nanoinfluencer-client'
  });
};

/**
 * Generate JWT refresh token (longer-lived)
 */
const generateRefreshToken = (payload) => {
  // Add random jti (JWT ID) for token rotation
  const tokenPayload = {
    ...payload,
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'nanoinfluencer-api',
    audience: 'nanoinfluencer-client'
  });
};

/**
 * Verify JWT access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET, {
      issuer: 'nanoinfluencer-api',
      audience: 'nanoinfluencer-client'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Verify JWT refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: 'nanoinfluencer-api',
      audience: 'nanoinfluencer-client'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw new Error('Refresh token verification failed');
  }
};

/**
 * Generate both access and refresh tokens
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN
  };
};

/**
 * Calculate token expiration date
 */
const getTokenExpirationDate = (expiresIn) => {
  const now = new Date();
  const duration = parseDuration(expiresIn);
  return new Date(now.getTime() + duration);
};

/**
 * Parse duration string to milliseconds
 */
const parseDuration = (duration) => {
  const units = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };
  
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid duration format');
  }
  
  const [, value, unit] = match;
  return parseInt(value) * units[unit];
};

/**
 * Extract token from Authorization header
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  extractTokenFromHeader,
  generateTokenHash,
  getTokenExpirationDate,
  parseDuration,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
};
