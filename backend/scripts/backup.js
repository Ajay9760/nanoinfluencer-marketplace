const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { logger } = require('../src/utils/monitoring');
const { getSecrets } = require('../src/utils/secrets');

// Backup configuration
const BACKUP_CONFIG = {
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../backups'),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  maxBackupsToKeep: parseInt(process.env.MAX_BACKUPS_TO_KEEP) || 50,
  compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL) || 6,
  encryptBackups: process.env.ENCRYPT_BACKUPS === 'true',
  uploadToS3: process.env.BACKUP_UPLOAD_S3 === 'true',
  s3Bucket: process.env.BACKUP_S3_BUCKET || 'nanoinfluencer-backups'
};

/**
 * PostgreSQL Database Backup Manager
 */
class DatabaseBackupManager {
  constructor() {
    this.backupDir = BACKUP_CONFIG.backupDir;
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true, mode: 0o755 });
      logger.info('Created backup directory', { path: this.backupDir });
    }
  }

  /**
   * Generate backup filename with timestamp
   */
  generateBackupFilename(type = 'full') {
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '');
    
    const environment = process.env.NODE_ENV || 'development';
    return `nanoinfluencer_${environment}_${type}_${timestamp}.sql`;
  }

  /**
   * Get database credentials from secrets manager
   */
  async getDatabaseCredentials() {
    try {
      return await getSecrets.database.getCredentials();
    } catch (error) {
      logger.error('Failed to get database credentials', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a full database backup using pg_dump
   */
  async createFullBackup() {
    try {
      const credentials = await this.getDatabaseCredentials();
      const filename = this.generateBackupFilename('full');
      const backupPath = path.join(this.backupDir, filename);

      logger.info('Starting full database backup', {
        filename,
        database: credentials.database,
        host: credentials.host
      });

      await this.executePgDump(credentials, backupPath, {
        format: 'custom',
        compress: BACKUP_CONFIG.compressionLevel,
        verbose: true,
        blobs: true
      });

      const stats = fs.statSync(backupPath);
      
      logger.info('Full database backup completed', {
        filename,
        size: this.formatBytes(stats.size),
        path: backupPath
      });

      // Encrypt if configured
      if (BACKUP_CONFIG.encryptBackups) {
        await this.encryptBackup(backupPath);
      }

      // Upload to S3 if configured
      if (BACKUP_CONFIG.uploadToS3) {
        await this.uploadToS3(backupPath);
      }

      return {
        filename,
        path: backupPath,
        size: stats.size,
        type: 'full',
        created: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Full backup failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Create a schema-only backup
   */
  async createSchemaBackup() {
    try {
      const credentials = await this.getDatabaseCredentials();
      const filename = this.generateBackupFilename('schema');
      const backupPath = path.join(this.backupDir, filename);

      logger.info('Starting schema backup', {
        filename,
        database: credentials.database
      });

      await this.executePgDump(credentials, backupPath, {
        format: 'plain',
        schemaOnly: true,
        verbose: true
      });

      const stats = fs.statSync(backupPath);
      
      logger.info('Schema backup completed', {
        filename,
        size: this.formatBytes(stats.size),
        path: backupPath
      });

      return {
        filename,
        path: backupPath,
        size: stats.size,
        type: 'schema',
        created: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Schema backup failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Create a data-only backup
   */
  async createDataBackup() {
    try {
      const credentials = await this.getDatabaseCredentials();
      const filename = this.generateBackupFilename('data');
      const backupPath = path.join(this.backupDir, filename);

      logger.info('Starting data backup', {
        filename,
        database: credentials.database
      });

      await this.executePgDump(credentials, backupPath, {
        format: 'custom',
        dataOnly: true,
        compress: BACKUP_CONFIG.compressionLevel,
        verbose: true,
        blobs: true
      });

      const stats = fs.statSync(backupPath);
      
      logger.info('Data backup completed', {
        filename,
        size: this.formatBytes(stats.size),
        path: backupPath
      });

      return {
        filename,
        path: backupPath,
        size: stats.size,
        type: 'data',
        created: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Data backup failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Execute pg_dump with given options
   */
  async executePgDump(credentials, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        '--host', credentials.host,
        '--port', credentials.port.toString(),
        '--username', credentials.username,
        '--dbname', credentials.database
      ];

      // Add format option
      if (options.format) {
        args.push('--format', options.format);
      }

      // Add compression
      if (options.compress && options.format === 'custom') {
        args.push('--compress', options.compress.toString());
      }

      // Schema only
      if (options.schemaOnly) {
        args.push('--schema-only');
      }

      // Data only
      if (options.dataOnly) {
        args.push('--data-only');
      }

      // Include blobs
      if (options.blobs) {
        args.push('--blobs');
      }

      // Verbose output
      if (options.verbose) {
        args.push('--verbose');
      }

      // Output file
      args.push('--file', outputPath);

      // Set password environment variable
      const env = {
        ...process.env,
        PGPASSWORD: credentials.password
      };

      logger.debug('Executing pg_dump', { args: args.join(' ') });

      const pgDump = spawn('pg_dump', args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      pgDump.stdout.on('data', (data) => {
        logger.debug('pg_dump stdout', { data: data.toString() });
      });

      pgDump.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          logger.info('pg_dump completed successfully');
          resolve();
        } else {
          const error = new Error(`pg_dump failed with code ${code}: ${stderr}`);
          logger.error('pg_dump failed', { code, stderr, error: error.message });
          reject(error);
        }
      });

      pgDump.on('error', (error) => {
        logger.error('pg_dump process error', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Restore database from backup
   */
  async restoreFromBackup(backupPath, options = {}) {
    try {
      const credentials = await this.getDatabaseCredentials();
      
      logger.info('Starting database restore', {
        backupPath,
        database: credentials.database
      });

      // Decrypt if necessary
      let actualBackupPath = backupPath;
      if (backupPath.endsWith('.enc')) {
        actualBackupPath = await this.decryptBackup(backupPath);
      }

      await this.executePgRestore(credentials, actualBackupPath, options);

      logger.info('Database restore completed', { backupPath });

      return true;
    } catch (error) {
      logger.error('Database restore failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Execute pg_restore with given options
   */
  async executePgRestore(credentials, backupPath, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        '--host', credentials.host,
        '--port', credentials.port.toString(),
        '--username', credentials.username,
        '--dbname', credentials.database
      ];

      // Clean before restore
      if (options.clean) {
        args.push('--clean');
      }

      // Create database if not exists
      if (options.create) {
        args.push('--create');
      }

      // Verbose output
      if (options.verbose !== false) {
        args.push('--verbose');
      }

      // Input file
      args.push(backupPath);

      // Set password environment variable
      const env = {
        ...process.env,
        PGPASSWORD: credentials.password
      };

      logger.debug('Executing pg_restore', { args: args.join(' ') });

      const pgRestore = spawn('pg_restore', args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      pgRestore.stdout.on('data', (data) => {
        logger.debug('pg_restore stdout', { data: data.toString() });
      });

      pgRestore.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pgRestore.on('close', (code) => {
        if (code === 0) {
          logger.info('pg_restore completed successfully');
          resolve();
        } else {
          const error = new Error(`pg_restore failed with code ${code}: ${stderr}`);
          logger.error('pg_restore failed', { code, stderr, error: error.message });
          reject(error);
        }
      });

      pgRestore.on('error', (error) => {
        logger.error('pg_restore process error', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql') || file.endsWith('.sql.enc'))
        .map(file => {
          const fullPath = path.join(this.backupDir, file);
          const stats = fs.statSync(fullPath);
          return {
            name: file,
            path: fullPath,
            created: stats.ctime,
            size: stats.size
          };
        })
        .sort((a, b) => b.created - a.created);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - BACKUP_CONFIG.retentionDays);

      let deleted = 0;
      let totalSize = 0;

      // Delete files older than retention period or beyond max count
      for (let i = BACKUP_CONFIG.maxBackupsToKeep; i < files.length; i++) {
        const file = files[i];
        if (file.created < cutoffDate || i >= BACKUP_CONFIG.maxBackupsToKeep) {
          fs.unlinkSync(file.path);
          deleted++;
          totalSize += file.size;
          logger.info('Deleted old backup', { filename: file.name });
        }
      }

      if (deleted > 0) {
        logger.info('Cleanup completed', {
          deletedFiles: deleted,
          freedSpace: this.formatBytes(totalSize)
        });
      }

      return { deleted, freedSpace: totalSize };
    } catch (error) {
      logger.error('Backup cleanup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * List all available backups
   */
  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql') || file.endsWith('.sql.enc'))
        .map(file => {
          const fullPath = path.join(this.backupDir, file);
          const stats = fs.statSync(fullPath);
          return {
            name: file,
            path: fullPath,
            created: stats.ctime,
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            encrypted: file.endsWith('.enc')
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (error) {
      logger.error('Failed to list backups', { error: error.message });
      throw error;
    }
  }

  /**
   * Encrypt backup file (placeholder for encryption implementation)
   */
  async encryptBackup(backupPath) {
    // TODO: Implement backup encryption using secrets manager
    logger.warn('Backup encryption not implemented yet', { backupPath });
    return backupPath;
  }

  /**
   * Decrypt backup file (placeholder for decryption implementation)
   */
  async decryptBackup(encryptedPath) {
    // TODO: Implement backup decryption using secrets manager
    logger.warn('Backup decryption not implemented yet', { encryptedPath });
    return encryptedPath;
  }

  /**
   * Upload backup to S3 (placeholder for S3 integration)
   */
  async uploadToS3(backupPath) {
    // TODO: Implement S3 upload functionality
    logger.warn('S3 upload not implemented yet', { backupPath });
    return false;
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI Interface
async function main() {
  const backupManager = new DatabaseBackupManager();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'full':
        await backupManager.createFullBackup();
        break;
      
      case 'schema':
        await backupManager.createSchemaBackup();
        break;
      
      case 'data':
        await backupManager.createDataBackup();
        break;
      
      case 'restore':
        const backupPath = process.argv[3];
        if (!backupPath) {
          throw new Error('Backup path required for restore command');
        }
        await backupManager.restoreFromBackup(backupPath, { clean: true });
        break;
      
      case 'cleanup':
        await backupManager.cleanupOldBackups();
        break;
      
      case 'list':
        const backups = await backupManager.listBackups();
        console.table(backups);
        break;
      
      default:
        console.log(`
Usage: node scripts/backup.js <command>

Commands:
  full     - Create a full database backup
  schema   - Create a schema-only backup
  data     - Create a data-only backup
  restore  - Restore from backup file
  cleanup  - Clean up old backups
  list     - List all available backups

Examples:
  node scripts/backup.js full
  node scripts/backup.js restore /path/to/backup.sql
  node scripts/backup.js cleanup
        `);
        break;
    }
  } catch (error) {
    logger.error('Backup command failed', { command, error: error.message });
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { DatabaseBackupManager };

// Run CLI if executed directly
if (require.main === module) {
  main();
}