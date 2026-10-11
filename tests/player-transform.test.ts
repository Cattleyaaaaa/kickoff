import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTopScorers } from '../scripts/player-transform.ts';

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
