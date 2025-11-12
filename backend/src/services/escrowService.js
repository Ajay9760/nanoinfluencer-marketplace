const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { logger } = require('../utils/monitoring');

class EscrowService {
  constructor() {
    this.platformCommission = 0.1; // 10% platform fee
  }

  /**
   * Create escrow account for a campaign
   */
  async createEscrowAccount(campaignId, brandId, amount, currency = 'USD') {
    try {
      // Create a separate account or use payment intents with holds
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        capture_method: 'manual', // Hold the payment
        metadata: {
          type: 'campaign_escrow',
          campaign_id: campaignId,
          brand_id: brandId,
          original_amount: amount.toString()
        },
        description: `Escrow for Campaign ${campaignId}`
      });

      logger.info('Escrow account created', {
        campaignId,
        brandId,
        amount,
        paymentIntentId: paymentIntent.id
      });

      return {
        success: true,
        escrowId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: 'pending_payment'
      };

    } catch (error) {
      logger.error('Failed to create escrow account', {
        error: error.message,
        campaignId,
        brandId,
        amount
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fund the escrow account (brand pays)
   */
  async fundEscrow(escrowId, paymentMethodId) {
    try {
      // Confirm the payment intent with the payment method
      const paymentIntent = await stripe.paymentIntents.confirm(escrowId, {
        payment_method: paymentMethodId
      });

      if (paymentIntent.status === 'requires_capture') {
        // Funds are authorized and held in escrow
        logger.info('Escrow funded successfully', {
          escrowId,
          amount: paymentIntent.amount / 100,
          status: paymentIntent.status
        });

        return {
          success: true,
          status: 'funded',
          amount: paymentIntent.amount / 100
        };
      }

      return {
        success: false,
        error: 'Payment could not be authorized'
      };

    } catch (error) {
      logger.error('Failed to fund escrow', {
        error: error.message,
        escrowId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Release funds to influencer (after content approval)
   */
  async releaseFunds(escrowId, influencerId, releaseAmount, reason = 'campaign_completed') {
    try {
      // Get the payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(escrowId);
      
      if (paymentIntent.status !== 'requires_capture') {
        throw new Error('Funds cannot be released - payment not properly authorized');
      }

      // Calculate amounts
      const totalAmount = paymentIntent.amount / 100;
      const platformFee = totalAmount * this.platformCommission;
      const influencerAmount = totalAmount - platformFee;

      // Capture the full payment
      await stripe.paymentIntents.capture(escrowId);

      // Create transfer to influencer (requires Stripe Connect)
      // For now, we'll create a record of the transaction
      const transfer = await this.createTransferRecord(
        influencerId,
        influencerAmount,
        paymentIntent.currency,
        reason
      );

      logger.info('Funds released from escrow', {
        escrowId,
        influencerId,
        totalAmount,
        influencerAmount,
        platformFee,
        reason
      });

      return {
        success: true,
        influencerAmount,
        platformFee,
        transferId: transfer.id,
        status: 'released'
      };

    } catch (error) {
      logger.error('Failed to release funds', {
        error: error.message,
        escrowId,
        influencerId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refund to brand (if campaign is cancelled or disputed)
   */
  async refundToBrand(escrowId, refundAmount, reason = 'campaign_cancelled') {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(escrowId);
      
      if (paymentIntent.status === 'requires_capture') {
        // Cancel the payment intent (releases hold)
        await stripe.paymentIntents.cancel(escrowId);
      } else if (paymentIntent.status === 'succeeded') {
        // Create refund for captured payment
        await stripe.refunds.create({
          payment_intent: escrowId,
          amount: Math.round(refundAmount * 100),
          reason: 'requested_by_customer',
          metadata: {
            refund_reason: reason
          }
        });
      }

      logger.info('Refund processed', {
        escrowId,
        refundAmount,
        reason
      });

      return {
        success: true,
        refundAmount,
        status: 'refunded'
      };

    } catch (error) {
      logger.error('Failed to process refund', {
        error: error.message,
        escrowId,
        refundAmount
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle disputes
   */
  async handleDispute(escrowId, disputeType, evidence = {}) {
    try {
      // Put funds on hold during dispute
      const paymentIntent = await stripe.paymentIntents.retrieve(escrowId);
      
      const disputeRecord = {
        escrowId,
        disputeType,
        status: 'under_review',
        evidence,
        createdAt: new Date(),
        paymentStatus: paymentIntent.status
      };

      // In production, integrate with dispute resolution system
      logger.info('Dispute initiated', {
        escrowId,
        disputeType,
        evidence
      });

      return {
        success: true,
        disputeId: `dispute_${Date.now()}`,
        status: 'under_review',
        message: 'Dispute has been logged and is under review'
      };

    } catch (error) {
      logger.error('Failed to handle dispute', {
        error: error.message,
        escrowId,
        disputeType
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get escrow account status
   */
  async getEscrowStatus(escrowId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(escrowId);
      
      const status = this.mapStripeStatusToEscrow(paymentIntent.status);
      
      return {
        success: true,
        escrowId,
        status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      };

    } catch (error) {
      logger.error('Failed to get escrow status', {
        error: error.message,
        escrowId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Map Stripe payment intent status to escrow status
   */
  mapStripeStatusToEscrow(stripeStatus) {
    const statusMap = {
      'requires_payment_method': 'pending_payment',
      'requires_confirmation': 'pending_payment',
      'requires_action': 'pending_payment',
      'processing': 'processing',
      'requires_capture': 'funded', // Money is held in escrow
      'succeeded': 'released',
      'canceled': 'cancelled'
    };

    return statusMap[stripeStatus] || 'unknown';
  }

  /**
   * Create transfer record for influencer payment
   */
  async createTransferRecord(influencerId, amount, currency, reason) {
    // In production, integrate with Stripe Connect for actual transfers
    // For now, create a record for tracking
    return {
      id: `transfer_${Date.now()}`,
      influencerId,
      amount,
      currency,
      reason,
      status: 'pending_bank_transfer',
      createdAt: new Date()
    };
  }

  /**
   * Calculate platform fees
   */
  calculateFees(amount) {
    const platformFee = amount * this.platformCommission;
    const stripeFee = (amount * 0.029) + 0.30; // Stripe's typical fee
    const influencerAmount = amount - platformFee - stripeFee;

    return {
      totalAmount: amount,
      influencerAmount: Math.max(0, influencerAmount),
      platformFee,
      stripeFee,
      netToInfluencer: Math.max(0, influencerAmount)
    };
  }
}

module.exports = new EscrowService();