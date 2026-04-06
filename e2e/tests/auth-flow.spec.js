// @ts-check
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.E2E_EMAIL || '';
const PASSWORD = process.env.E2E_PASSWORD || '';

test.describe('Agence — main user flow', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    // Navigate directly to protected route — should redirect to /login
    await page.goto('/');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Agence');
    await expect(page.locator('h2')).toContainText('Sign in');
  });

  test('login page shows sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Sign in');
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('register page shows create-account form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h2')).toContainText('Create account');
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('user can register and land on dashboard', async ({ page }) => {
    const uniqueEmail = `e2e+${Date.now()}@test.com`;

    await page.goto('/register');
    await page.getByPlaceholder('Email').fill(uniqueEmail);
    await page.getByPlaceholder(/password/i).fill('TestPass123!');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Wait for navigation away from /register — API call + redirect
    await page.waitForURL(/^(?!.*\/register).*$/, { timeout: 20000 });
    await expect(page.locator('h2')).toContainText('Welcome back');
  });

  test('user can log in with valid credentials', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD env vars required');

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(EMAIL);
    await page.getByPlaceholder('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 20000 });
    await expect(page.locator('h2')).toContainText('Welcome back');
  });

  test('user can navigate to insights page after login', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD env vars required');

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(EMAIL);
    await page.getByPlaceholder('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 20000 });
    await page.getByRole('link', { name: /insights/i }).first().click();
    await page.waitForURL(/\/insights/, { timeout: 10000 });
  });
});
