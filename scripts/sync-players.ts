import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { normalizeTopScorers } from './player-transform.ts';
import type { ApiTopScorer, PlayerStatsSnapshot } from './player-transform.ts';

const token = process.env.GOAL_API_KEY?.trim();
if (!token) throw new Error('Set GOAL_API_KEY in the server environment or GitHub Actions secret.');

type ApiLeague = { id?: string; name?: string; countryName?: string; season?: string; isActive?: boolean };
type ApiList<T> = { success: boolean; data?: T[] };
const targets = [
  { label: '英超', search: 'Premier League', name: /^(English )?Premier League$/i, country: /England/i },
  { label: '西甲', search: 'La Liga', name: /^(La ?Liga|Primera Divisi[oó]n)( .*)?$/i, country: /Spain/i },
  { label: '意甲', search: 'Serie A', name: /^Serie A( .*)?$/i, country: /Italy/i },
  { label: '德甲', search: 'Bundesliga', name: /^(1\. )?Bundesliga$/i, country: /Germany/i },
  { label: '法甲', search: 'Ligue 1', name: /^Ligue 1( .*)?$/i, country: /France/i },
  { label: '欧冠', search: 'Champions League', name: /^(UEFA )?Champions League$/i, country: /intl|international|world|europe/i },
] as const;

const now = new Date();
const seasonStart = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
const seasonEnd = seasonStart + 1;
const seasonPattern = new RegExp(`^${seasonStart}\\s*[/–-]\\s*(?:${String(seasonEnd).slice(-2)}|${seasonEnd})$`);

const pause = (ms: number) => new Promise<void>(resolvePause => setTimeout(resolvePause, ms));
let lastRequestAt = 0;
async function get<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const wait = 6500 - (Date.now() - lastRequestAt);
    if (wait > 0) await pause(wait);
    lastRequestAt = Date.now();
    const response = await fetch(`https://api.goal-api.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 429 && attempt === 0) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await pause(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 65000);
      continue;
    }
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${await response.text()}`);
    const payload = await response.json() as T & { success?: boolean };
    if (payload.success === false) throw new Error(`${path}: API reported failure`);
    return payload;
  }
  throw new Error(`${path}: exhausted rate limit retries`);
}

const snapshot: PlayerStatsSnapshot = { source: 'goal-api.com', updatedAt: new Date().toISOString(), leagues: {} };
for (const target of targets) {
  const leagues = await get<ApiList<ApiLeague>>(`/leagues?search=${encodeURIComponent(target.search)}&limit=100`);
  const league = leagues.data?.find(item => item.id && item.name && target.name.test(item.name)
    && target.country.test(item.countryName || '')
    && seasonPattern.test(item.season || ''));
  if (!league?.id) {
    console.warn(`${target.label}: no verified ${seasonStart}/${seasonEnd} league found; leaving this league unavailable`);
    continue;
  }
  const payload = await get<ApiList<ApiTopScorer>>(`/leagues/${encodeURIComponent(league.id)}/top-scorers?limit=30`);
  const players = normalizeTopScorers(payload.data || []);
  if (!players.length) {
    console.warn(`${target.label}: no verified top-scorer rows; leaving this league unavailable`);
    continue;
  }
  snapshot.leagues[target.label] = { season: league.season || `${seasonStart}/${seasonEnd}`, players };
  console.log(`${target.label}: ${players.length} verified scorer rows`);
}

if (!Object.keys(snapshot.leagues).length) throw new Error('No current-season player statistics were available; previous snapshot was not replaced.');
const output = resolve('public/data/players.json');
await mkdir(dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
await rename(temporary, output);
console.log(`Saved player statistics to ${output}`);
