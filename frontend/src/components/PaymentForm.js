// This file has been moved to frontend-web/src/components/PaymentForm.js
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import paymentService from '../services/paymentService';
import './PaymentForm.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: '"Open Sans", sans-serif',
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: false,
};

const PaymentFormContent = ({ 
  campaign, 
  amount, 
  onSuccess, 
  onError, 
  loading: externalLoading = false 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fees, setFees] = useState(null);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  useEffect(() => {
    loadFees();
  }, [amount]);

  const loadFees = async () => {
    try {
      const result = await paymentService.calculateFees(amount);
      if (result.success) {
        setFees(result.data);
      }
    } catch (error) {
      console.error('Error loading fees:', error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);

      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: billingDetails,
      });

      if (paymentMethodError) {
        throw paymentMethodError;
      }

      // Create escrow account
      const escrowResult = await paymentService.createEscrow(
        campaign.id,
        amount,
        campaign.currency || 'USD'
      );

      if (!escrowResult.success) {
        throw new Error(escrowResult.message || 'Failed to create escrow account');
      }

      // Fund the escrow account
      const fundingResult = await paymentService.fundEscrow(
        escrowResult.data.escrowId,
        paymentMethod.id
      );

      if (!fundingResult.success) {
        throw new Error(fundingResult.message || 'Payment failed');
      }

      // Handle successful payment
      onSuccess({
        escrowId: escrowResult.data.escrowId,
        paymentMethod: paymentMethod.id,
        amount: amount,
        ...fundingResult.data
      });

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred during payment');
      onError && onError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBillingChange = (field, value) => {
    if (field.includes('address.')) {
      const addressField = field.split('.')[1];
      setBillingDetails(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const isDisabled = loading || externalLoading || !stripe;

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-summary">
        <h3>Payment Summary</h3>
        <div className="summary-row">
          <span>Campaign Budget:</span>
          <span>{paymentService.formatAmount(amount, campaign.currency)}</span>
        </div>
        {fees && (
          <>
            <div className="summary-row">
              <span>Platform Fee ({(fees.platformFee / amount * 100).toFixed(1)}%):</span>
              <span>{paymentService.formatAmount(fees.platformFee, campaign.currency)}</span>
            </div>
            <div className="summary-row">
              <span>Processing Fee:</span>
              <span>{paymentService.formatAmount(fees.stripeFee, campaign.currency)}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>{paymentService.formatAmount(fees.totalAmount, campaign.currency)}</span>
            </div>
            <div className="summary-note">
              <small>Influencer will receive: {paymentService.formatAmount(fees.netToInfluencer, campaign.currency)}</small>
            </div>
          </>
        )}
      </div>

      <div className="billing-details">
        <h3>Billing Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="billingName">Full Name *</label>
            <input
              id="billingName"
              type="text"
              value={billingDetails.name}
              onChange={(e) => handleBillingChange('name', e.target.value)}
              required
              disabled={isDisabled}
            />
          </div>
          <div className="form-group">
            <label htmlFor="billingEmail">Email *</label>
            <input
              id="billingEmail"
              type="email"
              value={billingDetails.email}
              onChange={(e) => handleBillingChange('email', e.target.value)}
              required
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="billingAddress">Address *</label>
          <input
            id="billingAddress"
            type="text"
            placeholder="123 Main St"
            value={billingDetails.address.line1}
            onChange={(e) => handleBillingChange('address.line1', e.target.value)}
            required
            disabled={isDisabled}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="billingCity">City *</label>
            <input
              id="billingCity"
              type="text"
              value={billingDetails.address.city}
              onChange={(e) => handleBillingChange('address.city', e.target.value)}
              required
              disabled={isDisabled}
            />
          </div>
          <div className="form-group">
            <label htmlFor="billingState">State *</label>
            <input
              id="billingState"
              type="text"
              value={billingDetails.address.state}
              onChange={(e) => handleBillingChange('address.state', e.target.value)}
              required
              disabled={isDisabled}
            />
          </div>
          <div className="form-group">
            <label htmlFor="billingZip">ZIP Code *</label>
            <input
              id="billingZip"
              type="text"
              value={billingDetails.address.postal_code}
              onChange={(e) => handleBillingChange('address.postal_code', e.target.value)}
              required
              disabled={isDisabled}
            />
          </div>
        </div>
      </div>

      <div className="payment-method">
        <h3>Payment Method</h3>
        <div className="card-element-container">
          <CardElement 
            options={CARD_ELEMENT_OPTIONS}
            disabled={isDisabled}
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="payment-actions">
        <button
          type="submit"
          disabled={isDisabled}
          className={`pay-button ${isDisabled ? 'disabled' : ''}`}
        >
          {loading ? 'Processing...' : `Fund Campaign - ${paymentService.formatAmount(amount, campaign.currency)}`}
        </button>
      </div>

      <div className="security-note">
        <p>
          🔒 Your payment information is secured by Stripe and encrypted end-to-end.
          Funds will be held in escrow until campaign completion.
        </p>
      </div>
    </form>
  );
};

const PaymentForm = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
};

export default PaymentForm;