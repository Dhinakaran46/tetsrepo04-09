import { test, expect } from '@playwright/test';

test('TC01 - Verify user can login with valid credentials', async ({ page }) => {
  // Open login page
  await page.goto('https://opensource.techcedence.net/lcp/#/login');

  // Enter username
  await page.getByLabel('Email').fill('process.env.TEST_EMAIL!');

  // Enter password
  await page.getByLabel('Password').fill('process.env.TEST_PASSWORD!');

  // Click Login
  await page.getByRole('button', { name: 'Submit' }).click();

  // Verify successful login T
  await expect(page).toHaveURL(/lcp/);
});
