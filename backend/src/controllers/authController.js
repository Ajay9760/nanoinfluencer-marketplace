const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { 
  generateTokenPair, 
  verifyRefreshToken, 
  generateTokenHash, 
  getTokenExpirationDate, 
  REFRESH_TOKEN_EXPIRES_IN 
} = require('../utils/jwt');
const { validationResult } = require('express-validator');

/**
 * Set httpOnly refresh token cookie
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/api/auth' // Restrict cookie to auth endpoints
  };
  
  res.cookie('refreshToken', refreshToken, cookieOptions);
};

/**
 * Clear refresh token cookie
 */
const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth'
  });
};

/**
 * Get client IP address
 */
const getClientIp = (req) => {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
};

/**
 * Create and store refresh token
 */
const createAndStoreRefreshToken = async (user, refreshToken, req) => {
  const decoded = verifyRefreshToken(refreshToken);
  const tokenHash = generateTokenHash(refreshToken);
  const expiresAt = getTokenExpirationDate(REFRESH_TOKEN_EXPIRES_IN);
  const clientIp = getClientIp(req);
  
  await RefreshToken.createToken(
    user.id,
    tokenHash,
    decoded.jti,
    expiresAt,
    clientIp
  );
  
  return { tokenHash, jti: decoded.jti };
};

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { name, email, password, role = 'influencer' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        error: 'Registration failed',
        message: 'User with this email already exists'
      });
    }

    // Hash password manually
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create new user
    const user = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
      role,
      status: 'active' // Auto-activate for demo purposes
    });

    // Generate JWT tokens
    const tokens = generateTokenPair(user);

    // Store refresh token in database
    await createAndStoreRefreshToken(user, tokens.refreshToken, req);

    // Set httpOnly cookie for refresh token
    setRefreshTokenCookie(res, tokens.refreshToken);

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      accessToken: tokens.accessToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn
      // Note: refreshToken is not sent in response, only in httpOnly cookie
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account access denied',
        message: 'Your account is not active. Please contact support.'
      });
    }

    // Generate JWT tokens
    const tokens = generateTokenPair(user);

    // Store refresh token in database
    await createAndStoreRefreshToken(user, tokens.refreshToken, req);

    // Set httpOnly cookie for refresh token
    setRefreshTokenCookie(res, tokens.refreshToken);

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      accessToken: tokens.accessToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn
      // Note: refreshToken is not sent in response, only in httpOnly cookie
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    });
  }
};

/**
 * Refresh access token using refresh token with rotation
 */
const refreshToken = async (req, res) => {
  try {
    // Get refresh token from httpOnly cookie or fallback to body (for backward compatibility)
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const clientIp = getClientIp(req);

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: 'No refresh token provided'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      });
    }

    // Find the stored refresh token
    const tokenHash = generateTokenHash(refreshToken);
    const storedToken = await RefreshToken.findByTokenHash(tokenHash);

    if (!storedToken) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token not found or has been revoked'
      });
    }

    // Check if token is active (not revoked and not expired)
    if (!storedToken.isActive()) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: 'Token expired or revoked',
        message: 'Please login again'
      });
    }

    const user = storedToken.user;
    if (!user) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'User not found'
      });
    }

    if (user.status !== 'active') {
      clearRefreshTokenCookie(res);
      return res.status(403).json({
        error: 'Account access denied',
        message: 'Your account is not active'
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair(user);
    const newTokenHash = generateTokenHash(tokens.refreshToken);

    // Revoke old refresh token and create new one (token rotation)
    await storedToken.revoke(clientIp, newTokenHash);
    await createAndStoreRefreshToken(user, tokens.refreshToken, req);

    // Set new refresh token cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.json({
      message: 'Token refreshed successfully',
      user: user.toJSON(),
      accessToken: tokens.accessToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn
      // Note: New refresh token is in httpOnly cookie, old one is revoked
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    clearRefreshTokenCookie(res);
    res.status(401).json({
      error: 'Token refresh failed',
      message: 'An error occurred during token refresh'
    });
  }
};

/**
 * Logout user and revoke refresh token
 */
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const clientIp = getClientIp(req);

    if (refreshToken) {
      try {
        const tokenHash = generateTokenHash(refreshToken);
        const storedToken = await RefreshToken.findByTokenHash(tokenHash);
        
        if (storedToken && storedToken.isActive()) {
          await storedToken.revoke(clientIp);
        }
      } catch (error) {
        // Log error but don't fail logout
        console.error('Error revoking refresh token during logout:', error);
      }
    }

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Always clear cookie even if there was an error
    clearRefreshTokenCookie(res);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    res.json({
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'Internal server error'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { name, phone } = req.body;
    const user = req.user;

    await user.update({
      name: name || user.name,
      phone: phone || user.phone
    });

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Internal server error'
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verify current password
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Password change failed',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await user.update({ password: newPassword });

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'Internal server error'
    });
  }
};

/**
 * Google OAuth login/registration
 */
const googleLogin = async (req, res) => {
  try {
    const { credential, role = 'influencer' } = req.body;

    if (!credential) {
      return res.status(400).json({
        error: 'Google credential required',
        message: 'Please provide Google credential token'
      });
    }

    let googleUser;
    
    // If Google Client ID is configured, verify the token
    if (process.env.GOOGLE_CLIENT_ID) {
      try {
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        googleUser = ticket.getPayload();
      } catch (verificationError) {
        console.error('Google token verification failed:', verificationError);
        return res.status(400).json({
          error: 'Invalid Google token',
          message: 'Google token verification failed'
        });
      }
    } else {
      // For development/demo purposes, decode the JWT without verification
      // WARNING: This should NEVER be used in production!
      try {
        const jwt = require('jsonwebtoken');
        googleUser = jwt.decode(credential);
        
        if (!googleUser || !googleUser.email) {
          return res.status(400).json({
            error: 'Invalid Google credential',
            message: 'Could not decode Google user information'
          });
        }
      } catch (decodeError) {
        console.error('Failed to decode Google credential:', decodeError);
        return res.status(400).json({
          error: 'Invalid Google credential format',
          message: 'Google credential could not be processed'
        });
      }
    }

    // Check if user already exists
    const { Op } = require('sequelize');
    let user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: googleUser.email },
          { googleId: googleUser.sub || googleUser.id }
        ]
      } 
    });

    if (!user) {
      // Create new user
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.sub || googleUser.id,
        profilePicture: googleUser.picture,
        role,
        status: 'active',
        authProvider: 'google'
      });
    } else {
      // Update existing user with Google info if missing
      const updateData = {};
      if (!user.googleId) updateData.googleId = googleUser.sub || googleUser.id;
      if (!user.profilePicture && googleUser.picture) updateData.profilePicture = googleUser.picture;
      if (!user.authProvider) updateData.authProvider = 'google';
      
      if (Object.keys(updateData).length > 0) {
        await user.update(updateData);
      }
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account access denied',
        message: 'Your account is not active. Please contact support.'
      });
    }

    // Generate JWT tokens
    const tokens = generateTokenPair(user);

    // Store refresh token in database
    await createAndStoreRefreshToken(user, tokens.refreshToken, req);

    // Set httpOnly cookie for refresh token
    setRefreshTokenCookie(res, tokens.refreshToken);

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    res.json({
      message: 'Google login successful',
      user: user.toJSON(),
      accessToken: tokens.accessToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn
      // Note: refreshToken is not sent in response, only in httpOnly cookie
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      error: 'Google login failed',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  googleLogin
};
