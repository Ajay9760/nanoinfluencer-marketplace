import api from './api';

class PaymentService {
  constructor() {
    this.stripe = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Stripe with public key
   */
  async initializeStripe() {
    if (this.isInitialized && this.stripe) {
      return this.stripe;
    }

    try {
      // Load Stripe.js dynamically
      const stripe = await window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      
      if (!stripe) {
        throw new Error('Failed to initialize Stripe');
      }

      this.stripe = stripe;
      this.isInitialized = true;
      return stripe;
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      throw error;
    }
  }

  /**
   * Create escrow account for campaign
   */
  async createEscrow(campaignId, amount, currency = 'USD') {
    try {
      const response = await api.post('/payments/escrow/create', {
        campaignId,
        amount,
        currency
      });

      return response.data;
    } catch (error) {
      console.error('Error creating escrow:', error);
      throw error;
    }
  }

  /**
   * Create Stripe payment method for funding escrow
   */
  async createPaymentMethod(cardElement, billingDetails = {}) {
    try {
      if (!this.stripe) {
        await this.initializeStripe();
      }

      const { error, paymentMethod } = await this.stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: billingDetails,
      });

      if (error) {
        throw error;
      }

      return paymentMethod;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  /**
   * Fund escrow account with payment method
   */
  async fundEscrow(escrowId, paymentMethodId) {
    try {
      const response = await api.post('/payments/escrow/fund', {
        escrowId,
        paymentMethodId
      });

      return response.data;
    } catch (error) {
      console.error('Error funding escrow:', error);
      throw error;
    }
  }

  /**
   * Confirm payment intent if required (3D Secure, etc.)
   */
  async confirmPayment(clientSecret, paymentMethod) {
    try {
      if (!this.stripe) {
        await this.initializeStripe();
      }

      const { error, paymentIntent } = await this.stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: paymentMethod
        }
      );

      if (error) {
        throw error;
      }

      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Release funds to influencer (brand action)
   */
  async releaseFunds(applicationId, releaseAmount, reason = 'campaign_completed') {
    try {
      const response = await api.post('/payments/funds/release', {
        applicationId,
        releaseAmount,
        reason
      });

      return response.data;
    } catch (error) {
      console.error('Error releasing funds:', error);
      throw error;
    }
  }

  /**
   * Process refund to brand
   */
  async processRefund(campaignId, refundAmount, reason = 'campaign_cancelled') {
    try {
      const response = await api.post('/payments/refund', {
        campaignId,
        refundAmount,
        reason
      });

      return response.data;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Handle payment dispute
   */
  async handleDispute(escrowId, disputeType, evidence = {}) {
    try {
      const response = await api.post('/payments/dispute', {
        escrowId,
        disputeType,
        evidence
      });

      return response.data;
    } catch (error) {
      console.error('Error handling dispute:', error);
      throw error;
    }
  }

  /**
   * Get escrow account status
   */
  async getEscrowStatus(escrowId) {
    try {
      const response = await api.get(`/payments/escrow/${escrowId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting escrow status:', error);
      throw error;
    }
  }

  /**
   * Calculate payment fees
   */
  async calculateFees(amount) {
    try {
      const response = await api.get(`/payments/fees/calculate?amount=${amount}`);
      return response.data;
    } catch (error) {
      console.error('Error calculating fees:', error);
      throw error;
    }
  }

  /**
   * Format amount for display
   */
  formatAmount(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  /**
   * Validate card number
   */
  validateCardNumber(cardNumber) {
    // Remove spaces and non-numeric characters
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Basic length check
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Get card brand from number
   */
  getCardBrand(cardNumber) {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      diners: /^3[068]/,
      jcb: /^35/
    };

    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleaned)) {
        return brand;
      }
    }

    return 'unknown';
  }

  /**
   * Format card number for display
   */
  formatCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  }
}

export default new PaymentService();