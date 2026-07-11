import { test, expect } from '@playwright/test';

test.describe('SUSI Basic Page Loading E2E Tests', () => {
  test('unauthenticated visitors can access the public vacancies page', async ({ page }) => {
    // Navigate to public rooms portal
    await page.goto('http://localhost:3000/rooms');
    await expect(page.locator('header')).toContainText('SUSI Public Portal');
    await expect(page.locator('h1')).toContainText('Available Rooms & Spaces');
  });

  test('admin interface components render on home page', async ({ page }) => {
    // Navigate to admin home (which redirects/asks login or runs on credentials)
    await page.goto('http://localhost:3000/');
    // Verify dashboard title structure
    await expect(page.locator('h1')).toContainText('Dashboard Overview');
  });
});
