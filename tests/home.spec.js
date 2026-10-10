import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kickoff-onboarded', '1'));
});

test('home page shows news and keeps other page content separate', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /为每份热爱|Find your people/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /最新新闻|Latest stories/i })).toBeVisible();
  await expect(page.locator('.results-panel')).toBeHidden();
  await expect(page.locator('#discussions')).toBeVisible();
  await expect(page.locator('#dynamics')).toBeHidden();
  await expect(page.locator('#standings')).toBeHidden();
  await expect(page.locator('#clubs')).toBeHidden();
  await expect(page.locator('#players')).toBeHidden();
  await expect(page.locator('#match-center')).toBeHidden();
});

test('theme and language controls update the page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /切换主题|Change theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('combobox', { name: /语言|Language/i }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Latest stories' })).toBeVisible();
});

test('team picker can be opened and skipped', async ({ page }) => {
  await page.goto('/');
  await page.locator('#home').getByRole('button', { name: /选择球队|Choose teams/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /暂时跳过|Skip for now/i }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('search can filter results by type', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('textbox').fill('Arsenal');
  const searchDialog = page.getByRole('dialog');
  await expect(searchDialog.locator('.search-result').filter({ hasText: 'Arsenal' }).first()).toBeVisible();
  await searchDialog.getByRole('button', { name: 'Teams', exact: true }).click();
  await expect(searchDialog.locator('.search-result').filter({ hasText: 'Arsenal' }).first()).toBeVisible();
});
