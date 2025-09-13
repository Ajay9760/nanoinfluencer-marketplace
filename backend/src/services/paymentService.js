const stripe = require('stripe');
const { logger } = require('../utils/monitoring');
const { getSecrets } = require('../utils/secrets');

/**
 * Payment Processing Service using Stripe
 * Handles payments, subscriptions, refunds, and webhook processing
 */
class PaymentService {
  constructor() {
    this.stripeClient = null;
    this.initializeStripe();
  }

  /**
   * Initialize Stripe client
   */
  async initializeStripe() {
    try {
      const stripeSecretKey = await getSecrets.external.getStripeKeys();
      this.stripeClient = stripe(stripeSecretKey.secretKey);
      
      logger.info('Stripe client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Stripe client', {
        error: error.message
      });
    }
  }

  /**
   * Create a payment intent for campaign payments
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    try {
      if (!this.stripeClient) {
        await this.initializeStripe();
      }

      const paymentIntent = await this.stripeClient.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          ...metadata,
          created_by: 'nanoinfluencer-marketplace'
        }
      });

      logger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        metadata
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      };
    } catch (error) {
      logger.error('Failed to create payment intent', {
        error: error.message,
        amount,
        currency,
        metadata
      });
      throw new Error(`Payment intent creation failed: ${error.message}`);
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId
      });

      logger.info('Payment intent confirmed', {
        paymentIntentId,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100
      });

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      };
    } catch (error) {
      logger.error('Failed to confirm payment intent', {
        error: error.message,
        paymentIntentId
      });
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await this.stripeClient.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          created_by: 'nanoinfluencer-marketplace'
        }
      });

      logger.info('Stripe customer created', {
        customerId: customer.id,
        email,
        name
      });

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name
      };
    } catch (error) {
      logger.error('Failed to create Stripe customer', {
        error: error.message,
        email,
        name
      });
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  /**
   * Create a subscription for premium features
   */
  async createSubscription(customerId, priceId, metadata = {}) {
    try {
      const subscription = await this.stripeClient.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          ...metadata,
          created_by: 'nanoinfluencer-marketplace'
        }
      });

      logger.info('Subscription created', {
        subscriptionId: subscription.id,
        customerId,
        priceId,
        status: subscription.status
      });

      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        status: subscription.status
      };
    } catch (error) {
      logger.error('Failed to create subscription', {
        error: error.message,
        customerId,
        priceId
      });
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId, cancellationReason = '') {
    try {
      const subscription = await this.stripeClient.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          cancellation_reason: cancellationReason
        }
      });

      logger.info('Subscription cancelled', {
        subscriptionId,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      });

      return {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      };
    } catch (error) {
      logger.error('Failed to cancel subscription', {
        error: error.message,
        subscriptionId
      });
      throw new Error(`Subscription cancellation failed: ${error.message}`);
    }
  }

  /**
   * Process platform fee (for taking commission from campaigns)
   */
  async createConnectedAccountTransfer(connectedAccountId, amount, currency, metadata = {}) {
    try {
      const transfer = await this.stripeClient.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        destination: connectedAccountId,
        metadata: {
          ...metadata,
          transfer_type: 'campaign_payment'
        }
      });

      logger.info('Connected account transfer created', {
        transferId: transfer.id,
        amount,
        currency,
        destination: connectedAccountId
      });

      return {
        id: transfer.id,
        amount: transfer.amount / 100,
        currency: transfer.currency,
        destination: transfer.destination
      };
    } catch (error) {
      logger.error('Failed to create connected account transfer', {
        error: error.message,
        connectedAccountId,
        amount,
        currency
      });
      throw new Error(`Transfer creation failed: ${error.message}`);
    }
  }

  /**
   * Create a refund
   */
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripeClient.refunds.create(refundData);

      logger.info('Refund created', {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount / 100,
        reason: refund.reason,
        status: refund.status
      });

      return {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        reason: refund.reason,
        status: refund.status
      };
    } catch (error) {
      logger.error('Failed to create refund', {
        error: error.message,
        paymentIntentId,
        amount,
        reason
      });
      throw new Error(`Refund creation failed: ${error.message}`);
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentIntentId) {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      logger.error('Failed to get payment details', {
        error: error.message,
        paymentIntentId
      });
      throw new Error(`Failed to retrieve payment details: ${error.message}`);
    }
  }

  /**
   * Create a connected account for influencers to receive payments
   */
  async createConnectedAccount(email, country = 'US', businessType = 'individual') {
    try {
      const account = await this.stripeClient.accounts.create({
        type: 'express',
        country,
        email,
        business_type: businessType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        metadata: {
          created_by: 'nanoinfluencer-marketplace',
          account_type: 'influencer'
        }
      });

      logger.info('Connected account created', {
        accountId: account.id,
        email,
        country,
        businessType
      });

      return {
        id: account.id,
        email: account.email,
        country: account.country,
        businessType: account.business_type
      };
    } catch (error) {
      logger.error('Failed to create connected account', {
        error: error.message,
        email,
        country,
        businessType
      });
      throw new Error(`Connected account creation failed: ${error.message}`);
    }
  }

  /**
   * Create account link for onboarding
   */
  async createAccountLink(accountId, refreshUrl, returnUrl) {
    try {
      const accountLink = await this.stripeClient.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      logger.info('Account link created', {
        accountId,
        url: accountLink.url
      });

      return {
        url: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000)
      };
    } catch (error) {
      logger.error('Failed to create account link', {
        error: error.message,
        accountId
      });
      throw new Error(`Account link creation failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, endpointSecret) {
    try {
      const event = this.stripeClient.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );

      logger.debug('Webhook signature verified', {
        eventType: event.type,
        eventId: event.id
      });

      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed', {
        error: error.message
      });
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Process webhook events
   */
  async processWebhookEvent(event) {
    try {
      logger.info('Processing webhook event', {
        eventType: event.type,
        eventId: event.id
      });

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;

        default:
          logger.info('Unhandled webhook event type', {
            eventType: event.type
          });
      }

      return { received: true };
    } catch (error) {
      logger.error('Error processing webhook event', {
        error: error.message,
        eventType: event.type,
        eventId: event.id
      });
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(paymentIntent) {
    logger.info('Payment succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    });

    // Update campaign payment status, send notifications, etc.
    // This would integrate with your campaign/order management system
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(paymentIntent) {
    logger.error('Payment failed', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      lastPaymentError: paymentIntent.last_payment_error
    });

    // Handle payment failure - notify user, retry logic, etc.
  }

  /**
   * Handle subscription created
   */
  async handleSubscriptionCreated(subscription) {
    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status
    });

    // Update user subscription status in database
  }

  /**
   * Handle subscription updated
   */
  async handleSubscriptionUpdated(subscription) {
    logger.info('Subscription updated', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status
    });

    // Update user subscription status in database
  }

  /**
   * Handle subscription deleted
   */
  async handleSubscriptionDeleted(subscription) {
    logger.info('Subscription deleted', {
      subscriptionId: subscription.id,
      customerId: subscription.customer
    });

    // Update user subscription status in database
  }

  /**
   * Handle successful invoice payment
   */
  async handleInvoicePaymentSucceeded(invoice) {
    logger.info('Invoice payment succeeded', {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency
    });

    // Update subscription billing status
  }

  /**
   * Handle failed invoice payment
   */
  async handleInvoicePaymentFailed(invoice) {
    logger.error('Invoice payment failed', {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_due / 100,
      currency: invoice.currency
    });

    // Handle failed subscription payment - notify user, retry logic, etc.
  }

  /**
   * Calculate platform fee
   */
  calculatePlatformFee(amount, feePercentage = 5) {
    const fee = (amount * feePercentage) / 100;
    const influencerAmount = amount - fee;
    
    return {
      totalAmount: amount,
      platformFee: fee,
      influencerAmount: influencerAmount,
      feePercentage
    };
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods() {
    return [
      'card',
      'apple_pay',
      'google_pay',
      'link',
      'us_bank_account'
    ];
  }

  /**
   * Get subscription pricing tiers
   */
  getSubscriptionTiers() {
    return {
      basic: {
        name: 'Basic',
        priceId: process.env.STRIPE_BASIC_PRICE_ID,
        price: 9.99,
        currency: 'usd',
        interval: 'month',
        features: [
          'Up to 5 active campaigns',
          'Basic analytics',
          'Email support'
        ]
      },
      pro: {
        name: 'Pro',
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        price: 29.99,
        currency: 'usd',
        interval: 'month',
        features: [
          'Unlimited campaigns',
          'Advanced analytics',
          'Priority support',
          'Custom branding'
        ]
      },
      enterprise: {
        name: 'Enterprise',
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        price: 99.99,
        currency: 'usd',
        interval: 'month',
        features: [
          'All Pro features',
          'Dedicated account manager',
          'API access',
          'Custom integrations'
        ]
      }
    };
  }
}

// Create singleton instance
const paymentService = new PaymentService();

module.exports = { PaymentService, paymentService };