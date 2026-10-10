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
      standings: { '英超': { season: '2026 / 27', groups: [{ name: '', rows: [{ pos: 1, team: '阿森纳', color: '#e34448', pts: 20, p: 8, w: 6, d: 2, l: 0, gd: '+9' }] }] } },
    }),
  }));
  await page.goto('/matches');
  await expect(page.locator('.match-tile')).toHaveCount(1);
  await expect(page.locator('.match-tile')).toContainText('4:2');
  await expect(page.locator('.recap-card')).toContainText('真实赛果');
  await expect(page.locator('.event-timeline')).toHaveCount(0);
  await page.goto('/standings');
  await expect(page.locator('.standings-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.standings-table tbody tr')).toContainText('20');
  await expect(page.getByText('Football data provided by the Football-Data.org API')).toBeVisible();
});
