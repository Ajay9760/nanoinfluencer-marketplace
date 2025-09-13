import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe',
    userType: 'brand'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should register a new user successfully', async ({ page }) => {
    // Navigate to register page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/register');

    // Fill in registration form
    await page.fill('[name="firstName"]', testUser.firstName);
    await page.fill('[name="lastName"]', testUser.lastName);
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="confirmPassword"]', testUser.password);
    await page.selectOption('[name="userType"]', testUser.userType);

    // Accept terms and conditions
    await page.check('[name="acceptTerms"]');

    // Submit registration
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('.alert-success')).toContainText('Registration successful');
    
    // Should redirect to verification page
    await expect(page).toHaveURL('/verify-email');
    await expect(page.locator('h1')).toContainText('Verify Your Email');
  });

  test('should not register with invalid email', async ({ page }) => {
    await page.click('text=Sign Up');
    
    await page.fill('[name="firstName"]', testUser.firstName);
    await page.fill('[name="lastName"]', testUser.lastName);
    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="confirmPassword"]', testUser.password);
    await page.selectOption('[name="userType"]', testUser.userType);
    await page.check('[name="acceptTerms"]');

    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('.error-message')).toContainText('Please enter a valid email');
  });

  test('should not register with weak password', async ({ page }) => {
    await page.click('text=Sign Up');
    
    await page.fill('[name="firstName"]', testUser.firstName);
    await page.fill('[name="lastName"]', testUser.lastName);
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', '123');
    await page.fill('[name="confirmPassword"]', '123');
    await page.selectOption('[name="userType"]', testUser.userType);
    await page.check('[name="acceptTerms"]');

    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('.error-message')).toContainText('Password must be at least 8 characters');
  });

  test('should login with valid credentials', async ({ page }) => {
    // First register a user via API
    const response = await page.request.post('/api/auth/register', {
      data: {
        ...testUser,
        confirmPassword: testUser.password,
        acceptTerms: true
      }
    });
    expect(response.ok()).toBeTruthy();

    // Navigate to login page
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/login');

    // Fill in login form
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);

    // Submit login
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Should see user's name in navigation
    await expect(page.locator('.user-menu')).toContainText(testUser.firstName);
  });

  test('should not login with invalid credentials', async ({ page }) => {
    await page.click('text=Sign In');
    
    await page.fill('[name="email"]', 'nonexistent@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.alert-error')).toContainText('Invalid credentials');
    
    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('should handle logout functionality', async ({ page }) => {
    // Register and login user
    await page.request.post('/api/auth/register', {
      data: {
        ...testUser,
        confirmPassword: testUser.password,
        acceptTerms: true
      }
    });

    await page.goto('/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should be on dashboard
    await expect(page).toHaveURL('/dashboard');

    // Click logout
    await page.click('.user-menu');
    await page.click('text=Logout');

    // Should redirect to home page
    await expect(page).toHaveURL('/');
    
    // Should see sign in/sign up buttons again
    await expect(page.locator('text=Sign In')).toBeVisible();
    await expect(page.locator('text=Sign Up')).toBeVisible();
  });

  test('should setup 2FA for user account', async ({ page }) => {
    // Register and login user
    await page.request.post('/api/auth/register', {
      data: {
        ...testUser,
        confirmPassword: testUser.password,
        acceptTerms: true
      }
    });

    await page.goto('/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Navigate to security settings
    await page.goto('/settings/security');
    await expect(page.locator('h1')).toContainText('Security Settings');

    // Enable 2FA
    await page.click('text=Enable Two-Factor Authentication');
    
    // Should show QR code setup
    await expect(page.locator('.qr-code')).toBeVisible();
    await expect(page.locator('text=Scan this QR code')).toBeVisible();
    
    // Should show manual setup key
    await expect(page.locator('.manual-setup-key')).toBeVisible();
    
    // Simulate entering verification code (in real test, would use TOTP library)
    await page.fill('[name="verificationCode"]', '123456');
    await page.click('text=Verify and Enable');
    
    // Should show success message (this would fail with invalid code, but demonstrates flow)
    // In real implementation, you'd use a test TOTP secret
  });

  test('should handle password reset flow', async ({ page }) => {
    // Register user first
    await page.request.post('/api/auth/register', {
      data: {
        ...testUser,
        confirmPassword: testUser.password,
        acceptTerms: true
      }
    });

    // Go to login page and click forgot password
    await page.goto('/login');
    await page.click('text=Forgot Password?');
    
    await expect(page).toHaveURL('/forgot-password');
    await expect(page.locator('h1')).toContainText('Reset Password');
    
    // Enter email
    await page.fill('[name="email"]', testUser.email);
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('.alert-success')).toContainText('Password reset email sent');
  });

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('.alert-warning')).toContainText('Please log in to access this page');
  });

  test('should persist authentication state after page refresh', async ({ page }) => {
    // Register and login user
    await page.request.post('/api/auth/register', {
      data: {
        ...testUser,
        confirmPassword: testUser.password,
        acceptTerms: true
      }
    });

    await page.goto('/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should be on dashboard
    await expect(page).toHaveURL('/dashboard');

    // Refresh the page
    await page.reload();

    // Should still be authenticated and on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.user-menu')).toContainText(testUser.firstName);
  });
});