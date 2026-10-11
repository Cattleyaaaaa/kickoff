import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { normalizeTopScorers } from './player-transform.ts';
import type { ApiTopScorer, PlayerStatsSnapshot } from './player-transform.ts';

const token = process.env.GOAL_API_KEY?.trim();
if (!token) throw new Error('Set GOAL_API_KEY in the server environment or GitHub Actions secret.');

type ApiLeague = { id?: string; name?: string; countryName?: string; season?: string; isActive?: boolean };
type ApiList<T> = { success: boolean; data?: T[]; pagination?: { hasMore?: boolean; total?: number } };
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
// Two scheduled runs share the free plan's daily allowance. This sync normally
// needs fewer than 60 calls; the cap protects the user's allowance if a provider
// starts returning unexpected pagination or rate-limit responses.
const MAX_REQUESTS_PER_RUN = 450;
let requestCount = 0;

const pause = (ms: number) => new Promise<void>(resolvePause => setTimeout(resolvePause, ms));
let lastRequestAt = 0;
async function get<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (requestCount >= MAX_REQUESTS_PER_RUN) throw new Error(`GOAL API safety cap reached (${MAX_REQUESTS_PER_RUN} requests); refusing to publish an incomplete snapshot.`);
    const wait = 6500 - (Date.now() - lastRequestAt);
    if (wait > 0) await pause(wait);
    lastRequestAt = Date.now();
    requestCount++;
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

for (const target of targets) {
  const leagues = await get<ApiList<ApiLeague>>(`/leagues?search=${encodeURIComponent(target.search)}&limit=100`);
  const league = leagues.data?.find(item => item.id && item.name && target.name.test(item.name)
    && target.country.test(item.countryName || '')
    && seasonPattern.test(item.season || ''));
  if (!league?.id) {
    throw new Error(`${target.label}: no verified ${seasonStart}/${seasonEnd} league found; stopping before more API calls.`);
  }
  const scorerRows: ApiTopScorer[] = [];
  for (let offset = 0; ; offset += 100) {
    const payload = await get<ApiList<ApiTopScorer>>(`/leagues/${encodeURIComponent(league.id)}/top-scorers?limit=100&offset=${offset}`);
    if (!Array.isArray(payload.data)) throw new Error(`${target.label}: top-scorer response is missing its data array.`);
    scorerRows.push(...payload.data);
    if (payload.pagination?.hasMore === true && payload.data.length < 100) {
      throw new Error(`${target.label}: inconsistent scorer pagination; refusing a partial snapshot.`);
    }
    if (payload.pagination?.hasMore === false || payload.data.length < 100) break;
    if (offset >= 1900) throw new Error(`${target.label}: scorer pagination exceeded 2,000 rows; refusing a partial snapshot.`);
  }
  // The endpoint is explicitly scoped to a league and season. Check row scope when present,
  // but do not reject valid scoped rows just because the provider omits duplicate metadata.
  const scopedRows = scorerRows.filter(row => (!row.season || seasonPattern.test(row.season))
    && (!row.leagueId || row.leagueId === league.id));
  const players = normalizeTopScorers(scopedRows);
  if (!players.length) throw new Error(`${target.label}: no current-season scorer rows; keeping the previous complete snapshot.`);
  snapshot.leagues[target.label] = { season: league.season || `${seasonStart}/${seasonEnd}`, players };
  console.log(`${target.label}: ${players.length} verified scorer rows across ${Math.ceil(scorerRows.length / 100)} page(s)`);
}

if (Object.keys(snapshot.leagues).length !== targets.length) {
  throw new Error(`Only ${Object.keys(snapshot.leagues).length}/${targets.length} competitions were available; refusing to overwrite the last complete snapshot.`);
}
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
  for (let start = 0; start < untranslated.length; start += 30) {
    const batch = untranslated.slice(start, start + 30);
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${translationKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Translate football player names into their commonly used official Simplified Chinese and Traditional Chinese sports-media names. These are proper names: identify the real player where possible, use standard transliterations, preserve initials when identity is uncertain, and never invent a different person. Return only valid JSON with shape {"translations":[{"source":"exact input","zh-CN":"...","zh-TW":"..."}]}. Include every input exactly once.' },
            { role: 'user', content: `Return JSON translations for these exact names: ${JSON.stringify(batch)}` },
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
        if (item.source && batch.includes(item.source) && item['zh-CN']?.trim() && item['zh-TW']?.trim()) {
          previousTranslations.set(item.source, { 'zh-CN': item['zh-CN'].trim(), 'zh-TW': item['zh-TW'].trim(), en: item.source });
        }
      }
      console.log(`Translated ${batch.filter(name => previousTranslations.has(name)).length}/${batch.length} player names in batch ${Math.floor(start / 30) + 1}.`);
    } catch (error) {
      console.warn(`Player-name translation batch ${Math.floor(start / 30) + 1} failed; keeping source names. ${String(error)}`);
    }
  }
} else if (!translationKey && untranslated.length) {
  console.warn(`DEEPSEEK_API_KEY is not configured; ${untranslated.length} new player names will remain in the provider language.`);
}
for (const player of allPlayers) {
  const localizedNames = previousTranslations.get(player.name);
  if (localizedNames) player.localizedNames = localizedNames;
}
if (translationKey) {
  const missing = allPlayers.filter(player => !player.localizedNames?.['zh-CN'] || !player.localizedNames?.['zh-TW']);
  if (missing.length) throw new Error(`DeepSeek left ${missing.length} player names untranslated; keeping the previous snapshot.`);
}

await mkdir(dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
await rename(temporary, output);
console.log(`Saved player statistics to ${output}`);
console.log(`GOAL API requests used: ${requestCount}/${MAX_REQUESTS_PER_RUN}. Team and player advanced metrics remain unavailable from the current-season leaderboard.`);
