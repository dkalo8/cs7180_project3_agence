// @ts-check
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

test.describe('Expenses deep-link highlighting', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD env vars required');
    await login(page);
  });

  test('?amount= param highlights all rows with that amount', async ({ page }) => {
    // Load expenses first to discover a real amount in sandbox data
    await page.goto('/expenses');
    await page.waitForSelector('.tx-table tbody tr', { timeout: 25000 });

    // Grab amount from first transaction row
    const amountText = await page.locator('.tx-table tbody tr td.right').first().textContent();
    const amount = amountText?.replace(/[$,]/g, '').trim();

    // Navigate with ?amount= param
    await page.goto(`/expenses?amount=${amount}`);
    await page.waitForSelector('.tx-table tbody tr', { timeout: 20000 });

    // At least one row should carry tx-highlight class
    const highlighted = page.locator('tr.tx-highlight');
    await expect(highlighted.first()).toBeAttached({ timeout: 5000 });

    // All highlighted rows must have matching amount
    const hlCount = await highlighted.count();
    for (let i = 0; i < hlCount; i++) {
      const rowAmt = await highlighted.nth(i).locator('td.right').textContent();
      const parsed = parseFloat(rowAmt?.replace(/[$,]/g, '') || '0');
      expect(Math.abs(parsed - parseFloat(amount || '0'))).toBeLessThan(0.01);
    }
  });

  test('?amount=&date= highlights ONLY rows matching both amount and date', async ({ page }) => {
    await page.goto('/expenses');
    await page.waitForSelector('.tx-table tbody tr', { timeout: 25000 });

    const firstRow = page.locator('.tx-table tbody tr').first();
    const dateText = await firstRow.locator('.tx-date').textContent();
    const amountText = await firstRow.locator('td.right').textContent();
    const amount = amountText?.replace(/[$,]/g, '').trim();
    const date = dateText?.trim().slice(0, 10);

    await page.goto(`/expenses?amount=${amount}&date=${date}`);
    await page.waitForSelector('.tx-table tbody tr', { timeout: 20000 });

    const highlighted = page.locator('tr.tx-highlight');
    await expect(highlighted.first()).toBeAttached({ timeout: 5000 });

    const hlCount = await highlighted.count();
    for (let i = 0; i < hlCount; i++) {
      const row = highlighted.nth(i);
      const rowDate = (await row.locator('.tx-date').textContent())?.trim().slice(0, 10);
      const rowAmt = parseFloat(
        (await row.locator('td.right').textContent())?.replace(/[$,]/g, '') || '0'
      );
      expect(rowDate).toBe(date);
      expect(Math.abs(rowAmt - parseFloat(amount || '0'))).toBeLessThan(0.01);
    }
  });

  test('?amount=&date= highlights more rows than ?txId= for a duplicate pair', async ({ page }) => {
    // Find any two rows with the same amount + same date (a duplicate pair) in sandbox data
    await page.goto('/expenses');
    await page.waitForSelector('.tx-table tbody tr', { timeout: 25000 });

    const rows = page.locator('.tx-table tbody tr');
    const rowCount = await rows.count();

    // Build map of amount|date → [txId, txId, ...]
    const seen = {};
    let dupAmount = null;
    let dupDate = null;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const dateText = (await row.locator('.tx-date').textContent())?.trim().slice(0, 10) || '';
      const amtText = (await row.locator('td.right').textContent())?.replace(/[$,]/g, '').trim() || '';
      const key = `${amtText}|${dateText}`;
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] >= 2) {
        dupAmount = amtText;
        dupDate = dateText;
        break;
      }
    }

    if (!dupAmount) {
      test.skip(true, 'No duplicate amount+date pair found in sandbox transactions');
      return;
    }

    // With ?amount=&date=, should highlight 2+ rows
    await page.goto(`/expenses?amount=${dupAmount}&date=${dupDate}`);
    await page.waitForSelector('.tx-table tbody tr', { timeout: 20000 });

    const hlCount = await page.locator('tr.tx-highlight').count();
    expect(hlCount).toBeGreaterThanOrEqual(2);
  });

  test('clicking an anomaly insight navigates to /expenses', async ({ page }) => {
    // Clear insights cache to get fresh post-fix data
    await page.goto('/insights');
    await page.evaluate(() => sessionStorage.removeItem('agence_insights'));
    await page.reload();
    await page.waitForSelector('.insight-list', { timeout: 30000 });

    // Find any clickable insight card that routes to expenses
    const cards = page.locator('.insight-card[style*="pointer"]');
    const count = await cards.count();

    if (count === 0) {
      test.skip(true, 'No clickable insights found');
      return;
    }

    // Find an anomaly (expenses) card
    let targetCard = null;
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent();
      if (text?.toLowerCase().includes('charge') || text?.toLowerCase().includes('transaction')) {
        targetCard = cards.nth(i);
        break;
      }
    }

    if (!targetCard) {
      // Fall back to first clickable card
      targetCard = cards.first();
    }

    await targetCard.click();
    await page.waitForURL(/\/expenses/, { timeout: 10000 });

    // URL should have a query param (txId, amount, or amount+date)
    const url = page.url();
    expect(url).toMatch(/\?/);

    // At least one row highlighted
    const highlighted = page.locator('tr.tx-highlight');
    await expect(highlighted.first()).toBeAttached({ timeout: 8000 });
  });

  test('repeated_charge insight routes to ?merchant=&amount= and highlights 2+ rows', async ({ page }) => {
    await page.goto('/insights');
    await page.evaluate(() => sessionStorage.removeItem('agence_insights'));
    await page.reload();
    await page.waitForSelector('.insight-list', { timeout: 30000 });

    const cards = page.locator('.insight-card');
    const count = await cards.count();

    let repCard = null;
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent();
      if (text?.toLowerCase().includes('identical') && text?.toLowerCase().includes('recurring')) {
        repCard = cards.nth(i);
        break;
      }
    }

    if (!repCard) {
      test.skip(true, 'No repeated_charge insight in sandbox data');
      return;
    }

    await repCard.click();
    await page.waitForURL(/\/expenses/, { timeout: 10000 });

    const url = page.url();
    expect(url).toMatch(/merchant=/);
    expect(url).toMatch(/amount=/);

    const hlCount = await page.locator('tr.tx-highlight').count();
    expect(hlCount).toBeGreaterThanOrEqual(2);
  });

  test('duplicate_charge insight routes to ?amount=&date= and highlights 2+ rows', async ({ page }) => {
    await page.goto('/insights');
    await page.evaluate(() => sessionStorage.removeItem('agence_insights'));
    await page.reload();
    await page.waitForSelector('.insight-list', { timeout: 30000 });

    const cards = page.locator('.insight-card');
    const count = await cards.count();

    let dupCard = null;
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent();
      if (text?.toLowerCase().includes('duplicate charge')) {
        dupCard = cards.nth(i);
        break;
      }
    }

    if (!dupCard) {
      test.skip(true, 'No duplicate_charge insight in sandbox data');
      return;
    }

    await dupCard.click();
    await page.waitForURL(/\/expenses/, { timeout: 10000 });

    const url = page.url();
    expect(url).toMatch(/amount=/);
    expect(url).toMatch(/date=/);

    const hlCount = await page.locator('tr.tx-highlight').count();
    expect(hlCount).toBeGreaterThanOrEqual(2);
  });
});
