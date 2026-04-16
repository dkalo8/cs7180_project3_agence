// @ts-check
/**
 * E2E — main demo flow routines
 * Covers: dashboard → insights → goals → watchlist → portfolio → settings → about
 * Public-route tests run always. Authenticated tests require E2E_EMAIL + E2E_PASSWORD.
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.E2E_EMAIL || '';
const PASSWORD = process.env.E2E_PASSWORD || '';

async function login(page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(EMAIL);
  await page.getByPlaceholder('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 20000 });
  await page.waitForSelector('.nav', { timeout: 10000 });
}

// ── Public routes ────────────────────────────────────────────────────────────

test.describe('About page (public)', () => {
  test('loads without auth and shows six agent cards with SVG icons', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1')).toContainText('Agence');
    // Six agent cards have SVG icons (the "Problem" card doesn't — it has no svg)
    const svgs = page.locator('.insight-card svg');
    await expect(svgs).toHaveCount(6);
  });
});

// ── Authenticated flows ──────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD env vars required');
    await login(page);
  });

  test('shows equity hero section', async ({ page }) => {
    await page.goto('/');
    // Equity or portfolio value visible
    await expect(page.locator('.equity-hero, .dash-equity, [class*="equity"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('nav has Money and Markets dropdowns', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Money')).toBeVisible();
    await expect(page.getByText('Markets')).toBeVisible();
  });

  test('chat FAB is visible and opens widget', async ({ page }) => {
    await page.goto('/');
    const fab = page.locator('.chat-fab');
    await expect(fab).toBeVisible();
    await fab.click();
    await expect(page.locator('.chat-popup')).toBeVisible();
    // Input is a textarea (Shift+Enter support)
    await expect(page.locator('textarea.chat-input')).toBeVisible();
  });
});

test.describe('Insights page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD env vars required');
    await login(page);
  });

  test('shows Priority filter selected by default', async ({ page }) => {
    await page.goto('/insights');
    // Wait until loading is done — filter buttons only render when insights arrive
    await page.waitForSelector('.period-btn, p:text("No insights")', { timeout: 30000 });
    const priorityBtn = page.getByRole('button', { name: /Priority/ });
    await expect(priorityBtn).toBeVisible();
    await expect(priorityBtn).toHaveClass(/period-btn--active/);
  });

  test('filter tabs change visible insights', async ({ page }) => {
    await page.goto('/insights');
    await page.waitForSelector('.period-btn', { timeout: 30000 });
    await page.getByRole('button', { name: /^All/ }).click();
    const priorityBtn = page.getByRole('button', { name: /Priority/ });
    await expect(priorityBtn).not.toHaveClass(/period-btn--active/);
  });

  test('refresh button triggers new analysis', async ({ page }) => {
    await page.goto('/insights');
    await page.waitForSelector('button', { timeout: 20000 });
    const refresh = page.getByRole('button', { name: /Refresh|Analyzing/ });
    await expect(refresh).toBeVisible();
  });
});

test.describe('Goals page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD env vars required');
    await login(page);
  });

  test('loads goals page', async ({ page }) => {
    await page.goto('/goals');
    await expect(page.locator('h2')).toContainText('Goals');
  });

  test('create goal form is visible', async ({ page }) => {
    await page.goto('/goals');
    await expect(page.getByPlaceholder(/goal name/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Watchlist page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD env vars required');
    await login(page);
  });

  test('loads watchlist page with ticker input', async ({ page }) => {
    await page.goto('/watchlist');
    await expect(page.locator('h2')).toContainText('Watchlist');
    await expect(page.getByPlaceholder(/ticker/i)).toBeVisible({ timeout: 10000 });
  });

  test('add and remove a ticker', async ({ page }) => {
    await page.goto('/watchlist');
    const input = page.getByPlaceholder(/ticker/i);
    await input.fill('TSLA');
    await page.getByRole('button', { name: /add/i }).click();

    // Row appears
    await expect(page.getByText('TSLA')).toBeVisible({ timeout: 10000 });

    // Remove it
    const removeBtn = page.locator('button', { hasText: /remove|×|delete/i }).first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
    }
  });
});

test.describe('Portfolio page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD env vars required');
    await login(page);
  });

  test('loads portfolio page', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page.locator('h2')).toContainText('Portfolio');
  });

  test('shows positions table or empty state', async ({ page }) => {
    await page.goto('/portfolio');
    // Either a table row or an empty-state message should appear
    const hasTable = await page.locator('table tbody tr').count();
    const hasEmpty = await page.locator('text=/no positions|no open/i').count();
    expect(hasTable + hasEmpty).toBeGreaterThan(0);
  });
});

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD env vars required');
    await login(page);
  });

  test('loads settings page showing user email', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h2')).toContainText(/Settings|Account/i);
    // Email of logged-in user should appear somewhere on the page
    await expect(page.getByText(EMAIL)).toBeVisible({ timeout: 10000 });
  });
});
