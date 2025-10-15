import { test, expect } from '@playwright/test';

test('agent flow smoke: app renders and palette visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('FlowOne Voice')).toBeVisible();
  await expect(page.getByText('Agent Palette')).toBeVisible();
});


