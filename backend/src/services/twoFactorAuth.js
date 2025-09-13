const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { logger } = require('../utils/monitoring');

/**
 * Two-Factor Authentication Service
 * Handles TOTP (Time-based One-Time Password) generation and verification
 */
class TwoFactorAuthService {
  /**
   * Generate a secret for 2FA setup
   */
  static generateSecret(userEmail, serviceName = 'NanoInfluencer Marketplace') {
    try {
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: serviceName,
        length: 32
      });

      return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      logger.error('Failed to generate 2FA secret', { 
        error: error.message, 
        userEmail 
      });
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Generate QR code for 2FA setup
   */
  static async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataURL;
    } catch (error) {
      logger.error('Failed to generate QR code', { 
        error: error.message 
      });
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify TOTP token
   */
  static verifyToken(secret, token, window = 1) {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window, // Allow tokens from previous/next time steps
        time: Math.floor(Date.now() / 1000)
      });

      logger.debug('2FA token verification', { 
        verified,
        window 
      });

      return verified;
    } catch (error) {
      logger.error('Failed to verify 2FA token', { 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Generate backup codes for account recovery
   */
  static generateBackupCodes(count = 8) {
    try {
      const codes = [];
      
      for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric code
        const code = Math.random().toString(36).substr(2, 4).toUpperCase() + 
                    Math.random().toString(36).substr(2, 4).toUpperCase();
        codes.push(code);
      }

      return codes;
    } catch (error) {
      logger.error('Failed to generate backup codes', { 
        error: error.message 
      });
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Validate backup code format
   */
  static isValidBackupCodeFormat(code) {
    // Backup codes should be 8 alphanumeric characters
    return /^[A-Z0-9]{8}$/.test(code);
  }

  /**
   * Generate recovery token for disabling 2FA
   */
  static generateRecoveryToken() {
    try {
      // Generate a secure random token
      const token = require('crypto').randomBytes(32).toString('hex');
      return token;
    } catch (error) {
      logger.error('Failed to generate recovery token', { 
        error: error.message 
      });
      throw new Error('Failed to generate recovery token');
    }
  }

  /**
   * Check if 2FA is required based on user settings and risk assessment
   */
  static shouldRequire2FA(user, request = null) {
    // Always require for admin users
    if (user.role === 'admin') {
      return true;
    }

    // Check user's 2FA preference
    if (!user.two_factor_enabled) {
      return false;
    }

    // Risk-based assessment (optional)
    if (request) {
      const riskFactors = this.assessRiskFactors(user, request);
      return riskFactors.requiresTwoFactor;
    }

    return user.two_factor_enabled;
  }

  /**
   * Assess risk factors for conditional 2FA
   */
  static assessRiskFactors(user, request) {
    const factors = {
      newDevice: false,
      unusualLocation: false,
      unusualTime: false,
      highValueAction: false,
      requiresTwoFactor: false
    };

    try {
      // Check for new device (simplified - in production, use device fingerprinting)
      const userAgent = request.get('User-Agent');
      if (userAgent && user.known_devices && 
          !user.known_devices.includes(userAgent)) {
        factors.newDevice = true;
      }

      // Check for unusual IP/location (simplified - in production, use GeoIP)
      const clientIP = request.ip;
      if (clientIP && user.known_ips && 
          !user.known_ips.includes(clientIP)) {
        factors.unusualLocation = true;
      }

      // Check for unusual time (outside normal hours)
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 22) {
        factors.unusualTime = true;
      }

      // Determine if 2FA is required based on risk factors
      factors.requiresTwoFactor = factors.newDevice || 
                                  factors.unusualLocation || 
                                  user.two_factor_enabled;

      logger.debug('Risk assessment completed', {
        userId: user.id,
        factors
      });

      return factors;
    } catch (error) {
      logger.error('Risk assessment failed', {
        error: error.message,
        userId: user.id
      });
      
      // Default to requiring 2FA on error
      return { ...factors, requiresTwoFactor: true };
    }
  }

  /**
   * Rate limiting for 2FA attempts
   */
  static async checkRateLimit(userId, attemptType = '2fa_verify') {
    // This would integrate with your rate limiting system
    // For now, we'll implement a simple in-memory rate limiter
    
    const rateLimitKey = `${attemptType}:${userId}`;
    const maxAttempts = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes
    
    // In production, use Redis for distributed rate limiting
    if (!this._rateLimitStore) {
      this._rateLimitStore = new Map();
    }
    
    const now = Date.now();
    const attempts = this._rateLimitStore.get(rateLimitKey) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(timestamp => 
      now - timestamp < windowMs
    );
    
    if (validAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...validAttempts);
      const timeUntilReset = windowMs - (now - oldestAttempt);
      
      throw new Error(`Too many attempts. Try again in ${Math.ceil(timeUntilReset / 1000 / 60)} minutes.`);
    }
    
    // Record this attempt
    validAttempts.push(now);
    this._rateLimitStore.set(rateLimitKey, validAttempts);
    
    return {
      attemptsRemaining: maxAttempts - validAttempts.length,
      resetTime: new Date(now + windowMs)
    };
  }

  /**
   * Clear rate limit for successful authentication
   */
  static clearRateLimit(userId, attemptType = '2fa_verify') {
    const rateLimitKey = `${attemptType}:${userId}`;
    if (this._rateLimitStore) {
      this._rateLimitStore.delete(rateLimitKey);
    }
  }
}

module.exports = TwoFactorAuthService;