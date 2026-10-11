import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kickoff-onboarded', '1');
    localStorage.setItem('kickoff-locale', 'zh-CN');
  });
});

test('news filters narrow the feed and a headline opens its summary', async ({ page }) => {
  await page.goto('/news');
  await page.locator('.league-ribbon').getByRole('button', { name: '德甲' }).click();
  await expect(page.locator('.lead-story h3')).toContainText('回归训练');
  await expect(page.locator('.feed-story')).toHaveCount(0);
  await page.locator('.lead-story h3 button').click();
  await expect(page.getByRole('dialog')).toContainText('个人训练');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: '最新发布', exact: true }).click();
  await expect(page.locator('.feed-story')).toHaveCount(5);
});

test('search result opens its destination and browser back restores the page', async ({ page }) => {
  await page.goto('/news');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await page.getByRole('textbox').fill('阿森纳');
  await page.getByRole('dialog').getByRole('button', { name: '球队', exact: true }).click();
  await page.locator('.search-result').first().click();
  await expect(page).toHaveURL(/\/teams$/);
  await expect(page.locator('#clubs')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/news$/);
  await expect(page.locator('.news-section')).toBeVisible();
});

test('player metric sorts the displayed leaderboard', async ({ page }) => {
  await page.route('**/data/players.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      source: 'goal-api.com', updatedAt: '2026-10-10T00:00:00Z',
      leagues: { 英超: { season: '2026/27', players: [
        { id: 'a', name: 'Player A', team: 'Arsenal', goals: 5, assists: 1, appearances: null, position: null, nationality: null },
        { id: 'b', name: 'Player B', team: 'Chelsea', goals: 3, assists: 4, appearances: null, position: null, nationality: null },
      ] } },
    }),
  }));
  await page.goto('/players');
  await expect(page.locator('.player-highlight').first()).toContainText('Player A');
  await page.locator('.player-metric-tabs').getByRole('button', { name: '助攻', exact: true }).click();
  await expect(page.locator('.player-highlight').first()).toContainText('Player B');
  await expect(page.locator('.players-table tbody tr').first()).toContainText('Player B');
  await expect(page.locator('.players-table tbody tr').first().locator('td').nth(1)).toHaveText('—');
});

test('player page does not show sample numbers without a verified snapshot', async ({ page }) => {
  await page.route('**/data/players.json', route => route.fulfill({ status: 404 }));
  await page.goto('/players');
  await expect(page.getByText('暂无可验证的球员数据')).toBeVisible();
  await expect(page.locator('.player-highlight')).toHaveCount(0);
});
