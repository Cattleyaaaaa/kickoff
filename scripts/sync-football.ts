import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { competitions, normalizeMatches, normalizeStandings } from './football-transform.ts';
import type { ApiMatchesResponse, ApiStandingsResponse, FootballSnapshot, MatchResult, StandingResult } from './football-transform.ts';

const token = process.env.FOOTBALL_DATA_API_KEY?.trim();
if (!token) throw new Error('Set FOOTBALL_DATA_API_KEY in the server environment or GitHub Actions secret.');

const output = resolve('public/data/football.json');
const pause = ms => new Promise(resolvePause => setTimeout(resolvePause, ms));
let lastRequestAt = 0;

async function get<T>(path: string, allowNotFound = false): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const wait = 6500 - (Date.now() - lastRequestAt);
    if (wait > 0) await pause(wait);
    lastRequestAt = Date.now();
    const response = await fetch(`https://api.football-data.org/v4${path}`, {
      headers: { 'X-Auth-Token': token },
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 404 && allowNotFound) return null;
    if (response.status === 429 && attempt === 0) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await pause(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 65000);
      continue;
    }
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${await response.text()}`);
    return response.json() as Promise<T>;
  }
  throw new Error(`${path}: exhausted rate limit retries`);
}

const now = new Date();
const from = new Date(now.getTime() - 8 * 86400000).toISOString().slice(0, 10);
const to = now.toISOString().slice(0, 10);
const matches: MatchResult[] = [];
const standings: Record<string, StandingResult> = {};

for (const { code, name } of competitions) {
  const matchPayload = await get<ApiMatchesResponse>(`/competitions/${code}/matches?dateFrom=${from}&dateTo=${to}`);
  if (!matchPayload) throw new Error(`${code}: matches response is missing`);
  matches.push(...normalizeMatches(matchPayload, name));
  const tablePayload = await get<ApiStandingsResponse>(`/competitions/${code}/standings`, code === 'CL');
  standings[name] = tablePayload ? normalizeStandings(tablePayload, name) : { season: '', groups: [] };
  console.log(`${name}: ${matches.filter(match => match.league === name).length} finished matches, ${standings[name].groups.length} standings groups`);
}

matches.sort((a, b) => b.utcDate.localeCompare(a.utcDate));
const snapshot: FootballSnapshot = {
  source: 'football-data.org', updatedAt: now.toISOString(),
  range: { from, to }, matches, standings,
};
await mkdir(dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
await rename(temporary, output);
console.log(`Saved ${matches.length} results to ${output}`);
