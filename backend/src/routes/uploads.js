const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');

// Validation middleware
const validateSignUpload = [
  body('fileName')
    .notEmpty()
    .withMessage('File name is required')
    .isLength({ max: 255 })
    .withMessage('File name too long')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage('File name contains invalid characters'),
  
  body('fileSize')
    .isInt({ min: 1 })
    .withMessage('File size must be a positive integer'),
  
  body('contentType')
    .notEmpty()
    .withMessage('Content type is required')
    .matches(/^[a-zA-Z0-9\-_]+\/[a-zA-Z0-9\-_\+\.]+$/)
    .withMessage('Invalid content type format')
];

const validateCompleteUpload = [
  body('key')
    .notEmpty()
    .withMessage('File key is required')
    .matches(/^uploads\/[a-f0-9\-]+\/\d+\-[a-f0-9]+\-[a-zA-Z0-9\-_]+\.[a-zA-Z0-9]+$/)
    .withMessage('Invalid file key format'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

const validateFileKey = [
  param('key')
    .notEmpty()
    .withMessage('File key is required')
    .matches(/^uploads\/[a-f0-9\-]+\/\d+\-[a-f0-9]+\-[a-zA-Z0-9\-_]+\.[a-zA-Z0-9]+$/)
    .withMessage('Invalid file key format')
];

const validateFileUpload = [
  body('fileName')
    .notEmpty()
    .withMessage('File name is required'),
  
  body('fileSize')
    .isInt({ min: 1 })
    .withMessage('File size must be a positive integer'),
  
  body('contentType')
    .notEmpty()
    .withMessage('Content type is required')
];

/**
 * @route   POST /api/uploads/sign-upload
 * @desc    Generate presigned URL for file upload
 * @access  Private
 */
router.post('/sign-upload', authenticate, validateSignUpload, uploadController.signUpload);

/**
 * @route   POST /api/uploads/complete
 * @desc    Mark upload as complete and trigger virus scan
 * @access  Private
 */
router.post('/complete', authenticate, validateCompleteUpload, uploadController.completeFileUpload);

/**
 * @route   GET /api/uploads/download/:key
 * @desc    Get temporary download URL for file
 * @access  Private
 */
router.get('/download/:key(*)', authenticate, uploadController.getFileDownloadUrl);

/**
 * @route   DELETE /api/uploads/:key
 * @desc    Delete user's uploaded file
 * @access  Private
 */
router.delete('/:key(*)', authenticate, uploadController.deleteUserFile);

/**
 * @route   GET /api/uploads
 * @desc    List user's uploaded files
 * @access  Private
 */
router.get('/', authenticate, uploadController.listFiles);

/**
 * @route   GET /api/uploads/limits
 * @desc    Get file upload limits and allowed types
 * @access  Private
 */
router.get('/limits', authenticate, uploadController.getUploadLimits);

/**
 * @route   POST /api/uploads/validate
 * @desc    Validate file before upload (client-side validation)
 * @access  Private
 */
router.post('/validate', authenticate, validateFileUpload, uploadController.validateFileUpload);

module.exports = router;