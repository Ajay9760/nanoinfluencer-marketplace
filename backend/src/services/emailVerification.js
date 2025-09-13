const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/monitoring');
const { getSecrets } = require('../utils/secrets');

/**
 * Email Verification Service
 * Handles email verification tokens, sending verification emails, and email validation
 */
class EmailVerificationService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  async initializeTransporter() {
    try {
      // In development, use Mailhog or test account
      if (process.env.NODE_ENV === 'development') {
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST || 'localhost',
          port: process.env.SMTP_PORT || 1025,
          secure: false,
          auth: false, // Mailhog doesn't require auth
          tls: {
            rejectUnauthorized: false
          }
        });
      } else {
        // Production email configuration
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          },
          tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
          }
        });
      }

      // Verify transporter configuration
      if (process.env.NODE_ENV !== 'test') {
        await this.transporter.verify();
        logger.info('Email transporter initialized successfully');
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter', {
        error: error.message
      });
    }
  }

  /**
   * Generate email verification token
   */
  async generateVerificationToken(userId, email, type = 'email_verification') {
    try {
      const jwtSecret = await getSecrets.jwt.getSecret();
      
      const payload = {
        userId,
        email,
        type,
        timestamp: Date.now()
      };

      const token = jwt.sign(payload, jwtSecret, {
        expiresIn: process.env.EMAIL_VERIFICATION_EXPIRES || '24h',
        issuer: 'nanoinfluencer-marketplace',
        audience: 'email-verification'
      });

      // Also generate a simple random token for backup
      const simpleToken = crypto.randomBytes(32).toString('hex');

      return {
        jwtToken: token,
        simpleToken: simpleToken,
        expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours
      };
    } catch (error) {
      logger.error('Failed to generate verification token', {
        error: error.message,
        userId
      });
      throw new Error('Failed to generate verification token');
    }
  }

  /**
   * Verify email verification token
   */
  async verifyToken(token, expectedType = 'email_verification') {
    try {
      const jwtSecret = await getSecrets.jwt.getSecret();
      
      const decoded = jwt.verify(token, jwtSecret, {
        issuer: 'nanoinfluencer-marketplace',
        audience: 'email-verification'
      });

      if (decoded.type !== expectedType) {
        throw new Error('Invalid token type');
      }

      return {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        type: decoded.type,
        timestamp: decoded.timestamp
      };
    } catch (error) {
      logger.error('Token verification failed', {
        error: error.message,
        tokenType: expectedType
      });
      
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(user, token, baseUrl) {
    try {
      const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
      
      const htmlTemplate = this.getVerificationEmailTemplate(user.name, verificationUrl);
      const textTemplate = this.getVerificationEmailText(user.name, verificationUrl);

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || 'NanoInfluencer Marketplace',
          address: process.env.FROM_EMAIL || 'noreply@nanoinfluencer.com'
        },
        to: user.email,
        subject: 'Verify Your Email Address - NanoInfluencer Marketplace',
        html: htmlTemplate,
        text: textTemplate,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Verification email sent successfully', {
        userId: user.id,
        email: user.email,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send verification email', {
        error: error.message,
        userId: user.id,
        email: user.email
      });
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, token, baseUrl) {
    try {
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      
      const htmlTemplate = this.getPasswordResetEmailTemplate(user.name, resetUrl);
      const textTemplate = this.getPasswordResetEmailText(user.name, resetUrl);

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || 'NanoInfluencer Marketplace',
          address: process.env.FROM_EMAIL || 'noreply@nanoinfluencer.com'
        },
        to: user.email,
        subject: 'Password Reset Request - NanoInfluencer Marketplace',
        html: htmlTemplate,
        text: textTemplate,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Password reset email sent successfully', {
        userId: user.id,
        email: user.email,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send password reset email', {
        error: error.message,
        userId: user.id,
        email: user.email
      });
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(user, loginUrl) {
    try {
      const htmlTemplate = this.getWelcomeEmailTemplate(user.name, loginUrl);
      const textTemplate = this.getWelcomeEmailText(user.name, loginUrl);

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || 'NanoInfluencer Marketplace',
          address: process.env.FROM_EMAIL || 'noreply@nanoinfluencer.com'
        },
        to: user.email,
        subject: 'Welcome to NanoInfluencer Marketplace! 🎉',
        html: htmlTemplate,
        text: textTemplate
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Welcome email sent successfully', {
        userId: user.id,
        email: user.email,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send welcome email', {
        error: error.message,
        userId: user.id,
        email: user.email
      });
      // Don't throw error for welcome email failures
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Email verification HTML template
   */
  getVerificationEmailTemplate(userName, verificationUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 NanoInfluencer Marketplace</h1>
                <h2>Verify Your Email Address</h2>
            </div>
            <div class="content">
                <p>Hi ${userName},</p>
                <p>Thank you for signing up for NanoInfluencer Marketplace! To complete your registration and start connecting with brands and influencers, please verify your email address.</p>
                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace;">${verificationUrl}</p>
                <p><strong>This link will expire in 24 hours.</strong></p>
                <p>If you didn't create an account with us, please ignore this email.</p>
                <p>Welcome aboard!<br>The NanoInfluencer Team</p>
            </div>
            <div class="footer">
                <p>© 2024 NanoInfluencer Marketplace. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Email verification text template
   */
  getVerificationEmailText(userName, verificationUrl) {
    return `
    Hi ${userName},

    Thank you for signing up for NanoInfluencer Marketplace!

    To complete your registration and start connecting with brands and influencers, please verify your email address by clicking the link below:

    ${verificationUrl}

    This link will expire in 24 hours.

    If you didn't create an account with us, please ignore this email.

    Welcome aboard!
    The NanoInfluencer Team

    © 2024 NanoInfluencer Marketplace. All rights reserved.
    This is an automated message. Please do not reply to this email.
    `;
  }

  /**
   * Password reset email template
   */
  getPasswordResetEmailTemplate(userName, resetUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 15px 30px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 NanoInfluencer Marketplace</h1>
                <h2>Password Reset Request</h2>
            </div>
            <div class="content">
                <p>Hi ${userName},</p>
                <p>We received a request to reset your password for your NanoInfluencer Marketplace account.</p>
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace;">${resetUrl}</p>
                <div class="warning">
                    <p><strong>⚠️ Security Notice:</strong></p>
                    <ul>
                        <li>This link will expire in 1 hour for security reasons</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your password won't change unless you click the link above</li>
                    </ul>
                </div>
                <p>Best regards,<br>The NanoInfluencer Security Team</p>
            </div>
            <div class="footer">
                <p>© 2024 NanoInfluencer Marketplace. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Password reset text template
   */
  getPasswordResetEmailText(userName, resetUrl) {
    return `
    Hi ${userName},

    We received a request to reset your password for your NanoInfluencer Marketplace account.

    To reset your password, click the link below:
    ${resetUrl}

    SECURITY NOTICE:
    - This link will expire in 1 hour for security reasons
    - If you didn't request this reset, please ignore this email
    - Your password won't change unless you click the link above

    Best regards,
    The NanoInfluencer Security Team

    © 2024 NanoInfluencer Marketplace. All rights reserved.
    This is an automated message. Please do not reply to this email.
    `;
  }

  /**
   * Welcome email template
   */
  getWelcomeEmailTemplate(userName, loginUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to NanoInfluencer Marketplace</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 15px 30px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .feature { display: flex; margin: 15px 0; align-items: center; }
            .feature-icon { font-size: 24px; margin-right: 15px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to NanoInfluencer Marketplace!</h1>
                <p>Your account has been successfully verified</p>
            </div>
            <div class="content">
                <p>Hi ${userName},</p>
                <p>Congratulations! Your email has been verified and your account is now active. You're ready to start your journey in the world of influencer marketing.</p>
                
                <h3>🚀 What you can do now:</h3>
                <div class="feature">
                    <span class="feature-icon">💼</span>
                    <div><strong>Browse Campaigns:</strong> Discover exciting brand partnerships</div>
                </div>
                <div class="feature">
                    <span class="feature-icon">📈</span>
                    <div><strong>Build Your Profile:</strong> Showcase your social media presence</div>
                </div>
                <div class="feature">
                    <span class="feature-icon">💰</span>
                    <div><strong>Earn Money:</strong> Get paid for quality content creation</div>
                </div>
                <div class="feature">
                    <span class="feature-icon">📊</span>
                    <div><strong>Track Performance:</strong> Monitor your campaign success</div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Get Started Now</a>
                </div>
                
                <p>Need help getting started? Check out our <a href="${loginUrl}/help">Getting Started Guide</a> or reach out to our support team.</p>
                
                <p>Happy creating!<br>The NanoInfluencer Team</p>
            </div>
            <div class="footer">
                <p>© 2024 NanoInfluencer Marketplace. All rights reserved.</p>
                <p>Follow us: <a href="#">Twitter</a> | <a href="#">Instagram</a> | <a href="#">LinkedIn</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Welcome email text template
   */
  getWelcomeEmailText(userName, loginUrl) {
    return `
    Hi ${userName},

    🎉 Welcome to NanoInfluencer Marketplace!

    Congratulations! Your email has been verified and your account is now active. You're ready to start your journey in the world of influencer marketing.

    What you can do now:
    💼 Browse Campaigns - Discover exciting brand partnerships
    📈 Build Your Profile - Showcase your social media presence  
    💰 Earn Money - Get paid for quality content creation
    📊 Track Performance - Monitor your campaign success

    Get started now: ${loginUrl}

    Need help? Check out our Getting Started Guide or reach out to our support team.

    Happy creating!
    The NanoInfluencer Team

    © 2024 NanoInfluencer Marketplace. All rights reserved.
    `;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email is from a temporary/disposable email service
   */
  static isDisposableEmail(email) {
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'throwawymail.com', 'temp-mail.org'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.includes(domain);
  }
}

// Create singleton instance
const emailVerificationService = new EmailVerificationService();

module.exports = { EmailVerificationService, emailVerificationService };