# Payment Testing Guide - TEST MODE ONLY

## ⚠️ IMPORTANT NOTICE

**THIS PLATFORM OPERATES IN TEST MODE ONLY**

- ✅ All payments use **Stripe Test Keys**
- ✅ **NO REAL MONEY** is transferred
- ✅ All transactions are **SIMULATED**
- ✅ Credit cards are **NOT CHARGED**
- ✅ Safe for testing and demonstration

## 🧪 Test Mode Features

### What's Available in Test Mode
- ✅ Complete payment flow simulation
- ✅ Escrow system testing
- ✅ Webhook event handling
- ✅ Payment status tracking
- ✅ Refund and dispute simulation
- ✅ Multi-currency testing (USD, EUR, GBP)
- ✅ Error scenario testing

### What's NOT Available in Test Mode
- ❌ Real money transfers
- ❌ Actual bank account deposits
- ❌ Real credit card charges
- ❌ Live payment processing
- ❌ Production-grade compliance checks

## 💳 Test Payment Methods

### Test Credit Cards

#### Successful Payments
```
Visa: 4242 4242 4242 4242
Mastercard: 5555 5555 5555 4444
American Express: 3782 822463 10005
Discover: 6011 1111 1111 1117

Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (4 for Amex)
ZIP: Any 5 digits
```

#### Declined Cards
```
Generic Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
Lost Card: 4000 0000 0000 9987
Stolen Card: 4000 0000 0000 9979
Expired Card: 4000 0000 0000 0069
Incorrect CVC: 4000 0000 0000 0127
```

#### Special Test Scenarios
```
Requires Authentication: 4000 0025 0000 3155
Disputed Transaction: 4000 0000 0000 0259
Refund Failure: 4000 0000 0000 3238
Processing Error: 4000 0000 0000 0119
```

### Bank Accounts (ACH Testing)
```
Routing: 110000000
Account: 000123456789 (checking)
Account: 000111111116 (savings)
```

### Digital Wallets
- Google Pay: Use test cards above
- Apple Pay: Use test cards above
- PayPal: Use Stripe's PayPal testing

## 🔄 Payment Flow Testing

### 1. Brand Payment Setup
```bash
# Test creating payment method
POST /api/payments/setup-intent
{
  "user_id": "brand_user_id",
  "currency": "usd"
}

# Response includes client_secret for frontend
```

### 2. Campaign Payment Process
```bash
# Create campaign with payment
POST /api/campaigns
{
  "title": "Test Campaign",
  "budget": 1000,
  "currency": "usd",
  "payment_method": "card",
  "escrow_enabled": true
}
```

### 3. Escrow Management
```bash
# Check escrow status
GET /api/payments/escrow/{campaign_id}

# Simulate campaign completion
POST /api/payments/escrow/{campaign_id}/complete

# Test refund scenario
POST /api/payments/escrow/{campaign_id}/refund
```

## 🎯 Testing Scenarios

### Scenario 1: Successful Campaign Payment
1. **Setup**: Brand adds payment method
2. **Campaign Creation**: Create campaign with $500 budget
3. **Escrow Hold**: Funds held in escrow (simulated)
4. **Campaign Completion**: Influencer completes work
5. **Payment Release**: Funds released to influencer (simulated)

### Scenario 2: Campaign Cancellation
1. **Setup**: Campaign created with escrow enabled
2. **Cancellation**: Brand cancels campaign
3. **Refund**: Funds refunded to brand (simulated)

### Scenario 3: Dispute Resolution
1. **Setup**: Campaign completed, payment released
2. **Dispute**: Brand disputes the work quality
3. **Investigation**: Platform investigates (manual process)
4. **Resolution**: Partial refund or full payment confirmation

### Scenario 4: Payment Method Failure
1. **Setup**: Use declined test card
2. **Payment**: Attempt payment creation
3. **Failure Handling**: Error messages and retry options
4. **Recovery**: Successfully add valid payment method

## 🔧 API Testing

### Payment Endpoints
```bash
# Get payment methods
GET /api/payments/methods
Authorization: Bearer {access_token}

# Add payment method
POST /api/payments/methods
{
  "type": "card",
  "setup_intent_id": "seti_test_...",
  "is_default": true
}

# Create payment intent
POST /api/payments/intents
{
  "amount": 5000,
  "currency": "usd",
  "campaign_id": "campaign_123",
  "description": "Test Campaign Payment"
}

# Webhook handling (for testing webhooks)
POST /api/webhooks/stripe
# Stripe will send test webhook events here
```

### Webhook Testing

#### Test Webhook Events
```bash
# Install Stripe CLI for local testing
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.dispute.created
```

#### Common Webhook Events
- `payment_intent.succeeded`: Payment completed
- `payment_intent.payment_failed`: Payment failed
- `payment_method.attached`: Payment method added
- `invoice.payment_succeeded`: Subscription payment
- `charge.dispute.created`: Payment disputed

## 🧪 Frontend Testing

### React Components Testing
```javascript
// Test payment form
import { render, screen, fireEvent } from '@testing-library/react';
import PaymentForm from '../components/PaymentForm';

test('payment form handles test card', async () => {
  render(<PaymentForm />);
  
  // Enter test card details
  fireEvent.change(screen.getByLabelText(/card number/i), {
    target: { value: '4242 4242 4242 4242' }
  });
  
  fireEvent.change(screen.getByLabelText(/expiry/i), {
    target: { value: '12/25' }
  });
  
  fireEvent.change(screen.getByLabelText(/cvc/i), {
    target: { value: '123' }
  });
  
  // Submit form
  fireEvent.click(screen.getByText(/add payment method/i));
  
  // Verify success
  await waitFor(() => {
    expect(screen.getByText(/payment method added/i)).toBeInTheDocument();
  });
});
```

### Stripe Elements Testing
```javascript
// Mock Stripe for testing
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() =>
    Promise.resolve({
      elements: jest.fn(() => ({
        create: jest.fn(() => ({
          mount: jest.fn(),
          destroy: jest.fn(),
          on: jest.fn(),
          update: jest.fn(),
        })),
      })),
      confirmCardPayment: jest.fn(() =>
        Promise.resolve({ paymentIntent: { status: 'succeeded' } })
      ),
    })
  ),
}));
```

## 📊 Test Data Management

### Sample Test Data
```sql
-- Test brands with payment methods
INSERT INTO users (id, name, email, role, status) VALUES 
('brand_1', 'Test Brand Co', 'brand@test.com', 'brand', 'active');

-- Test campaigns with payments
INSERT INTO campaigns (id, title, budget, currency, brand_id, status) VALUES 
('camp_1', 'Test Campaign', 50000, 'usd', 'brand_1', 'active');

-- Test payment records
INSERT INTO payments (id, amount, currency, status, campaign_id, stripe_payment_intent_id) VALUES 
('pay_1', 50000, 'usd', 'succeeded', 'camp_1', 'pi_test_1234567890');
```

### Database Cleanup
```bash
# Reset test database
npm run db:reset:test

# Seed test data
npm run db:seed:test
```

## 🔍 Monitoring and Logs

### Payment Event Logging
```javascript
// Example payment event logging
logger.info('Payment attempt initiated', {
  user_id: user.id,
  campaign_id: campaign.id,
  amount: paymentData.amount,
  currency: paymentData.currency,
  test_mode: true
});

logger.info('Payment webhook received', {
  event_type: event.type,
  payment_intent_id: event.data.object.id,
  status: event.data.object.status,
  test_mode: event.livemode === false
});
```

### Error Tracking
```javascript
// Track payment errors
try {
  await processPayment(paymentData);
} catch (error) {
  logger.error('Payment processing failed', {
    error: error.message,
    code: error.code,
    payment_intent_id: paymentData.id,
    test_mode: true
  });
  
  // Send to error tracking service
  Sentry.captureException(error, {
    tags: {
      payment_test_mode: true
    }
  });
}
```

## 🚀 Running Payment Tests

### Backend Tests
```bash
# Run all payment tests
npm run test:payments

# Run specific payment test suites
npm run test -- --grep "payment"
npm run test -- --grep "escrow"
npm run test -- --grep "webhook"

# Run with coverage
npm run test:coverage:payments
```

### Frontend Tests
```bash
# Run payment component tests
cd frontend-web
npm run test -- --testPathPattern=payment

# Run E2E payment tests
npm run test:e2e:payments
```

### Integration Tests
```bash
# Run full payment flow tests
npm run test:integration:payments

# Test webhook handling
npm run test:webhooks
```

## 🔐 Security Testing

### Test Security Scenarios
1. **Invalid Payment Methods**: Test with invalid card numbers
2. **CSRF Protection**: Verify CSRF tokens on payment endpoints
3. **Authorization**: Test access control on payment operations
4. **Input Validation**: Test with malformed payment data
5. **Rate Limiting**: Test payment endpoint rate limits

### Security Checklist
- [ ] Payment data is never logged in plain text
- [ ] Stripe keys are properly secured
- [ ] Webhook signatures are verified
- [ ] Payment amounts are validated
- [ ] User authorization is checked
- [ ] HTTPS is enforced for all payment operations

## 📈 Performance Testing

### Load Testing
```bash
# Test payment endpoint performance
artillery quick --count 10 --num 5 http://localhost:3001/api/payments/methods

# Test webhook handling
artillery run webhook-load-test.yml
```

### Monitoring Metrics
- Payment processing time
- Webhook response time
- Database query performance
- Error rates
- Success rates

## 🐛 Troubleshooting

### Common Issues

#### "Payment method not found"
```javascript
// Check if payment method exists
const paymentMethod = await stripe.paymentMethods.retrieve(pm_id);
if (!paymentMethod) {
  throw new Error('Payment method not found');
}
```

#### "Webhook signature verification failed"
```javascript
// Ensure webhook endpoint secret is correct
const sig = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(request.body, sig, webhook_secret);
```

#### "Payment intent confirmation failed"
```javascript
// Check payment intent status
const paymentIntent = await stripe.paymentIntents.retrieve(pi_id);
console.log('Payment Intent Status:', paymentIntent.status);
```

### Debug Mode
```bash
# Enable payment debugging
export DEBUG_PAYMENTS=true
export STRIPE_LOG_LEVEL=debug

# Start server with payment debugging
npm run dev
```

## 📚 Resources

### Documentation
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Payment Intents API](https://stripe.com/docs/api/payment_intents)

### Tools
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhook Testing](https://webhook.site/)
- [Request Inspector](https://requestinspector.com/)

---

## ⚠️ Final Reminder

**THIS IS TEST MODE ONLY - NO REAL PAYMENTS ARE PROCESSED**

All payment operations are simulated for testing and demonstration purposes. Before going live, you would need to:

1. Replace test keys with live Stripe keys
2. Implement additional compliance measures
3. Set up proper financial reporting
4. Configure production webhook endpoints
5. Implement fraud prevention measures
6. Complete Stripe account verification

**Contact the development team before making any changes to payment configuration!**