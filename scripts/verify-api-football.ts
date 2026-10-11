/** Read-only, bounded check of the six 2026/27 competitions on API-Football. */
export {};
const key = process.env.API_FOOTBALL_KEY?.trim();
if (!key) throw new Error('Add API_FOOTBALL_KEY to GitHub Actions repository secrets.');

type ApiReply<T> = { response?: T[]; errors?: unknown; paging?: { total?: number } };
type Coverage = {
  fixtures?: { statistics_fixtures?: boolean; statistics_players?: boolean; events?: boolean; lineups?: boolean };
  players?: boolean;
  standings?: boolean;
};
type League = {
  league?: { id?: number; name?: string; type?: string };
  country?: { name?: string };
  seasons?: Array<{ year?: number; coverage?: Coverage }>;
};
type PlayerRow = { statistics?: Array<Record<string, unknown>> };
type Fixture = { fixture?: { id?: number; date?: string; status?: { short?: string } }; statistics?: unknown; players?: unknown };

const competitions = [
  { name: '英超', id: 39, country: 'England', pattern: /Premier League/i },
  { name: '西甲', id: 140, country: 'Spain', pattern: /La Liga/i },
  { name: '意甲', id: 135, country: 'Italy', pattern: /Serie A/i },
  { name: '德甲', id: 78, country: 'Germany', pattern: /Bundesliga/i },
  { name: '法甲', id: 61, country: 'France', pattern: /Ligue 1/i },
  { name: '欧冠', id: 2, country: 'World', pattern: /Champions League/i },
] as const;

const season = 2026; // API-Football uses the starting year for 2026/27.
const MAX_CALLS = 24;
let calls = 0;
let lastCall = 0;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function get<T>(path: string): Promise<ApiReply<T>> {
  if (calls >= MAX_CALLS) throw new Error(`Safety limit of ${MAX_CALLS} API requests reached.`);
  const wait = 6500 - (Date.now() - lastCall); // Free plan: at most 10/minute.
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  calls++;
  const response = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { 'x-apisports-key': key! },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const body = await response.json() as ApiReply<T>;
  if (Array.isArray(body.errors) && body.errors.length || body.errors && !Array.isArray(body.errors) && Object.keys(body.errors).length) {
    throw new Error(`${path}: ${JSON.stringify(body.errors)}`);
  }
  if (!Array.isArray(body.response)) throw new Error(`${path}: response array missing`);
  return body;
}

function present(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function countPlayerFields(rows: PlayerRow[]): Record<string, number> {
  const fields: Record<string, number> = {};
  for (const row of rows) for (const stats of row.statistics || []) {
    for (const [group, values] of Object.entries(stats)) {
      if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
      for (const [name, value] of Object.entries(values)) {
        if (present(value)) fields[`${group}.${name}`] = (fields[`${group}.${name}`] || 0) + 1;
      }
    }
  }
  return fields;
}

const report: Record<string, unknown>[] = [];
for (const target of competitions) {
  const item: Record<string, unknown> = { competition: target.name, season: '2026/27' };
  try {
    const leagueReply = await get<League>(`/leagues?id=${target.id}&season=${season}`);
    const league = leagueReply.response?.find(row => row.league?.id === target.id
      && target.pattern.test(row.league.name || '')
      && (target.country === 'World' || row.country?.name === target.country));
    const seasonRow = league?.seasons?.find(row => row.year === season);
    if (!seasonRow) {
      item.result = '2026/27 season not returned to this API key';
      report.push(item);
      continue; // No sample calls if the plan cannot access the season.
    }
    item.coverage = seasonRow.coverage || null;
    const coverage = seasonRow.coverage;
    if (coverage?.players) {
      const players = await get<PlayerRow>(`/players?league=${target.id}&season=${season}&page=1`);
      item.playerSample = { rows: players.response?.length || 0, totalPages: players.paging?.total ?? null,
        populatedFields: countPlayerFields(players.response || []) };
    }
    if (coverage?.fixtures?.statistics_fixtures || coverage?.fixtures?.statistics_players) {
      const fixtures = await get<Fixture>(`/fixtures?league=${target.id}&season=${season}&status=FT`);
      const completed = fixtures.response?.filter(row => row.fixture?.id && row.fixture.status?.short === 'FT') || [];
      const latest = completed.sort((a, b) => (b.fixture?.date || '').localeCompare(a.fixture?.date || ''))[0];
      item.finishedFixtures = completed.length;
      if (latest?.fixture?.id) {
        const sample = await get<Fixture>(`/fixtures?id=${latest.fixture.id}`);
        const detail = sample.response?.[0];
        item.fixtureSample = {
          id: latest.fixture.id,
          teamStatisticsAvailable: Array.isArray(detail?.statistics) && detail.statistics.length > 0,
          playerStatisticsAvailable: Array.isArray(detail?.players) && detail.players.length > 0,
        };
      }
    }
    item.result = 'checked';
  } catch (error) {
    item.result = `check failed: ${String(error)}`;
  }
  report.push(item);
}

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), calls, maxCalls: MAX_CALLS, report }, null, 2));
if (report.some(item => item.result !== 'checked')) process.exitCode = 1;
