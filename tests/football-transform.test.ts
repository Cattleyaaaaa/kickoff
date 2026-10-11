import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFixtures, normalizeMatches, normalizeStandings } from '../scripts/football-transform.ts';

test('only finished matches with complete full-time scores are published', () => {
  const matches = normalizeMatches({ matches: [
    { id: 1, status: 'FINISHED', utcDate: '2026-10-09T19:00:00Z', homeTeam: { name: 'Arsenal FC', tla: 'ARS' }, awayTeam: { name: 'Manchester City FC', tla: 'MCI' }, score: { fullTime: { home: 2, away: 1 } } },
    { id: 2, status: 'IN_PLAY', utcDate: '2026-10-10T19:00:00Z', homeTeam: { name: 'Arsenal FC' }, awayTeam: { name: 'Manchester City FC' }, score: { fullTime: { home: 1, away: 0 } } },
    { id: 3, status: 'FINISHED', utcDate: '2026-10-08T19:00:00Z', homeTeam: { name: 'Arsenal FC' }, awayTeam: { name: 'Manchester City FC' }, score: { fullTime: { home: null, away: null } } },
  ] }, '英超');
  assert.equal(matches.length, 1);
  assert.deepEqual([matches[0].home, matches[0].away, matches[0].hs, matches[0].as], ['阿森纳', '曼城', 2, 1]);
});

test('penalty shootout is separate from the match score', () => {
  const [match] = normalizeMatches({ matches: [{
    id: 4, status: 'FINISHED', utcDate: '2026-10-10T19:00:00Z',
    homeTeam: { name: 'Arsenal FC' }, awayTeam: { name: 'Manchester City FC' },
    score: { duration: 'PENALTY_SHOOTOUT', fullTime: { home: 6, away: 5 }, penalties: { home: 5, away: 4 } },
  }] }, '欧冠');
  assert.deepEqual([match.hs, match.as, match.penalties], [1, 1, { home: 5, away: 4 }]);
});

test('season fixture list preserves finished and scheduled matches with available scores', () => {
  const fixtures = normalizeFixtures({ matches: [
    { id: 1, status: 'TIMED', utcDate: '2026-10-15T19:00:00Z', homeTeam: { name: 'Arsenal FC' }, awayTeam: { name: 'Manchester City FC' } },
    { id: 2, status: 'FINISHED', utcDate: '2026-10-10T19:00:00Z', homeTeam: { name: 'Arsenal FC' }, awayTeam: { name: 'Manchester City FC' }, score: { fullTime: { home: 2, away: 1 } } },
  ] }, '英超');
  assert.deepEqual(fixtures.map(fixture => [fixture.id, fixture.home, fixture.away, fixture.status, fixture.hs, fixture.as]), [
    ['1', '阿森纳', '曼城', 'TIMED', null, null], ['2', '阿森纳', '曼城', 'FINISHED', 2, 1],
  ]);
});

test('standings use the overall table and preserve competition groups', () => {
  const standing = normalizeStandings({
    season: { startDate: '2026-08-01', endDate: '2027-05-31' },
    standings: [
      { type: 'HOME', table: [] },
      { type: 'TOTAL', group: 'GROUP_A', table: [{ position: 1, team: { name: 'Arsenal FC' }, playedGames: 8, won: 6, draw: 1, lost: 1, goalsFor: 16, goalsAgainst: 8, goalDifference: 8, points: 19 }] },
    ],
  }, '欧冠');
  assert.equal(standing.season, '2026 / 27');
  assert.equal(standing.groups.length, 1);
  assert.equal(standing.groups[0].name, 'GROUP_A');
  assert.deepEqual([standing.groups[0].rows[0].team, standing.groups[0].rows[0].gd, standing.groups[0].rows[0].pts], ['阿森纳', '+8', 19]);
  assert.deepEqual([standing.groups[0].rows[0].gf, standing.groups[0].rows[0].ga], [16, 8]);
});
