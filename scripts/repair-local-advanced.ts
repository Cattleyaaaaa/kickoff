import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Values = Record<string, number | undefined>;
type Team = { name: string; games: number; values: Values };
type Player = { values: Values };
type Snapshot = {
  source: string;
  schemaVersion: number;
  season: string;
  localRepair?: { kind: string; correctedAt: string };
  leagues: Record<string, { teams: Team[]; players: Player[] }>;
};

const source = resolve('public/data/advanced.json');
const backupDirectory = resolve('backend/.cache');
const backup = resolve(backupDirectory, 'advanced-before-offline-repair.json');
const original = await readFile(source, 'utf8');
const snapshot = JSON.parse(original) as Snapshot;
if (snapshot.source !== 'pitchapi.dev' || snapshot.schemaVersion !== 1 || !snapshot.leagues
  || Object.keys(snapshot.leagues).length !== 6 || snapshot.localRepair) {
  throw new Error('This file is not the original six-league PitchAPI snapshot; no changes made.');
}

let repairedTeams = 0;
for (const league of Object.values(snapshot.leagues)) {
  if (!Array.isArray(league.teams) || !Array.isArray(league.players)) throw new Error('Invalid league rows.');
  for (const team of league.teams) {
    const v = team.values;
    for (const key of ['shots', 'shotsOnTarget', 'passesCompleted', 'yellowCards']) {
      const number = v[key];
      if (!Number.isInteger(number) || (number as number) % 2 !== 0)
        throw new Error(`${team.name}: ${key} is not a duplicated even count; no changes made.`);
    }
    if (typeof v.passes !== 'number' || typeof team.games !== 'number'
      || typeof v.shotsPerGame !== 'number' || team.games <= 0
      || Math.abs((v.shots as number) / 2 / team.games - v.shotsPerGame) > 0.051
      || (v.shotsOnTarget as number) > (v.shots as number)
      || (v.passesCompleted as number) / 2 > v.passes) {
      throw new Error(`${team.name}: data does not match the known duplicate pattern; no changes made.`);
    }
  }
}

for (const league of Object.values(snapshot.leagues)) {
  for (const team of league.teams) {
    const v = team.values;
    for (const key of ['shots', 'shotsOnTarget', 'passesCompleted', 'yellowCards']) v[key] = (v[key] as number) / 2;
    if (v.passes && v.passesCompleted !== undefined)
      v.passAccuracy = Math.round(v.passesCompleted / v.passes * 1000) / 10;
    repairedTeams++;
  }
  for (const player of league.players) {
    delete player.values.passesCompleted;
    delete player.values.passAccuracy;
  }
}
snapshot.localRepair = { kind: 'deduplicated-team-basic-stats-and-separated-player-passing', correctedAt: new Date().toISOString() };

await mkdir(backupDirectory, { recursive: true });
await copyFile(source, backup);
const temporary = `${source}.tmp`;
try {
  await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  await rename(temporary, source);
} finally {
  await rm(temporary, { force: true });
}
console.log(`Repaired ${repairedTeams} team rows offline. Original snapshot backed up at ${backup}. No API calls made.`);
