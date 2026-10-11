import { test, expect } from '@playwright/test';

test('verified snapshot replaces demo results and standings without inventing match events', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kickoff-onboarded', '1');
    localStorage.setItem('kickoff-locale', 'zh-CN');
  });
  await page.route('**/data/football.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      source: 'football-data.org', updatedAt: new Date().toISOString(),
      range: { from: '2026-10-01', to: '2026-10-10' },
      matches: [{ id: '987', league: '英超', utcDate: new Date().toISOString(), home: '阿森纳', away: '曼城', hs: 4, as: 2, teamHome: 'ARS', teamAway: 'MCI', colors: ['#e34448', '#54a8dc'] }],
      fixtures: [{ id: '988', league: '英超', utcDate: '2026-10-18T19:00:00Z', home: '阿森纳', away: '曼城', teamHome: 'ARS', teamAway: 'MCI', colors: ['#e34448', '#54a8dc'] }],
      standings: { '英超': { season: '2026 / 27', groups: [{ name: '', rows: [{ pos: 1, team: '阿森纳', color: '#e34448', pts: 20, p: 8, w: 6, d: 2, l: 0, gd: '+9', gf: 16, ga: 7 }] }] } },
    }),
  }));
  await page.goto('/matches');
  await expect(page.locator('.match-tile')).toHaveCount(1);
  await expect(page.locator('.match-tile')).toContainText('4:2');
  await expect(page.locator('.recap-card')).toContainText('真实赛果');
  await expect(page.locator('.event-timeline')).toHaveCount(0);
  await page.goto('/teams');
  await expect(page.locator('.team-fixture')).toHaveCount(1);
  await expect(page.locator('.team-board-table tbody tr')).toContainText('20');
  await expect(page.locator('.team-board-table tbody tr')).toContainText('16');
  await expect(page.getByText('Football data provided by the Football-Data.org API')).toBeVisible();
});

test('missing snapshot never shows invented match scores', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kickoff-onboarded', '1'));
  await page.route('**/data/football.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/matches');
  await expect(page.locator('.match-tile')).toHaveCount(0);
  await expect(page.getByText(/赛果暂不可用|Results unavailable/)).toBeVisible();
});

test('team table combines standings and league-specific zone markers', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('kickoff-onboarded', '1'); localStorage.setItem('kickoff-locale', 'zh-CN'); });
  await page.goto('/teams');
  await expect(page.locator('.team-board-table')).toHaveCount(1);
  await expect(page.locator('.team-standings-board')).toContainText(/积分榜|積分榜|League table/);
  await page.getByRole('button', { name: '德甲', exact: true }).first().click();
  await expect(page.locator('.team-board-table tbody tr').nth(15).locator('.zone-start-label')).toContainText('升降级附加赛区');
  await expect(page.locator('.team-board-table tbody tr').nth(16).locator('.zone-start-label')).toContainText('降级区');
  await page.getByRole('button', { name: '欧冠', exact: true }).first().click();
  await expect(page.locator('.team-board-table tbody tr').first().locator('.zone-start-label')).toContainText('直通十六强');
});
