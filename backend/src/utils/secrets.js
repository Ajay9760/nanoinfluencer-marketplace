const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { logger } = require('./monitoring');

// Default encryption settings
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16
const TAG_LENGTH = 16; // Authentication tag length
const KEY_LENGTH = 32; // 256 bits

/**
 * Secrets Manager Class
 * Handles encrypted storage and retrieval of sensitive configuration data
 */
class SecretsManager {
  constructor(options = {}) {
    this.masterKey = options.masterKey || process.env.SECRETS_MASTER_KEY;
    this.secretsDir = options.secretsDir || path.join(__dirname, '../../secrets');
    this.environment = process.env.NODE_ENV || 'development';
    
    // Ensure secrets directory exists
    this.ensureSecretsDirectory();
    
    // Initialize master key if not provided
    if (!this.masterKey) {
      this.masterKey = this.generateMasterKey();
    }
  }

  /**
   * Ensure secrets directory exists
   */
  ensureSecretsDirectory() {
    if (!fs.existsSync(this.secretsDir)) {
      fs.mkdirSync(this.secretsDir, { recursive: true, mode: 0o700 });
      logger.info('Created secrets directory', { path: this.secretsDir });
    }
  }

  /**
   * Generate a master key for encryption
   */
  generateMasterKey() {
    const key = crypto.randomBytes(KEY_LENGTH).toString('hex');
    
    if (this.environment === 'development') {
      // In development, save key to a local file (NOT for production)
      const keyFile = path.join(this.secretsDir, '.master-key');
      fs.writeFileSync(keyFile, key, { mode: 0o600 });
      logger.warn('Generated master key saved to file (development only)', { keyFile });
    }
    
    return key;
  }

  /**
   * Derive encryption key from master key
   */
  deriveKey(salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(32);
    }
    
    const key = crypto.pbkdf2Sync(
      Buffer.from(this.masterKey, 'hex'),
      salt,
      100000, // iterations
      KEY_LENGTH,
      'sha256'
    );
    
    return { key, salt };
  }

  /**
   * Encrypt a secret value
   */
  encrypt(plaintext) {
    try {
      const { key, salt } = this.deriveKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipher(ALGORITHM, key);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine salt, iv, tag, and encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      logger.error('Failed to encrypt secret', { error: error.message });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a secret value
   */
  decrypt(encryptedData) {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = combined.slice(0, 32);
      const iv = combined.slice(32, 32 + IV_LENGTH);
      const tag = combined.slice(32 + IV_LENGTH, 32 + IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.slice(32 + IV_LENGTH + TAG_LENGTH);
      
      // Derive key
      const { key } = this.deriveKey(salt);
      
      // Decrypt
      const decipher = crypto.createDecipher(ALGORITHM, key);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt secret', { error: error.message });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Store a secret in encrypted form
   */
  async storeSecret(key, value, options = {}) {
    try {
      const secretFile = path.join(this.secretsDir, `${key}.secret`);
      const encrypted = this.encrypt(value);
      
      const secretData = {
        key,
        encrypted,
        created: new Date().toISOString(),
        environment: this.environment,
        ...options
      };
      
      fs.writeFileSync(secretFile, JSON.stringify(secretData, null, 2), { mode: 0o600 });
      
      logger.info('Secret stored successfully', { key, file: secretFile });
      return true;
    } catch (error) {
      logger.error('Failed to store secret', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Retrieve and decrypt a secret
   */
  async getSecret(key, defaultValue = null) {
    try {
      const secretFile = path.join(this.secretsDir, `${key}.secret`);
      
      if (!fs.existsSync(secretFile)) {
        if (defaultValue !== null) {
          return defaultValue;
        }
        throw new Error(`Secret not found: ${key}`);
      }
      
      const secretData = JSON.parse(fs.readFileSync(secretFile, 'utf8'));
      const decrypted = this.decrypt(secretData.encrypted);
      
      logger.debug('Secret retrieved successfully', { key });
      return decrypted;
    } catch (error) {
      logger.error('Failed to retrieve secret', { key, error: error.message });
      if (defaultValue !== null) {
        return defaultValue;
      }
      throw error;
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(key) {
    try {
      const secretFile = path.join(this.secretsDir, `${key}.secret`);
      
      if (fs.existsSync(secretFile)) {
        fs.unlinkSync(secretFile);
        logger.info('Secret deleted successfully', { key });
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to delete secret', { key, error: error.message });
      throw error;
    }
  }

  /**
   * List all stored secrets (keys only)
   */
  async listSecrets() {
    try {
      const files = fs.readdirSync(this.secretsDir);
      const secrets = files
        .filter(file => file.endsWith('.secret'))
        .map(file => file.replace('.secret', ''));
      
      return secrets;
    } catch (error) {
      logger.error('Failed to list secrets', { error: error.message });
      throw error;
    }
  }

  /**
   * Rotate master key (re-encrypt all secrets with new key)
   */
  async rotateMasterKey() {
    try {
      const oldKey = this.masterKey;
      const newKey = this.generateMasterKey();
      
      // Get all secrets with old key
      const secretKeys = await this.listSecrets();
      const secrets = {};
      
      for (const key of secretKeys) {
        secrets[key] = await this.getSecret(key);
      }
      
      // Update master key
      this.masterKey = newKey;
      
      // Re-encrypt all secrets with new key
      for (const [key, value] of Object.entries(secrets)) {
        await this.storeSecret(key, value);
      }
      
      logger.info('Master key rotation completed', { secretsCount: secretKeys.length });
      return true;
    } catch (error) {
      logger.error('Master key rotation failed', { error: error.message });
      throw error;
    }
  }
}

/**
 * Environment-based secret resolution
 * Tries multiple sources: encrypted files, environment variables, AWS Secrets Manager, etc.
 */
class EnvironmentSecretsManager {
  constructor(options = {}) {
    this.secretsManager = new SecretsManager(options);
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Get secret from multiple sources with priority order
   */
  async getSecret(key, options = {}) {
    const {
      sources = ['encrypted', 'env', 'default'],
      defaultValue = null,
      required = false
    } = options;

    for (const source of sources) {
      try {
        switch (source) {
          case 'encrypted':
            // Try encrypted file first
            const encryptedValue = await this.secretsManager.getSecret(key, null);
            if (encryptedValue !== null) {
              return encryptedValue;
            }
            break;

          case 'env':
            // Try environment variable
            const envValue = process.env[key.toUpperCase()];
            if (envValue !== undefined) {
              return envValue;
            }
            break;

          case 'aws':
            // Try AWS Secrets Manager (if configured)
            if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
              const awsValue = await this.getAWSSecret(key);
              if (awsValue !== null) {
                return awsValue;
              }
            }
            break;

          case 'default':
            if (defaultValue !== null) {
              return defaultValue;
            }
            break;
        }
      } catch (error) {
        logger.debug(`Failed to get secret from ${source}`, { key, error: error.message });
        continue;
      }
    }

    if (required) {
      throw new Error(`Required secret not found: ${key}`);
    }

    return null;
  }

  /**
   * AWS Secrets Manager integration (placeholder for future implementation)
   */
  async getAWSSecret(key) {
    // TODO: Implement AWS Secrets Manager integration
    logger.debug('AWS Secrets Manager not implemented yet', { key });
    return null;
  }

  /**
   * Set secret with automatic encryption
   */
  async setSecret(key, value, options = {}) {
    return await this.secretsManager.storeSecret(key, value, options);
  }

  /**
   * Initialize secrets from environment variables
   * Useful for migrating from plain env vars to encrypted secrets
   */
  async migrateFromEnv(keys = []) {
    const migrated = [];
    
    for (const key of keys) {
      const envKey = key.toUpperCase();
      const envValue = process.env[envKey];
      
      if (envValue && envValue !== '') {
        try {
          await this.setSecret(key, envValue);
          migrated.push(key);
          logger.info('Migrated secret from environment variable', { key });
        } catch (error) {
          logger.error('Failed to migrate secret', { key, error: error.message });
        }
      }
    }
    
    return migrated;
  }
}

// Create singleton instance
const secretsManager = new EnvironmentSecretsManager();

/**
 * Utility functions for common secrets
 */
const getSecrets = {
  database: {
    async getConnectionString() {
      const host = await secretsManager.getSecret('db_host', { defaultValue: 'localhost' });
      const port = await secretsManager.getSecret('db_port', { defaultValue: '5432' });
      const name = await secretsManager.getSecret('db_name', { defaultValue: 'nanoinfluencer_dev' });
      const user = await secretsManager.getSecret('db_user', { defaultValue: 'postgres' });
      const password = await secretsManager.getSecret('db_password', { defaultValue: 'password' });
      
      return `postgresql://${user}:${password}@${host}:${port}/${name}`;
    },
    
    async getCredentials() {
      return {
        host: await secretsManager.getSecret('db_host', { defaultValue: 'localhost' }),
        port: await secretsManager.getSecret('db_port', { defaultValue: 5432 }),
        database: await secretsManager.getSecret('db_name', { defaultValue: 'nanoinfluencer_dev' }),
        username: await secretsManager.getSecret('db_user', { defaultValue: 'postgres' }),
        password: await secretsManager.getSecret('db_password', { defaultValue: 'password' })
      };
    }
  },

  jwt: {
    async getSecret() {
      return await secretsManager.getSecret('jwt_secret', {
        required: true,
        defaultValue: 'development-only-secret-change-in-production'
      });
    },
    
    async getRefreshSecret() {
      return await secretsManager.getSecret('jwt_refresh_secret', {
        required: true,
        defaultValue: 'development-only-refresh-secret-change-in-production'
      });
    }
  },

  encryption: {
    async getBcryptRounds() {
      const rounds = await secretsManager.getSecret('bcrypt_rounds', { defaultValue: '12' });
      return parseInt(rounds, 10);
    }
  },

  external: {
    async getStripeKeys() {
      return {
        publishableKey: await secretsManager.getSecret('stripe_publishable_key'),
        secretKey: await secretsManager.getSecret('stripe_secret_key', { required: true }),
        webhookSecret: await secretsManager.getSecret('stripe_webhook_secret')
      };
    },
    
    async getSentryDSN() {
      return await secretsManager.getSecret('sentry_dsn');
    }
  }
};

module.exports = {
  SecretsManager,
  EnvironmentSecretsManager,
  secretsManager,
  getSecrets
};