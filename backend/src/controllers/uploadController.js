const { validationResult } = require('express-validator');
const { 
  generatePresignedUploadUrl, 
  completeUpload,
  getDownloadUrl,
  deleteFile,
  listUserFiles,
  validateFile 
} = require('../services/uploadService');
const { logger } = require('../utils/monitoring');

/**
 * Generate presigned URL for file upload
 */
const signUpload = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { fileName, fileSize, contentType } = req.body;
    const userId = req.user.id;

    // Generate presigned URL
    const uploadData = await generatePresignedUploadUrl(
      fileName, 
      fileSize, 
      contentType, 
      userId
    );

    res.json({
      message: 'Presigned upload URL generated successfully',
      uploadData
    });

  } catch (error) {
    logger.error('Failed to generate presigned upload URL', {
      error: error.message,
      userId: req.user?.id,
      fileName: req.body?.fileName
    });

    res.status(400).json({
      error: 'Upload URL generation failed',
      message: error.message
    });
  }
};

/**
 * Complete file upload and trigger virus scan
 */
const completeFileUpload = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { key, metadata = {} } = req.body;
    const userId = req.user.id;

    // Complete the upload
    const result = await completeUpload(key, userId, metadata);

    res.json({
      message: 'File upload completed successfully',
      ...result
    });

  } catch (error) {
    logger.error('Failed to complete file upload', {
      error: error.message,
      userId: req.user?.id,
      key: req.body?.key
    });

    res.status(400).json({
      error: 'Upload completion failed',
      message: error.message
    });
  }
};

/**
 * Get temporary download URL for file
 */
const getFileDownloadUrl = async (req, res) => {
  try {
    const { key } = req.params;
    const { expiresIn = 3600 } = req.query; // Default 1 hour
    const userId = req.user.id;

    // Verify user owns the file (basic security check)
    if (!key.startsWith(`uploads/${userId}/`)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this file'
      });
    }

    const downloadData = await getDownloadUrl(key, parseInt(expiresIn));

    res.json({
      message: 'Download URL generated successfully',
      ...downloadData
    });

  } catch (error) {
    logger.error('Failed to generate download URL', {
      error: error.message,
      userId: req.user?.id,
      key: req.params?.key
    });

    res.status(400).json({
      error: 'Download URL generation failed',
      message: error.message
    });
  }
};

/**
 * Delete user's uploaded file
 */
const deleteUserFile = async (req, res) => {
  try {
    const { key } = req.params;
    const userId = req.user.id;

    // Verify user owns the file
    if (!key.startsWith(`uploads/${userId}/`)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to delete this file'
      });
    }

    await deleteFile(key);

    res.json({
      message: 'File deleted successfully',
      key
    });

  } catch (error) {
    logger.error('Failed to delete file', {
      error: error.message,
      userId: req.user?.id,
      key: req.params?.key
    });

    res.status(400).json({
      error: 'File deletion failed',
      message: error.message
    });
  }
};

/**
 * List user's uploaded files
 */
const listFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { maxKeys = 100 } = req.query;

    const result = await listUserFiles(userId, parseInt(maxKeys));

    res.json({
      message: 'Files retrieved successfully',
      ...result
    });

  } catch (error) {
    logger.error('Failed to list user files', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'File listing failed',
      message: 'Failed to retrieve file list'
    });
  }
};

/**
 * Get file upload limits and allowed types
 */
const getUploadLimits = async (req, res) => {
  try {
    const { ALLOWED_FILE_TYPES, MAX_FILE_SIZES } = require('../services/uploadService');

    res.json({
      message: 'Upload limits retrieved successfully',
      limits: {
        allowedTypes: ALLOWED_FILE_TYPES,
        maxSizes: MAX_FILE_SIZES,
        maxFilesPerUser: 100, // Can be made configurable
        totalStorageLimit: '1GB' // Can be made configurable
      }
    });

  } catch (error) {
    logger.error('Failed to get upload limits', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get upload limits',
      message: error.message
    });
  }
};

/**
 * Validate file before upload (client-side validation)
 */
const validateFileUpload = async (req, res) => {
  try {
    const { fileName, fileSize, contentType } = req.body;

    const validationErrors = validateFile(fileName, fileSize, contentType);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'File validation failed',
        message: 'File does not meet upload requirements',
        details: validationErrors
      });
    }

    res.json({
      message: 'File validation passed',
      valid: true
    });

  } catch (error) {
    logger.error('File validation failed', {
      error: error.message,
      fileName: req.body?.fileName
    });

    res.status(400).json({
      error: 'Validation failed',
      message: error.message
    });
  }
};

module.exports = {
  signUpload,
  completeFileUpload,
  getFileDownloadUrl,
  deleteUserFile,
  listFiles,
  getUploadLimits,
  validateFileUpload
};