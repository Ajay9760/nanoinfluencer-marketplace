const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

// All payment routes require authentication
router.use(authenticate);

/**
 * @route POST /api/payments/escrow/create
 * @desc Create escrow account for campaign funding
 * @access Private (Brand only)
 */
router.post(
  '/escrow/create',
  [
    body('campaignId').isInt().withMessage('Campaign ID must be an integer'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be a positive number'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters')
  ],
  validateRequest,
  paymentController.createEscrow
);

/**
 * @route POST /api/payments/escrow/fund
 * @desc Fund escrow account with payment method
 * @access Private (Brand only)
 */
router.post(
  '/escrow/fund',
  [
    body('escrowId').notEmpty().withMessage('Escrow ID is required'),
    body('paymentMethodId').notEmpty().withMessage('Payment method ID is required')
  ],
  validateRequest,
  paymentController.fundEscrow
);

/**
 * @route POST /api/payments/funds/release
 * @desc Release funds to influencer after content approval
 * @access Private (Brand only)
 */
router.post(
  '/funds/release',
  [
    body('applicationId').isInt().withMessage('Application ID must be an integer'),
    body('releaseAmount').optional().isFloat({ min: 0 }).withMessage('Release amount must be positive'),
    body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters')
  ],
  validateRequest,
  paymentController.releaseFunds
);

/**
 * @route POST /api/payments/refund
 * @desc Process refund to brand
 * @access Private (Brand only)
 */
router.post(
  '/refund',
  [
    body('campaignId').isInt().withMessage('Campaign ID must be an integer'),
    body('refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be positive'),
    body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters')
  ],
  validateRequest,
  paymentController.processRefund
);

/**
 * @route POST /api/payments/dispute
 * @desc Handle payment disputes
 * @access Private (Brand or Influencer involved)
 */
router.post(
  '/dispute',
  [
    body('escrowId').notEmpty().withMessage('Escrow ID is required'),
    body('disputeType').isIn([
      'content_not_delivered',
      'content_quality',
      'payment_delay',
      'breach_of_contract',
      'other'
    ]).withMessage('Invalid dispute type'),
    body('evidence').optional().isObject().withMessage('Evidence must be an object')
  ],
  validateRequest,
  paymentController.handleDispute
);

/**
 * @route GET /api/payments/escrow/:escrowId/status
 * @desc Get escrow account status and details
 * @access Private (Brand or Influencer involved)
 */
router.get(
  '/escrow/:escrowId/status',
  [
    param('escrowId').notEmpty().withMessage('Escrow ID is required')
  ],
  validateRequest,
  paymentController.getEscrowStatus
);

/**
 * @route GET /api/payments/fees/calculate
 * @desc Calculate payment fees for transparency
 * @access Private
 */
router.get(
  '/fees/calculate',
  [
    query('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
  ],
  validateRequest,
  paymentController.calculateFees
);

module.exports = router;