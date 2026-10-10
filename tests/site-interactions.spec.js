import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kickoff-onboarded', '1'));
});

test('home page contains news while other content stays on its own page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Find your people|为每份热爱/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Latest stories|最新新闻/ })).toBeVisible();
  await expect(page.locator('.results-panel')).toBeHidden();
  await expect(page.locator('#discussions')).toBeVisible();
  await expect(page.locator('#dynamics')).toBeHidden();
  await expect(page.locator('#standings')).toBeHidden();
  await expect(page.locator('#clubs')).toBeHidden();
  await expect(page.locator('#players')).toBeHidden();
  await expect(page.locator('#match-center')).toBeHidden();
});

test('theme and language controls work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Change theme|切换主题/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('combobox', { name: /Language|语言/ }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Latest stories' })).toBeVisible();
});

test('team selection is optional and persisted locally', async ({ page }) => {
  await page.goto('/');
  await page.locator('#home').getByRole('button', { name: /Choose teams|选择球队/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Arsenal|阿森纳/ }).click();
  await dialog.getByRole('button', { name: /Save teams|保存关注/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('body')).toContainText(/Arsenal|阿森纳/);
});

test('search filters matches by result type', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('textbox').fill('Arsenal');
  const searchDialog = page.getByRole('dialog');
  await searchDialog.getByRole('button', { name: 'Teams', exact: true }).click();
  await expect(searchDialog.locator('.search-result').filter({ hasText: 'Arsenal' }).first()).toBeVisible();
});

test('results can be filtered to a single date', async ({ page }) => {
  await page.goto('/matches');
  await page.getByRole('combobox', { name: /Filter results by date|按日期筛选赛果/ }).selectOption('10月08日');
  await expect(page.locator('.result-row')).toHaveCount(1);
});

test('top navigation opens independent page routes', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: '主导航' });

  await nav.getByRole('button', { name: /News|新闻/ }).click();
  await expect(page).toHaveURL(/\/news$/);
  await expect(page.getByRole('heading', { name: /Latest stories|最新新闻/ })).toBeVisible();
  await expect(page.locator('.results-panel')).toBeHidden();

  await nav.getByRole('button', { name: /Matches|比赛/ }).click();
  await expect(page).toHaveURL(/\/matches$/);
  await expect(page.getByRole('heading', { name: /Recent results|近期赛果/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Match center|比赛中心/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Latest stories|最新新闻/ })).toBeHidden();

  await nav.getByRole('button', { name: /Standings|积分榜/ }).click();
  await expect(page).toHaveURL(/\/standings$/);
  await expect(page.getByRole('heading', { name: /Standings|积分榜/ })).toBeVisible();

  await nav.getByRole('button', { name: /Teams|球队/ }).click();
  await expect(page).toHaveURL(/\/teams$/);
  await expect(page.locator('#clubs')).toBeVisible();
  await expect(page.locator('#players')).toBeHidden();

  await nav.getByRole('button', { name: /Players|球员/ }).click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(page.locator('#players')).toBeVisible();
  await expect(page.locator('#clubs')).toBeHidden();

  await page.reload();
  await expect(page).toHaveURL(/\/players$/);
  await expect(page.locator('#players')).toBeVisible();
});
