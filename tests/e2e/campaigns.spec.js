import { test, expect } from '@playwright/test';

test.describe('Campaign Management', () => {
  const brandUser = {
    email: `brand${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    firstName: 'Brand',
    lastName: 'Manager',
    userType: 'brand'
  };

  const influencerUser = {
    email: `influencer${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    firstName: 'Influencer',
    lastName: 'Creator',
    userType: 'influencer'
  };

  test.beforeEach(async ({ page }) => {
    // Register brand user
    await page.request.post('/api/auth/register', {
      data: {
        ...brandUser,
        confirmPassword: brandUser.password,
        acceptTerms: true
      }
    });

    // Register influencer user  
    await page.request.post('/api/auth/register', {
      data: {
        ...influencerUser,
        confirmPassword: influencerUser.password,
        acceptTerms: true
      }
    });
  });

  test('brand should create a new campaign successfully', async ({ page }) => {
    // Login as brand
    await page.goto('/login');
    await page.fill('[name="email"]', brandUser.email);
    await page.fill('[name="password"]', brandUser.password);
    await page.click('button[type="submit"]');

    // Navigate to create campaign
    await page.goto('/campaigns/create');
    await expect(page.locator('h1')).toContainText('Create New Campaign');

    // Fill campaign details
    const campaignData = {
      title: 'Summer Fashion Collection 2024',
      description: 'Promote our latest summer fashion line with authentic styling content',
      budget: '5000',
      startDate: '2024-07-01',
      endDate: '2024-07-31',
      deliverables: 'Instagram post, Instagram story, TikTok video',
      requirements: 'Fashion-focused audience, 10K+ followers'
    };

    await page.fill('[name="title"]', campaignData.title);
    await page.fill('[name="description"]', campaignData.description);
    await page.fill('[name="budget"]', campaignData.budget);
    await page.fill('[name="startDate"]', campaignData.startDate);
    await page.fill('[name="endDate"]', campaignData.endDate);
    await page.fill('[name="deliverables"]', campaignData.deliverables);
    await page.fill('[name="requirements"]', campaignData.requirements);

    // Select target platforms
    await page.check('[name="platforms"][value="instagram"]');
    await page.check('[name="platforms"][value="tiktok"]');

    // Select audience demographics
    await page.selectOption('[name="targetAge"]', '18-34');
    await page.selectOption('[name="targetGender"]', 'all');
    await page.fill('[name="targetLocation"]', 'United States, Canada');

    // Upload campaign brief (simulate file upload)
    await page.setInputFiles('[name="campaignBrief"]', {
      name: 'campaign-brief.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock campaign brief content')
    });

    // Submit campaign
    await page.click('button[type="submit"]');

    // Should show success message and redirect
    await expect(page.locator('.alert-success')).toContainText('Campaign created successfully');
    await expect(page).toHaveURL(/\/campaigns\/\d+/);
    
    // Verify campaign details are displayed
    await expect(page.locator('h1')).toContainText(campaignData.title);
    await expect(page.locator('.campaign-budget')).toContainText('$5,000');
    await expect(page.locator('.campaign-status')).toContainText('Draft');
  });

  test('should validate required campaign fields', async ({ page }) => {
    // Login as brand
    await page.goto('/login');
    await page.fill('[name="email"]', brandUser.email);
    await page.fill('[name="password"]', brandUser.password);
    await page.click('button[type="submit"]');

    await page.goto('/campaigns/create');

    // Try to submit without required fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('.error-message')).toContainText('Campaign title is required');
    await expect(page.locator('.error-message')).toContainText('Description is required');
    await expect(page.locator('.error-message')).toContainText('Budget is required');
  });

  test('brand should publish campaign and make it available for applications', async ({ page }) => {
    // Create campaign first
    await page.goto('/login');
    await page.fill('[name="email"]', brandUser.email);
    await page.fill('[name="password"]', brandUser.password);
    await page.click('button[type="submit"]');

    // Create campaign via API for efficiency
    const campaignResponse = await page.request.post('/api/campaigns', {
      data: {
        title: 'Test Campaign for Publishing',
        description: 'Test campaign description',
        budget: 2000,
        startDate: '2024-07-01',
        endDate: '2024-07-31',
        deliverables: 'Instagram post',
        requirements: 'Active Instagram account',
        platforms: ['instagram'],
        targetAge: '18-34',
        targetGender: 'all'
      }
    });
    const campaign = await campaignResponse.json();

    // Navigate to campaign
    await page.goto(`/campaigns/${campaign.id}`);
    
    // Publish campaign
    await page.click('button:has-text("Publish Campaign")');

    // Confirm publishing
    await page.click('button:has-text("Yes, Publish")');

    // Should show success message and update status
    await expect(page.locator('.alert-success')).toContainText('Campaign published successfully');
    await expect(page.locator('.campaign-status')).toContainText('Active');
    
    // Should now show "View Applications" button
    await expect(page.locator('button:has-text("View Applications")')).toBeVisible();
  });

  test('influencer should browse and apply to campaigns', async ({ page }) => {
    // Create a published campaign first
    const campaignResponse = await page.request.post('/api/campaigns', {
      data: {
        title: 'Open Campaign for Applications',
        description: 'Test campaign for applications',
        budget: 3000,
        startDate: '2024-07-01',
        endDate: '2024-07-31',
        deliverables: 'Instagram post and story',
        requirements: 'Fashion-focused content',
        platforms: ['instagram'],
        targetAge: '18-34',
        targetGender: 'all',
        status: 'active'
      }
    });

    // Login as influencer
    await page.goto('/login');
    await page.fill('[name="email"]', influencerUser.email);
    await page.fill('[name="password"]', influencerUser.password);
    await page.click('button[type="submit"]');

    // Browse campaigns
    await page.goto('/campaigns');
    await expect(page.locator('h1')).toContainText('Available Campaigns');

    // Should see the campaign
    await expect(page.locator('.campaign-card')).toContainText('Open Campaign for Applications');
    
    // Click on campaign to view details
    await page.click('.campaign-card:has-text("Open Campaign for Applications")');
    
    // Should show campaign details
    await expect(page.locator('h1')).toContainText('Open Campaign for Applications');
    await expect(page.locator('.campaign-budget')).toContainText('$3,000');
    
    // Apply to campaign
    await page.click('button:has-text("Apply to Campaign")');
    
    // Fill application form
    await page.fill('[name="proposal"]', 'I would love to create authentic content for this campaign. My fashion-focused Instagram account has high engagement and aligns perfectly with your target audience.');
    await page.fill('[name="deliverableProposal"]', 'I will create 1 high-quality Instagram post and 2 Instagram stories showcasing your products in a natural, lifestyle setting.');
    await page.fill('[name="timeline"]', 'I can deliver content within 5 business days of product receipt.');
    
    // Upload portfolio samples
    await page.setInputFiles('[name="portfolioSamples"]', [
      {
        name: 'sample1.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('Mock image content 1')
      },
      {
        name: 'sample2.jpg', 
        mimeType: 'image/jpeg',
        buffer: Buffer.from('Mock image content 2')
      }
    ]);

    // Submit application
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('.alert-success')).toContainText('Application submitted successfully');
    
    // Should show application status
    await expect(page.locator('.application-status')).toContainText('Pending Review');
  });

  test('brand should review and accept influencer applications', async ({ page }) => {
    // Setup: Create campaign and application
    const campaignResponse = await page.request.post('/api/campaigns', {
      data: {
        title: 'Campaign for Review Process',
        description: 'Test campaign for application review',
        budget: 4000,
        startDate: '2024-07-01',
        endDate: '2024-07-31',
        deliverables: 'Instagram content',
        requirements: 'Quality content creator',
        platforms: ['instagram'],
        status: 'active'
      }
    });
    const campaign = await campaignResponse.json();

    // Create application
    await page.request.post(`/api/campaigns/${campaign.id}/applications`, {
      data: {
        proposal: 'Test application proposal',
        deliverableProposal: 'Quality content delivery',
        timeline: '5 business days'
      }
    });

    // Login as brand
    await page.goto('/login');
    await page.fill('[name="email"]', brandUser.email);
    await page.fill('[name="password"]', brandUser.password);
    await page.click('button[type="submit"]');

    // Navigate to campaign applications
    await page.goto(`/campaigns/${campaign.id}/applications`);
    await expect(page.locator('h1')).toContainText('Campaign Applications');

    // Should see application
    await expect(page.locator('.application-card')).toContainText('Test application proposal');
    
    // Review application details
    await page.click('.application-card button:has-text("Review")');
    
    // Should show application details
    await expect(page.locator('.application-proposal')).toContainText('Test application proposal');
    
    // Accept application
    await page.click('button:has-text("Accept Application")');
    
    // Confirm acceptance
    await page.fill('[name="acceptanceMessage"]', 'Great proposal! Looking forward to working with you.');
    await page.click('button:has-text("Confirm Acceptance")');
    
    // Should show success message
    await expect(page.locator('.alert-success')).toContainText('Application accepted successfully');
    
    // Should update application status
    await expect(page.locator('.application-status')).toContainText('Accepted');
  });

  test('should handle campaign payment processing with Stripe', async ({ page }) => {
    // Login as brand
    await page.goto('/login');
    await page.fill('[name="email"]', brandUser.email);
    await page.fill('[name="password"]', brandUser.password);
    await page.click('button[type="submit"]');

    // Navigate to billing/payment setup
    await page.goto('/settings/billing');
    await expect(page.locator('h1')).toContainText('Billing & Payments');

    // Add payment method
    await page.click('button:has-text("Add Payment Method")');
    
    // Fill Stripe payment form (using test card)
    await page.frameLocator('iframe[name^="__privateStripeFrame"]').first().fill('[name="cardnumber"]', '4242424242424242');
    await page.frameLocator('iframe[name^="__privateStripeFrame"]').nth(1).fill('[name="exp-date"]', '12/28');
    await page.frameLocator('iframe[name^="__privateStripeFrame"]').nth(2).fill('[name="cvc"]', '123');
    await page.fill('[name="cardholder-name"]', 'Test Cardholder');

    await page.click('button:has-text("Save Payment Method")');

    // Should show success message
    await expect(page.locator('.alert-success')).toContainText('Payment method added successfully');

    // Create a campaign requiring payment
    const campaignResponse = await page.request.post('/api/campaigns', {
      data: {
        title: 'Premium Campaign with Payment',
        description: 'Campaign requiring upfront payment',
        budget: 5000,
        startDate: '2024-07-01',
        endDate: '2024-07-31',
        deliverables: 'Premium content package',
        requiresPayment: true,
        platforms: ['instagram', 'tiktok']
      }
    });
    const campaign = await campaignResponse.json();

    // Navigate to campaign payment
    await page.goto(`/campaigns/${campaign.id}/payment`);
    
    // Should show payment details
    await expect(page.locator('.payment-amount')).toContainText('$5,000.00');
    await expect(page.locator('.payment-description')).toContainText('Campaign: Premium Campaign with Payment');
    
    // Process payment
    await page.click('button:has-text("Pay Now")');
    
    // Should show payment processing
    await expect(page.locator('.payment-processing')).toContainText('Processing payment...');
    
    // Should complete payment and show success
    await expect(page.locator('.alert-success')).toContainText('Payment processed successfully');
    await expect(page.locator('.payment-status')).toContainText('Paid');
  });

  test('should track campaign performance metrics', async ({ page }) => {
    // Create campaign with accepted applications
    const campaignResponse = await page.request.post('/api/campaigns', {
      data: {
        title: 'Performance Tracking Campaign',
        description: 'Campaign for performance testing',
        budget: 3000,
        status: 'active',
        startDate: '2024-07-01',
        endDate: '2024-07-31'
      }
    });
    const campaign = await campaignResponse.json();

    // Login as brand
    await page.goto('/login');
    await page.fill('[name="email"]', brandUser.email);
    await page.fill('[name="password"]', brandUser.password);
    await page.click('button[type="submit"]');

    // Navigate to campaign analytics
    await page.goto(`/campaigns/${campaign.id}/analytics`);
    await expect(page.locator('h1')).toContainText('Campaign Analytics');

    // Should show performance metrics
    await expect(page.locator('.metrics-grid')).toBeVisible();
    await expect(page.locator('[data-metric="reach"]')).toBeVisible();
    await expect(page.locator('[data-metric="engagement"]')).toBeVisible();
    await expect(page.locator('[data-metric="clicks"]')).toBeVisible();
    await expect(page.locator('[data-metric="conversions"]')).toBeVisible();

    // Should show charts
    await expect(page.locator('.performance-chart')).toBeVisible();
    await expect(page.locator('.engagement-chart')).toBeVisible();

    // Should allow exporting data
    await expect(page.locator('button:has-text("Export Data")')).toBeVisible();
    
    // Click export
    await page.click('button:has-text("Export Data")');
    
    // Should trigger download (in real test, would verify file download)
    await expect(page.locator('.alert-success')).toContainText('Analytics data exported successfully');
  });

  test('should handle campaign completion and payments to influencers', async ({ page }) => {
    // Setup completed campaign with delivered content
    const campaignResponse = await page.request.post('/api/campaigns', {
      data: {
        title: 'Completed Campaign for Payout',
        description: 'Campaign ready for completion',
        budget: 2000,
        status: 'completed',
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      }
    });
    const campaign = await campaignResponse.json();

    // Login as brand
    await page.goto('/login');
    await page.fill('[name="email"]', brandUser.email);
    await page.fill('[name="password"]', brandUser.password);
    await page.click('button[type="submit"]');

    // Navigate to campaign completion
    await page.goto(`/campaigns/${campaign.id}/complete`);
    await expect(page.locator('h1')).toContainText('Complete Campaign');

    // Review delivered content
    await expect(page.locator('.delivered-content')).toBeVisible();
    await expect(page.locator('.content-approval')).toBeVisible();

    // Approve all content
    await page.check('[name="approve-all"]');
    
    // Add completion notes
    await page.fill('[name="completionNotes"]', 'Excellent work! All deliverables exceeded expectations.');
    
    // Process influencer payments
    await page.click('button:has-text("Process Payments")');
    
    // Confirm payment processing
    await page.click('button:has-text("Confirm Payments")');
    
    // Should show success message
    await expect(page.locator('.alert-success')).toContainText('Campaign completed and payments processed');
    
    // Should update campaign status
    await expect(page.locator('.campaign-status')).toContainText('Completed');
    await expect(page.locator('.payment-status')).toContainText('Paid Out');
  });
});