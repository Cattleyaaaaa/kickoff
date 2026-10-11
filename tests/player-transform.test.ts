import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublishablePlayerStatsSnapshot, normalizeTopScorers } from '../scripts/player-transform.ts';

test('normalizes API scoring rows without inventing unavailable fields', () => {
  const players = normalizeTopScorers([
    { id: 'one', playerName: 'Player One', teamName: 'Club A', goals: '7', assists: null },
    { id: 'duplicate', playerName: 'Player One', teamName: 'Club A', goals: '7', assists: '3' },
    { id: 'invalid', playerName: 'Player Two', teamName: 'Club B', goals: null, assists: '2' },
  ]);

  assert.deepEqual(players, [{
    id: 'one', name: 'Player One', team: 'Club A', goals: 7, assists: null,
    appearances: null, position: null, nationality: null,
  }]);
});

test('keeps provider-supplied season scorer metrics and leaves missing detail absent', () => {
  const [player] = normalizeTopScorers([{
    id: 'two', playerId: 'player-two', playerName: 'Player Two', teamName: 'Club B',
    goals: 8, assists: 4, penaltyGoals: 2, appearances: 11, shots: 23, shotsOnTarget: 12,
  }]);
  assert.equal(player.id, 'player-two');
  assert.equal(player.penaltyGoals, 2);
  assert.equal(player.appearances, 11);
  assert.equal(player.shots, 23);
  assert.equal(player.shotsOnTarget, 12);
  assert.equal(player.passes, undefined);
});

test('does not publish an unverified provider leaderboard as player statistics', () => {
  const snapshot = { schemaVersion: 2, source: 'goal-api.com', updatedAt: '2026-10-11T00:00:00Z', leagues: {} };
  assert.equal(isPublishablePlayerStatsSnapshot(snapshot), false);
  assert.equal(isPublishablePlayerStatsSnapshot({ ...snapshot, verification: 'provider-only' }), false);
  assert.equal(isPublishablePlayerStatsSnapshot({ ...snapshot, verification: 'independently-verified' }), true);
});
