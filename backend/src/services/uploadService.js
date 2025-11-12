const AWS = require('aws-sdk');
const crypto = require('crypto');
const path = require('path');
const Queue = require('bull');
const { logger } = require('../utils/monitoring');

// Initialize AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  signatureVersion: 'v4'
});

// Initialize Redis queue for virus scanning
const scanQueue = new Queue('virus scan', {
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD || ''
  }
});

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg', 
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  // Videos
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
  // Documents
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

// Maximum file sizes by type (in bytes)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB for images
  video: 100 * 1024 * 1024, // 100MB for videos
  document: 5 * 1024 * 1024, // 5MB for documents
  default: 10 * 1024 * 1024 // 10MB default
};

/**
 * Validate file parameters
 */
const validateFile = (fileName, fileSize, contentType) => {
  const errors = [];

  // Check file type
  if (!ALLOWED_FILE_TYPES[contentType]) {
    errors.push(`File type ${contentType} is not allowed`);
  }

  // Check file size
  const fileType = contentType.split('/')[0];
  const maxSize = MAX_FILE_SIZES[fileType] || MAX_FILE_SIZES.default;
  
  if (fileSize > maxSize) {
    errors.push(`File size ${fileSize} exceeds maximum allowed size of ${maxSize} bytes`);
  }

  // Check filename
  if (!fileName || fileName.length > 255) {
    errors.push('Invalid filename');
  }

  // Check for dangerous file extensions
  const ext = path.extname(fileName).toLowerCase();
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.js', '.jar'];
  if (dangerousExtensions.includes(ext)) {
    errors.push(`File extension ${ext} is not allowed for security reasons`);
  }

  return errors;
};

/**
 * Generate secure filename
 */
const generateSecureFileName = (originalFileName, userId) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(originalFileName);
  const sanitizedName = path.basename(originalFileName, ext)
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .substring(0, 50);
  
  return `uploads/${userId}/${timestamp}-${randomString}-${sanitizedName}${ext}`;
};

/**
 * Generate presigned URL for file upload
 */
const generatePresignedUploadUrl = async (fileName, fileSize, contentType, userId) => {
  try {
    // Validate file parameters
    const validationErrors = validateFile(fileName, fileSize, contentType);
    if (validationErrors.length > 0) {
      throw new Error(`File validation failed: ${validationErrors.join(', ')}`);
    }

    // Generate secure key
    const key = generateSecureFileName(fileName, userId);
    
    // Set up S3 parameters
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Expires: 300, // URL expires in 5 minutes
      ContentType: contentType,
      ContentLength: fileSize,
      Conditions: [
        ['content-length-range', fileSize, fileSize], // Exact file size
        ['starts-with', '$Content-Type', contentType.split('/')[0]] // Content type validation
      ],
      Fields: {
        'Content-Type': contentType,
        'x-amz-meta-original-name': fileName,
        'x-amz-meta-user-id': userId,
        'x-amz-meta-upload-time': new Date().toISOString()
      }
    };

    // Generate presigned POST data
    const presignedPost = s3.createPresignedPost(params);
    
    logger.info('Generated presigned upload URL', {
      userId,
      fileName,
      key,
      fileSize,
      contentType
    });

    return {
      uploadUrl: presignedPost.url,
      fields: presignedPost.fields,
      key: key,
      fileName: fileName,
      fileSize: fileSize,
      contentType: contentType,
      expires: new Date(Date.now() + 300000) // 5 minutes from now
    };

  } catch (error) {
    logger.error('Failed to generate presigned upload URL', {
      error: error.message,
      userId,
      fileName
    });
    throw error;
  }
};

/**
 * Mark upload as complete and queue for virus scanning
 */
const completeUpload = async (key, userId, additionalMetadata = {}) => {
  try {
    // Verify file exists in S3
    const headParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    };

    const headResult = await s3.headObject(headParams).promise();
    
    // Queue for virus scanning
    const scanJob = await scanQueue.add('scan-file', {
      bucket: process.env.S3_BUCKET_NAME,
      key: key,
      userId: userId,
      uploadedAt: new Date().toISOString(),
      fileSize: headResult.ContentLength,
      contentType: headResult.ContentType,
      ...additionalMetadata
    }, {
      priority: 10,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    });

    logger.info('File upload completed and queued for scanning', {
      key,
      userId,
      jobId: scanJob.id,
      fileSize: headResult.ContentLength
    });

    return {
      success: true,
      key: key,
      scanJobId: scanJob.id,
      status: 'uploaded',
      message: 'File uploaded successfully and queued for virus scanning'
    };

  } catch (error) {
    logger.error('Failed to complete upload', {
      error: error.message,
      key,
      userId
    });
    
    // If file verification fails, try to clean up
    try {
      await s3.deleteObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      }).promise();
    } catch (deleteError) {
      logger.error('Failed to cleanup failed upload', {
        error: deleteError.message,
        key
      });
    }
    
    throw error;
  }
};

/**
 * Get file download URL (temporary)
 */
const getDownloadUrl = async (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };

    const url = s3.getSignedUrl('getObject', params);
    
    return {
      downloadUrl: url,
      expires: new Date(Date.now() + (expiresIn * 1000))
    };

  } catch (error) {
    logger.error('Failed to generate download URL', {
      error: error.message,
      key
    });
    throw error;
  }
};

/**
 * Delete file from S3
 */
const deleteFile = async (key) => {
  try {
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    }).promise();

    logger.info('File deleted successfully', { key });
    return { success: true };

  } catch (error) {
    logger.error('Failed to delete file', {
      error: error.message,
      key
    });
    throw error;
  }
};

/**
 * List user's uploaded files
 */
const listUserFiles = async (userId, maxKeys = 100) => {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: `uploads/${userId}/`,
      MaxKeys: maxKeys
    };

    const result = await s3.listObjectsV2(params).promise();
    
    const files = result.Contents.map(object => ({
      key: object.Key,
      size: object.Size,
      lastModified: object.LastModified,
      fileName: path.basename(object.Key)
    }));

    return {
      files,
      totalCount: result.KeyCount,
      isTruncated: result.IsTruncated
    };

  } catch (error) {
    logger.error('Failed to list user files', {
      error: error.message,
      userId
    });
    throw error;
  }
};

module.exports = {
  generatePresignedUploadUrl,
  completeUpload,
  getDownloadUrl,
  deleteFile,
  listUserFiles,
  validateFile,
  scanQueue,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZES
};