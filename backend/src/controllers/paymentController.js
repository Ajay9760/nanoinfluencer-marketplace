const escrowService = require('../services/escrowService');
const { Campaign, CampaignApplication: Application, User } = require('../models');
const { logger } = require('../utils/monitoring');

/**
 * Create escrow account for campaign funding
 */
const createEscrow = async (req, res) => {
  try {
    const { campaignId, amount, currency = 'USD' } = req.body;
    const brandId = req.user.id;

    // Verify user is a brand and owns the campaign
    if (req.user.userType !== 'brand') {
      return res.status(403).json({
        success: false,
        message: 'Only brands can create escrow accounts'
      });
    }

    // Verify campaign exists and belongs to brand
    const campaign = await Campaign.findOne({
      where: {
        id: campaignId,
        brandId: brandId
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found or access denied'
      });
    }

    // Create escrow account
    const escrowResult = await escrowService.createEscrowAccount(
      campaignId,
      brandId,
      amount,
      currency
    );

    if (!escrowResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create escrow account',
        error: escrowResult.error
      });
    }

    // Update campaign with escrow information
    await campaign.update({
      escrowId: escrowResult.escrowId,
      budget: amount,
      status: 'funded'
    });

    logger.info('Escrow account created for campaign', {
      userId: brandId,
      campaignId,
      escrowId: escrowResult.escrowId,
      amount
    });

    res.status(201).json({
      success: true,
      message: 'Escrow account created successfully',
      data: {
        escrowId: escrowResult.escrowId,
        clientSecret: escrowResult.clientSecret,
        amount,
        currency,
        status: escrowResult.status
      }
    });

  } catch (error) {
    logger.error('Error creating escrow account', {
      error: error.message,
      userId: req.user?.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Fund escrow account with payment
 */
const fundEscrow = async (req, res) => {
  try {
    const { escrowId, paymentMethodId } = req.body;
    const brandId = req.user.id;

    // Verify user owns the campaign associated with this escrow
    const campaign = await Campaign.findOne({
      where: {
        escrowId: escrowId,
        brandId: brandId
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Escrow account not found or access denied'
      });
    }

    // Fund the escrow
    const fundingResult = await escrowService.fundEscrow(escrowId, paymentMethodId);

    if (!fundingResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fund escrow account',
        error: fundingResult.error
      });
    }

    // Update campaign status
    await campaign.update({
      status: 'active',
      fundedAt: new Date()
    });

    logger.info('Escrow account funded', {
      userId: brandId,
      campaignId: campaign.id,
      escrowId,
      amount: fundingResult.amount
    });

    res.json({
      success: true,
      message: 'Escrow account funded successfully',
      data: {
        escrowId,
        status: fundingResult.status,
        amount: fundingResult.amount
      }
    });

  } catch (error) {
    logger.error('Error funding escrow account', {
      error: error.message,
      userId: req.user?.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Release funds to influencer (after content approval)
 */
const releaseFunds = async (req, res) => {
  try {
    const { applicationId, releaseAmount, reason = 'campaign_completed' } = req.body;
    const brandId = req.user.id;

    // Get application with campaign and influencer info
    const application = await Application.findOne({
      where: { id: applicationId },
      include: [
        {
          model: Campaign,
          where: { brandId: brandId },
          attributes: ['id', 'escrowId', 'budget', 'title']
        },
        {
          model: User,
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or access denied'
      });
    }

    if (!application.Campaign.escrowId) {
      return res.status(400).json({
        success: false,
        message: 'No escrow account found for this campaign'
      });
    }

    // Release funds
    const releaseResult = await escrowService.releaseFunds(
      application.Campaign.escrowId,
      application.influencerId,
      releaseAmount || application.Campaign.budget,
      reason
    );

    if (!releaseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to release funds',
        error: releaseResult.error
      });
    }

    // Update application status
    await application.update({
      status: 'completed',
      paymentStatus: 'paid',
      completedAt: new Date(),
      paidAmount: releaseResult.influencerAmount
    });

    logger.info('Funds released to influencer', {
      brandId,
      applicationId,
      influencerId: application.influencerId,
      escrowId: application.Campaign.escrowId,
      amount: releaseResult.influencerAmount,
      platformFee: releaseResult.platformFee
    });

    res.json({
      success: true,
      message: 'Funds released successfully',
      data: {
        influencerAmount: releaseResult.influencerAmount,
        platformFee: releaseResult.platformFee,
        transferId: releaseResult.transferId,
        status: releaseResult.status
      }
    });

  } catch (error) {
    logger.error('Error releasing funds', {
      error: error.message,
      userId: req.user?.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Process refund to brand
 */
const processRefund = async (req, res) => {
  try {
    const { campaignId, refundAmount, reason = 'campaign_cancelled' } = req.body;
    const brandId = req.user.id;

    // Get campaign with escrow info
    const campaign = await Campaign.findOne({
      where: {
        id: campaignId,
        brandId: brandId
      }
    });

    if (!campaign || !campaign.escrowId) {
      return res.status(404).json({
        success: false,
        message: 'Campaign or escrow account not found'
      });
    }

    // Process refund
    const refundResult = await escrowService.refundToBrand(
      campaign.escrowId,
      refundAmount || campaign.budget,
      reason
    );

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to process refund',
        error: refundResult.error
      });
    }

    // Update campaign status
    await campaign.update({
      status: 'cancelled',
      paymentStatus: 'refunded',
      refundedAt: new Date()
    });

    logger.info('Refund processed for campaign', {
      brandId,
      campaignId,
      escrowId: campaign.escrowId,
      refundAmount: refundResult.refundAmount,
      reason
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundAmount: refundResult.refundAmount,
        status: refundResult.status
      }
    });

  } catch (error) {
    logger.error('Error processing refund', {
      error: error.message,
      userId: req.user?.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Handle payment disputes
 */
const handleDispute = async (req, res) => {
  try {
    const { escrowId, disputeType, evidence = {} } = req.body;
    const userId = req.user.id;

    // Verify user has access to this escrow (brand or influencer involved)
    const campaign = await Campaign.findOne({
      where: { escrowId: escrowId },
      include: [{
        model: Application,
        where: { 
          $or: [
            { '$Campaign.brandId$': userId },
            { influencerId: userId }
          ]
        }
      }]
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Escrow account not found or access denied'
      });
    }

    // Handle dispute
    const disputeResult = await escrowService.handleDispute(
      escrowId,
      disputeType,
      { ...evidence, reportedBy: userId, reportedAt: new Date() }
    );

    if (!disputeResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to handle dispute',
        error: disputeResult.error
      });
    }

    logger.info('Dispute initiated', {
      userId,
      escrowId,
      disputeType,
      disputeId: disputeResult.disputeId
    });

    res.json({
      success: true,
      message: 'Dispute has been initiated and is under review',
      data: {
        disputeId: disputeResult.disputeId,
        status: disputeResult.status
      }
    });

  } catch (error) {
    logger.error('Error handling dispute', {
      error: error.message,
      userId: req.user?.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get escrow account status and details
 */
const getEscrowStatus = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this escrow
    const campaign = await Campaign.findOne({
      where: { escrowId: escrowId },
      include: [{
        model: Application,
        required: false
      }]
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Escrow account not found'
      });
    }

    // Check if user has access (brand owner or applied influencer)
    const hasAccess = campaign.brandId === userId || 
      campaign.Applications?.some(app => app.influencerId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to escrow account'
      });
    }

    // Get escrow status
    const statusResult = await escrowService.getEscrowStatus(escrowId);

    if (!statusResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get escrow status',
        error: statusResult.error
      });
    }

    res.json({
      success: true,
      data: {
        escrowId,
        campaign: {
          id: campaign.id,
          title: campaign.title,
          brandId: campaign.brandId
        },
        ...statusResult
      }
    });

  } catch (error) {
    logger.error('Error getting escrow status', {
      error: error.message,
      userId: req.user?.id,
      escrowId: req.params.escrowId
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Calculate payment fees for transparency
 */
const calculateFees = async (req, res) => {
  try {
    const { amount } = req.query;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const fees = escrowService.calculateFees(parseFloat(amount));

    res.json({
      success: true,
      data: fees
    });

  } catch (error) {
    logger.error('Error calculating fees', {
      error: error.message,
      amount: req.query.amount
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createEscrow,
  fundEscrow,
  releaseFunds,
  processRefund,
  handleDispute,
  getEscrowStatus,
  calculateFees
};