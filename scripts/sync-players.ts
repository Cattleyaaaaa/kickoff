import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { normalizeTopScorers } from './player-transform.ts';
import type { ApiTopScorer, PlayerStatsSnapshot } from './player-transform.ts';

const token = process.env.GOAL_API_KEY?.trim();
if (!token) throw new Error('Set GOAL_API_KEY in the server environment or GitHub Actions secret.');

type ApiLeague = { id?: string; name?: string; countryName?: string; season?: string; isActive?: boolean };
type ApiList<T> = { success: boolean; data?: T[] };
type ApiTeam = { id?: string; name?: string; shortName?: string; tla?: string };
type TeamStatKey = 'shotsPerGame' | 'possession' | 'cleanSheets';
type TeamStats = Partial<Record<TeamStatKey, number>>;
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
const seasonQuery = `${seasonStart}-${seasonEnd}`;

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

const snapshot: PlayerStatsSnapshot = { schemaVersion: 2, source: 'goal-api.com', updatedAt: new Date().toISOString(), leagues: {} };
const footballPath = resolve('public/data/football.json');
const footballText = await readFile(footballPath, 'utf8').catch(() => '');
const footballSnapshot = footballText ? JSON.parse(footballText) as {
  source?: string; standings?: Record<string, { groups?: Array<{ rows?: Array<{ id: number | null; code: string; sourceName: string }> }> }>;
  teamStats?: Record<string, Record<string, TeamStats>>;
  teamStatsSource?: { name: string; updatedAt: string };
} : null;
const teamStatsByLeague: Record<string, Record<string, TeamStats>> = { ...(footballSnapshot?.teamStats || {}) };
let freshTeamStatsCount = 0;

function teamKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(football club|football|club|fc|afc|cf|sc|ssc|ac|as|sv|vfl|1\.)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}
function scalar(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace(/%$/, '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
function collectStats(value: unknown, result: TeamStats): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        const name = String(row.type ?? row.name ?? row.key ?? '').toLowerCase().replace(/[^a-z]/g, '');
        const statValue = scalar(row.value ?? row.average ?? row.total);
        if (statValue !== null) {
          if (['averagepossession', 'possession', 'possessionpercentage'].includes(name)) result.possession = statValue;
          if (['averageshotspergame', 'shotspergame', 'averageshots'].includes(name)) result.shotsPerGame = statValue;
          if (['cleansheets', 'cleansheet'].includes(name)) result.cleanSheets = statValue;
        }
        collectStats(item, result);
      }
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
    const number = scalar(child);
    if (number !== null) {
      if (['averagepossession', 'possession', 'possessionpercentage'].includes(normalized)) result.possession = number;
      if (['averageshotspergame', 'shotspergame', 'averageshots'].includes(normalized)) result.shotsPerGame = number;
      if (['cleansheets', 'cleansheet'].includes(normalized)) result.cleanSheets = number;
    }
    if (child && typeof child === 'object') collectStats(child, result);
  }
}

for (const target of targets) {
  const leagues = await get<ApiList<ApiLeague>>(`/leagues?search=${encodeURIComponent(target.search)}&limit=100`);
  const league = leagues.data?.find(item => item.id && item.name && target.name.test(item.name)
    && target.country.test(item.countryName || '')
    && seasonPattern.test(item.season || ''));
  if (!league?.id) {
    console.warn(`${target.label}: no verified ${seasonStart}/${seasonEnd} league found; leaving this league unavailable`);
    continue;
  }
  const payload = await get<ApiList<ApiTopScorer>>(`/leagues/${encodeURIComponent(league.id)}/top-scorers?season=${seasonQuery}&limit=30`);
  // The endpoint is explicitly scoped to a league and season. Check row scope when present,
  // but do not reject valid scoped rows just because the provider omits duplicate metadata.
  const scopedRows = (payload.data || []).filter(row => (!row.season || seasonPattern.test(row.season))
    && (!row.leagueId || row.leagueId === league.id));
  const players = normalizeTopScorers(scopedRows);
  if (!players.length) {
    console.warn(`${target.label}: no verified top-scorer rows; leaving this league unavailable`);
  } else {
    snapshot.leagues[target.label] = { season: league.season || `${seasonStart}/${seasonEnd}`, players };
    console.log(`${target.label}: ${players.length} verified scorer rows`);
  }

  // GOAL API exposes team season aggregates separately. Map its team identifiers back
  // to the football-data.org table by short code first, then normalized source name.
  try {
    const teams = await get<ApiList<ApiTeam>>(`/leagues/${encodeURIComponent(league.id)}/teams?season=${seasonQuery}&limit=100`);
    const rows = footballSnapshot?.standings?.[target.label]?.groups?.flatMap(group => group.rows || []) || [];
    const targetStats: Record<string, TeamStats> = { ...(teamStatsByLeague[target.label] || {}) };
    for (const goalTeam of teams.data || []) {
      if (!goalTeam.id || !goalTeam.name) continue;
      const tableRow = rows.find(row => goalTeam.tla && row.code.toLowerCase() === goalTeam.tla.toLowerCase())
        || rows.find(row => teamKey(row.sourceName) === teamKey(goalTeam.name!) || teamKey(row.sourceName) === teamKey(goalTeam.shortName || ''));
      if (!tableRow?.id) continue;
      try {
        const response = await get<unknown>(`/teams/${encodeURIComponent(goalTeam.id)}/statistics?season=${seasonQuery}`);
        const stats: TeamStats = {};
        collectStats(response, stats);
        if (Object.keys(stats).length) {
          targetStats[String(tableRow.id)] = stats;
          freshTeamStatsCount++;
        }
      } catch (error) {
        console.warn(`${target.label}/${goalTeam.name}: team statistics unavailable (${String(error)})`);
      }
    }
    teamStatsByLeague[target.label] = targetStats;
    console.log(`${target.label}: mapped season aggregates for ${Object.keys(targetStats).length} teams`);
  } catch (error) {
    console.warn(`${target.label}: team statistics sync unavailable (${String(error)})`);
  }
}

if (!Object.keys(snapshot.leagues).length) console.warn('No scorer leaderboards passed season validation; publishing an empty snapshot instead of stale statistics.');
const output = resolve('public/data/players.json');
const previousText = await readFile(output, 'utf8').catch(() => '');
const previous = previousText ? JSON.parse(previousText) as PlayerStatsSnapshot : null;
const previousTranslations = new Map<string, NonNullable<PlayerStatsSnapshot['leagues'][string]['players'][number]['localizedNames']>>();
for (const group of Object.values(previous?.leagues || {})) {
  for (const player of group.players) {
    if (player.localizedNames?.['zh-CN'] && player.localizedNames?.['zh-TW']) {
      previousTranslations.set(player.name, player.localizedNames);
    }
  }
}

const allPlayers = Object.values(snapshot.leagues).flatMap(group => group.players);
const untranslated = [...new Set(allPlayers.map(player => player.name).filter(name => !previousTranslations.has(name)))];
const translationKey = process.env.DEEPSEEK_API_KEY?.trim();
if (translationKey && untranslated.length) {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${translationKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.1,
        max_tokens: 7000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Translate football player names into their commonly used official Simplified Chinese and Traditional Chinese sports-media names. These are proper names: identify the real player where possible, use standard transliterations, preserve initials when identity is uncertain, and never invent a different person. Return only valid JSON with shape {"translations":[{"source":"exact input","zh-CN":"...","zh-TW":"..."}]}. Include every input exactly once.' },
          { role: 'user', content: `Return JSON translations for these exact names: ${JSON.stringify(untranslated)}` },
        ],
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${await response.text()}`);
    const completion = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error('DeepSeek returned an empty response.');
    const parsed = JSON.parse(content) as { translations?: Array<{ source?: string; 'zh-CN'?: string; 'zh-TW'?: string }> };
    for (const item of parsed.translations || []) {
      if (item.source && untranslated.includes(item.source) && item['zh-CN']?.trim() && item['zh-TW']?.trim()) {
        previousTranslations.set(item.source, { 'zh-CN': item['zh-CN'].trim(), 'zh-TW': item['zh-TW'].trim(), en: item.source });
      }
    }
    console.log(`Translated ${previousTranslations.size} player names into Chinese.`);
  } catch (error) {
    console.warn(`Player-name translation failed; using source names for untranslated players. ${String(error)}`);
  }
} else if (!translationKey && untranslated.length) {
  console.warn(`DEEPSEEK_API_KEY is not configured; ${untranslated.length} new player names will remain in the provider language.`);
}
for (const player of allPlayers) {
  const localizedNames = previousTranslations.get(player.name);
  if (localizedNames) player.localizedNames = localizedNames;
}

await mkdir(dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
await rename(temporary, output);
console.log(`Saved player statistics to ${output}`);

if (footballSnapshot?.source === 'football-data.org') {
  footballSnapshot.teamStats = teamStatsByLeague;
  if (freshTeamStatsCount > 0) {
    footballSnapshot.teamStatsSource = { name: 'GOAL API', updatedAt: snapshot.updatedAt };
  }
  const footballTemporary = `${footballPath}.tmp`;
  await writeFile(footballTemporary, `${JSON.stringify(footballSnapshot, null, 2)}\n`, 'utf8');
  await rename(footballTemporary, footballPath);
  console.log(`Updated verified team aggregates in ${footballPath}`);
}
