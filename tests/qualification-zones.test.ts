import test from 'node:test';
import assert from 'node:assert/strict';
import { legendZones, zoneForPosition } from '../src/qualificationZones.ts';

test('German and French top flights show both play-off and automatic relegation positions', () => {
  for (const league of ['德甲', '法甲']) {
    assert.equal(zoneForPosition(league, 4, 18), league === '法甲' ? 'championsQualifying' : 'champions');
    assert.equal(zoneForPosition(league, 5, 18), 'europa');
    assert.equal(zoneForPosition(league, 6, 18), 'conference');
    assert.equal(zoneForPosition(league, 16, 18), 'relegationPlayoff');
    assert.equal(zoneForPosition(league, 17, 18), 'relegation');
  }
});

test('French Champions League qualifying place differs from the other leagues', () => {
  assert.equal(zoneForPosition('法甲', 3, 18), 'champions');
  assert.equal(zoneForPosition('法甲', 4, 18), 'championsQualifying');
  assert.equal(zoneForPosition('德甲', 4, 18), 'champions');
});

test('20-team leagues mark bottom three and no fixed relegation play-off', () => {
  for (const league of ['英超', '西甲', '意甲']) {
    assert.equal(zoneForPosition(league, 16, 20), null);
    assert.equal(zoneForPosition(league, 18, 20), 'relegation');
    assert.equal(zoneForPosition(league, 20, 20), 'relegation');
  }
});

test('Premier League fifth is undecided and sixth is not a fixed Conference place', () => {
  assert.equal(zoneForPosition('英超', 5, 20), 'europePending');
  assert.equal(zoneForPosition('英超', 6, 20), null);
  assert.deepEqual(legendZones('英超'), ['champions', 'europePending', 'relegation']);
  assert.equal(zoneForPosition('西甲', 6, 20), 'conference');
});

test('Champions League uses league-phase advancement rather than domestic zones', () => {
  assert.equal(zoneForPosition('欧冠', 8, 36), 'roundOf16');
  assert.equal(zoneForPosition('欧冠', 9, 36), 'knockoutPlayoff');
  assert.equal(zoneForPosition('欧冠', 25, 36), 'eliminated');
  assert.equal(zoneForPosition('德甲', 16, 20), null);
});
