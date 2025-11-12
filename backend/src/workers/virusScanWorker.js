const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const { logger } = require('../utils/monitoring');
const { scanQueue } = require('../services/uploadService');

// Promisify exec for async/await
const execAsync = util.promisify(exec);

// Initialize AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Check if ClamAV is installed and running
 */
const checkClamAV = async () => {
  try {
    const { stdout } = await execAsync('clamscan --version');
    logger.info('ClamAV version check', { version: stdout.trim() });
    return true;
  } catch (error) {
    logger.warn('ClamAV not available', { 
      error: error.message,
      suggestion: 'Install ClamAV: sudo apt-get install clamav clamav-daemon'
    });
    return false;
  }
};

/**
 * Update ClamAV virus definitions
 */
const updateVirusDefinitions = async () => {
  try {
    logger.info('Updating ClamAV virus definitions...');
    const { stdout } = await execAsync('freshclam --quiet');
    logger.info('Virus definitions updated successfully', { output: stdout });
    return true;
  } catch (error) {
    // freshclam returns exit code 1 if definitions are already up to date
    if (error.code === 1 && error.stderr.includes('up to date')) {
      logger.info('Virus definitions are already up to date');
      return true;
    }
    logger.error('Failed to update virus definitions', { error: error.message });
    return false;
  }
};

/**
 * Download file from S3 to temporary location
 */
const downloadFileFromS3 = async (bucket, key) => {
  const tempDir = os.tmpdir();
  const tempFileName = `scan_${Date.now()}_${path.basename(key)}`;
  const tempFilePath = path.join(tempDir, tempFileName);

  try {
    const params = {
      Bucket: bucket,
      Key: key
    };

    const fileStream = fs.createWriteStream(tempFilePath);
    const s3Stream = s3.getObject(params).createReadStream();

    return new Promise((resolve, reject) => {
      s3Stream.pipe(fileStream);
      
      s3Stream.on('error', (error) => {
        logger.error('Error downloading file from S3', { error: error.message, key });
        reject(error);
      });
      
      fileStream.on('error', (error) => {
        logger.error('Error writing temporary file', { error: error.message, tempFilePath });
        reject(error);
      });
      
      fileStream.on('finish', () => {
        logger.info('File downloaded for scanning', { key, tempFilePath });
        resolve(tempFilePath);
      });
    });

  } catch (error) {
    logger.error('Failed to download file from S3', { error: error.message, key });
    throw error;
  }
};

/**
 * Scan file using ClamAV
 */
const scanFileWithClamAV = async (filePath) => {
  try {
    // Run clamscan on the file
    const { stdout, stderr } = await execAsync(`clamscan --no-summary "${filePath}"`);
    
    // Parse scan results
    const isInfected = stdout.includes('FOUND');
    const virusName = isInfected ? stdout.split(':')[1]?.trim() : null;

    logger.info('File scan completed', {
      filePath: path.basename(filePath),
      isInfected,
      virusName,
      scanOutput: stdout
    });

    return {
      isInfected,
      virusName,
      scanOutput: stdout,
      scanTime: new Date().toISOString()
    };

  } catch (error) {
    // ClamAV returns exit code 1 if virus is found, which triggers an error
    if (error.code === 1 && error.stdout && error.stdout.includes('FOUND')) {
      const virusName = error.stdout.split(':')[1]?.trim();
      logger.warn('Virus detected during scan', {
        filePath: path.basename(filePath),
        virusName,
        scanOutput: error.stdout
      });

      return {
        isInfected: true,
        virusName,
        scanOutput: error.stdout,
        scanTime: new Date().toISOString()
      };
    }

    logger.error('Error during virus scan', { 
      error: error.message, 
      filePath: path.basename(filePath) 
    });
    throw error;
  }
};

/**
 * Mock scan for development/testing when ClamAV is not available
 */
const mockScan = async (filePath) => {
  logger.info('Mock virus scan (ClamAV not available)', { 
    filePath: path.basename(filePath) 
  });

  // Simulate scan time
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check if filename contains 'virus' or 'malware' for testing
  const fileName = path.basename(filePath).toLowerCase();
  const isInfected = fileName.includes('virus') || fileName.includes('malware');

  return {
    isInfected,
    virusName: isInfected ? 'Test.Virus.FOUND' : null,
    scanOutput: isInfected ? 
      `${filePath}: Test.Virus.FOUND FOUND` : 
      `${filePath}: OK`,
    scanTime: new Date().toISOString(),
    mockScan: true
  };
};

/**
 * Quarantine infected file
 */
const quarantineFile = async (bucket, key, scanResult) => {
  try {
    // Move file to quarantine folder
    const quarantineKey = key.replace('uploads/', 'quarantine/');
    
    // Copy file to quarantine location
    await s3.copyObject({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: quarantineKey,
      MetadataDirective: 'REPLACE',
      Metadata: {
        'quarantine-reason': 'virus-detected',
        'virus-name': scanResult.virusName || 'unknown',
        'quarantine-date': new Date().toISOString(),
        'original-key': key
      }
    }).promise();

    // Delete original file
    await s3.deleteObject({
      Bucket: bucket,
      Key: key
    }).promise();

    logger.warn('File quarantined due to virus detection', {
      originalKey: key,
      quarantineKey,
      virusName: scanResult.virusName
    });

    return { quarantined: true, quarantineKey };

  } catch (error) {
    logger.error('Failed to quarantine infected file', {
      error: error.message,
      key
    });
    throw error;
  }
};

/**
 * Update file metadata with scan results
 */
const updateFileMetadata = async (bucket, key, scanResult) => {
  try {
    await s3.copyObject({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: key,
      MetadataDirective: 'REPLACE',
      Metadata: {
        'scan-status': scanResult.isInfected ? 'infected' : 'clean',
        'scan-date': scanResult.scanTime,
        'virus-name': scanResult.virusName || 'none',
        'scan-engine': scanResult.mockScan ? 'mock' : 'clamav'
      }
    }).promise();

    logger.info('File metadata updated with scan results', {
      key,
      scanStatus: scanResult.isInfected ? 'infected' : 'clean'
    });

  } catch (error) {
    logger.error('Failed to update file metadata', {
      error: error.message,
      key
    });
    // Don't throw error as this is not critical
  }
};

/**
 * Cleanup temporary file
 */
const cleanupTempFile = async (tempFilePath) => {
  try {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      logger.info('Temporary file cleaned up', { tempFilePath: path.basename(tempFilePath) });
    }
  } catch (error) {
    logger.error('Failed to cleanup temporary file', {
      error: error.message,
      tempFilePath: path.basename(tempFilePath)
    });
  }
};

/**
 * Process virus scan job
 */
const processVirusScanJob = async (job) => {
  const { bucket, key, userId, fileSize, contentType } = job.data;
  let tempFilePath = null;

  try {
    logger.info('Starting virus scan job', {
      jobId: job.id,
      bucket,
      key,
      userId,
      fileSize
    });

    // Update job progress
    job.progress(10);

    // Check if ClamAV is available
    const clamAVAvailable = await checkClamAV();
    
    if (clamAVAvailable) {
      // Update virus definitions (optional, can be done periodically)
      await updateVirusDefinitions();
    }

    job.progress(20);

    // Download file from S3
    tempFilePath = await downloadFileFromS3(bucket, key);
    job.progress(50);

    // Scan file
    const scanResult = clamAVAvailable ? 
      await scanFileWithClamAV(tempFilePath) : 
      await mockScan(tempFilePath);

    job.progress(80);

    // Handle scan results
    if (scanResult.isInfected) {
      // Quarantine infected file
      await quarantineFile(bucket, key, scanResult);
      
      logger.warn('Virus scan completed: INFECTED', {
        jobId: job.id,
        key,
        virusName: scanResult.virusName
      });

      return {
        success: true,
        infected: true,
        virusName: scanResult.virusName,
        action: 'quarantined'
      };
    } else {
      // Update file metadata to mark as clean
      await updateFileMetadata(bucket, key, scanResult);
      
      logger.info('Virus scan completed: CLEAN', {
        jobId: job.id,
        key
      });

      return {
        success: true,
        infected: false,
        action: 'approved'
      };
    }

  } catch (error) {
    logger.error('Virus scan job failed', {
      jobId: job.id,
      error: error.message,
      key
    });
    throw error;

  } finally {
    // Always cleanup temporary file
    if (tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }
    job.progress(100);
  }
};

/**
 * Initialize virus scan worker
 */
const initializeVirusScanWorker = () => {
  logger.info('Initializing virus scan worker...');

  // Process scan jobs
  scanQueue.process('scan-file', 5, processVirusScanJob); // Process up to 5 jobs concurrently

  // Handle job completion
  scanQueue.on('completed', (job, result) => {
    logger.info('Virus scan job completed', {
      jobId: job.id,
      result
    });
  });

  // Handle job failure
  scanQueue.on('failed', (job, error) => {
    logger.error('Virus scan job failed', {
      jobId: job.id,
      error: error.message
    });
  });

  // Handle worker stalled jobs
  scanQueue.on('stalled', (job) => {
    logger.warn('Virus scan job stalled', {
      jobId: job.id
    });
  });

  logger.info('Virus scan worker initialized successfully');
};

module.exports = {
  initializeVirusScanWorker,
  processVirusScanJob,
  checkClamAV,
  updateVirusDefinitions
};