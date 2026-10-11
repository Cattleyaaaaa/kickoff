// Read-only coverage check. This never writes a website snapshot.
export {};
const key = process.env.PITCHAPI_KEY?.trim();
if (!key) throw new Error('Add PITCHAPI_KEY as a GitHub Actions secret before running this check.');

type League = { id?: string; name?: string; country_code?: string; seasons?: string[] };
type Match = { id?: string; date?: string; status?: string; home_team?: { name?: string }; away_team?: { name?: string }; score_home?: number | null; score_away?: number | null };
type Envelope<T> = { data?: T; error?: { code?: string; message?: string } };

const targets = [
  { label: '英超', name: /^(English )?Premier League$/i, country: 'ENG' },
  { label: '西甲', name: /^(La ?Liga|Primera Divisi[oó]n)$/i, country: 'ESP' },
  { label: '意甲', name: /^Serie A$/i, country: 'ITA' },
  { label: '德甲', name: /^(?:1\.\s*)?Bundesliga$/i, country: 'DEU' },
  { label: '法甲', name: /^Ligue 1$/i, country: 'FRA' },
  { label: '欧冠', name: /^(UEFA )?Champions League$/i, country: null },
] as const;
const season = '2026/2027';
const MAX_CALLS = 25; // catalogue + 6 × (fixtures, team stats, player stats, advanced players)
let calls = 0;
const selectedTargets = process.env.VERIFY_ONLY ? targets.filter(target => target.label === process.env.VERIFY_ONLY) : targets;
if (!selectedTargets.length) throw new Error(`Unknown VERIFY_ONLY competition: ${process.env.VERIFY_ONLY}`);

async function get<T>(path: string): Promise<T> {
  if (calls >= MAX_CALLS) throw new Error(`Safety limit of ${MAX_CALLS} requests reached.`);
  calls++;
  const response = await fetch(`https://api.pitchapi.dev/v1${path}`, {
    headers: { 'X-API-KEY': key! },
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json() as Envelope<T>;
  if (!response.ok || body.error || body.data === undefined) {
    throw new Error(`${path}: ${body.error?.code || `HTTP ${response.status}`} ${body.error?.message || ''}`.trim());
  }
  return body.data;
}

const list = await get<{ leagues?: League[] }>('/leagues');
if (!Array.isArray(list.leagues)) throw new Error('PitchAPI league catalogue did not include a leagues array.');

function playerKeys(rows: unknown): string[] {
  if (!Array.isArray(rows)) return [];
  const keys = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const groups = (row as { stats?: unknown }).stats;
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      const stats = (group as { stats?: Record<string, { key?: string }> })?.stats;
      if (stats && typeof stats === 'object') for (const item of Object.values(stats)) if (item?.key) keys.add(item.key);
    }
  }
  return [...keys].sort();
}

function teamKeys(value: unknown): string[] {
  const periods = (value as { periods?: Array<{ period?: string; groups?: Array<{ items?: Array<{ key?: string }> }> }> })?.periods;
  const all = periods?.find(period => period.period === 'All');
  return [...new Set((all?.groups || []).flatMap(group => (group.items || []).map(item => item.key).filter((key): key is string => !!key)))].sort();
}

function advancedKeys(value: unknown): string[] {
  const rows = Array.isArray(value) ? value : (value as { players?: unknown[] })?.players;
  if (!Array.isArray(rows)) return [];
  const keys = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    for (const [group, fields] of Object.entries(row)) {
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) continue;
      for (const field of Object.keys(fields)) keys.add(`${group}.${field}`);
    }
  }
  return [...keys].sort();
}

const report: Array<Record<string, unknown>> = [];
for (const target of selectedTargets) {
  const candidates = list.leagues.filter(league => league.id && league.name && target.name.test(league.name)
    && (!target.country || !league.country_code || league.country_code === target.country));
  const league = candidates.find(item => item.seasons?.includes(season));
  if (!league?.id) {
    report.push({ competition: target.label, status: 'season unavailable', candidates: candidates.map(item => ({ name: item.name, country: item.country_code, seasons: item.seasons })), similarNames: list.leagues.filter(item => /Bundesliga/i.test(item.name || '')).map(item => ({ name: item.name, country: item.country_code, seasons: item.seasons })) });
    continue;
  }
  try {
    const data = await get<{ matches?: Match[] }>(`/leagues/${encodeURIComponent(league.id)}/matches?season=${encodeURIComponent(season)}`);
    if (!Array.isArray(data.matches)) throw new Error('League match list is missing.');
    const finished = data.matches.filter(match => match.status === 'finished' && match.id && match.score_home !== null && match.score_away !== null)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const sample = finished[0];
    if (!sample?.id) {
      report.push({ competition: target.label, status: 'season listed but no finished match', league: league.name, matches: data.matches.length });
      continue;
    }
    const team = await get<unknown>(`/matches/${encodeURIComponent(sample.id)}/stats`);
    const players = await get<unknown>(`/matches/${encodeURIComponent(sample.id)}/players`);
    let advanced: unknown = null;
    let advancedError: string | null = null;
    try { advanced = await get<unknown>(`/matches/${encodeURIComponent(sample.id)}/advanced/players`); }
    catch (error) { advancedError = String(error); }
    report.push({
      competition: target.label, status: 'sample checked', league: league.name, finishedMatches: finished.length,
      sample: { date: sample.date, home: sample.home_team?.name, away: sample.away_team?.name, score: `${sample.score_home}:${sample.score_away}` },
      teamMetricKeys: teamKeys(team), playerMetricKeys: playerKeys(players), advancedPlayerMetricKeys: advancedKeys(advanced), advancedError,
    });
  } catch (error) {
    report.push({ competition: target.label, status: 'check failed', error: String(error) });
  }
}

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), season, calls, maxCalls: MAX_CALLS, report }, null, 2));
if (report.some(item => item.status !== 'sample checked')) process.exitCode = 1;
