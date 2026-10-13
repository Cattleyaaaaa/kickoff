import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { localizeClub, localizeLeague } from '../src/data.ts';

type Fixture = {
  id: string; league: string; utcDate: string; home: string; away: string;
  hs: number; as: number; status: string;
};
type MatchFact = {
  id: string; date: string | null; league: string; home: string; away: string;
  scoreHome: number; scoreAway: number; teamStatsVerified: boolean; advancedStatsVerified: boolean;
  homeStats: Record<string, number>; awayStats: Record<string, number>;
};
type GeneratedArticle = {
  id: string; title: string; summary: string; body: string; url: string;
  publishedAt: string; category: string; aiGenerated: boolean; sourceMatchIds: string[];
  dataSources?: Array<{ label: string; updatedAt?: string; url?: string; recordId?: string }>;
};
type ArticleFile = { articles: GeneratedArticle[] };
type StatName = { key: string; label: string; comparison: boolean };

const footballFile = resolve('public/data/football.json');
const matchStatsFile = resolve('public/data/match-stats.json');
const articleFile = resolve('content/generated-news.json');
const freshnessWindowMs = 36 * 60 * 60 * 1000;
const supportedLeagues = new Set(['英超', '西甲', '意甲', '德甲', '法甲', '欧冠']);
const statNames: StatName[] = [
  { key: 'possession', label: '控球率', comparison: true },
  { key: 'shots', label: '射门', comparison: true },
  { key: 'shotsOnTarget', label: '射正', comparison: true },
  { key: 'passes', label: '传球', comparison: true },
  { key: 'passAccuracy', label: '传球成功率', comparison: true },
  { key: 'keyPasses', label: '关键传球', comparison: true },
  { key: 'dribblesCompleted', label: '成功过人', comparison: true },
  { key: 'fouls', label: '犯规', comparison: true },
  { key: 'yellowCards', label: '黄牌', comparison: true },
  { key: 'redCards', label: '红牌', comparison: true },
];

const football = JSON.parse(await readFile(footballFile, 'utf8')) as {
  source: string; updatedAt: string; fixtures: Fixture[];
};
if (football.source !== 'football-data.org' || !Array.isArray(football.fixtures))
  throw new Error('public/data/football.json is not a valid football-data.org snapshot.');
const now = Date.now();
if (!Number.isFinite(Date.parse(football.updatedAt)) || now - Date.parse(football.updatedAt) > freshnessWindowMs)
  throw new Error('Football result snapshot is older than 36 hours; refusing to write news from stale data.');

const matchSnapshot = await readFile(matchStatsFile, 'utf8').then(value => JSON.parse(value) as {
  source: string; updatedAt: string; leagues: Record<string, MatchFact[]>;
}).catch(() => null);
const matchStatsFresh = matchSnapshot?.source === 'pitchapi.dev'
  && (matchSnapshot as { schemaVersion?: number }).schemaVersion === 1
  && Number.isFinite(Date.parse(matchSnapshot.updatedAt))
  && now - Date.parse(matchSnapshot.updatedAt) <= freshnessWindowMs;

const history = await readFile(articleFile, 'utf8').then(value => JSON.parse(value) as ArticleFile)
  .catch(() => ({ articles: [] } as ArticleFile));
if (!Array.isArray(history.articles)) throw new Error('content/generated-news.json must contain an articles array.');
const fixtures = football.fixtures
  .filter(match => match.status === 'FINISHED' && supportedLeagues.has(match.league)
    && Number.isInteger(match.hs) && match.hs >= 0 && Number.isInteger(match.as) && match.as >= 0
    && Number.isFinite(Date.parse(match.utcDate)) && Date.parse(match.utcDate) <= now
    && now - Date.parse(match.utcDate) <= freshnessWindowMs)
  .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

if (fixtures.length === 0) {
  console.log('No verified finished matches in the last 36 hours; keeping the existing news snapshot.');
  process.exit(0);
}

const normalizeName = (name: string) => name.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const canonicalName = (name: string) => normalizeName(localizeClub(name, 'zh-CN'));
const sameClub = (left: string, right: string) => normalizeName(left) === normalizeName(right)
  || canonicalName(left) === canonicalName(right);
function verifiedMatchStats(fixture: Fixture): MatchFact | null {
  if (!matchStatsFresh || !matchSnapshot) return null;
  const rows = matchSnapshot.leagues[fixture.league] || [];
  const fixtureTime = Date.parse(fixture.utcDate);
  const candidates = rows.filter(row => row.league === fixture.league
    && sameClub(row.home, fixture.home) && sameClub(row.away, fixture.away)
    && row.scoreHome === fixture.hs && row.scoreAway === fixture.as
    && (row.teamStatsVerified || row.advancedStatsVerified)
    && Number.isFinite(Date.parse(row.date || ''))
    && Math.abs(Date.parse(row.date!) - fixtureTime) <= 24 * 60 * 60 * 1000);
  return candidates.length === 1 ? candidates[0] : null;
}

function factBundle(fixture: Fixture, stats: MatchFact | null) {
  const sideStats = stats ? { home: stats.homeStats || {}, away: stats.awayStats || {} } : { home: {}, away: {} };
  const availableStats = statNames.flatMap(({ key, label, comparison }) => {
    const h = sideStats.home[key], a = sideStats.away[key];
    if (typeof h !== 'number' || typeof a !== 'number' || !Number.isFinite(h) || !Number.isFinite(a)) return [];
    return [{ key, label, home: h, away: a, comparison: comparison ? (h > a ? 'home' : h < a ? 'away' : 'equal') : 'none' }];
  });
  return {
    competition: localizeLeague(fixture.league, 'zh-CN'),
    date: new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeZone: 'Asia/Hong_Kong' }).format(new Date(fixture.utcDate)),
    home: localizeClub(fixture.home, 'zh-CN'), homeScore: fixture.hs,
    away: localizeClub(fixture.away, 'zh-CN'), awayScore: fixture.as,
    statisticsSource: stats ? 'PitchAPI match statistics; match joined by competition, teams, date and exact score' : null,
    statistics: availableStats,
  };
}

function fallbackArticle(fixture: Fixture, facts: ReturnType<typeof factBundle>): Pick<GeneratedArticle, 'title' | 'summary' | 'body'> {
  const { home, homeScore, away, awayScore, date, competition, statistics } = facts;
  const outcome = homeScore > awayScore ? `${home} 击败 ${away}`
    : homeScore < awayScore ? `${away} 击败 ${home}` : `${home} 与 ${away} 战平`;
  const statsLine = statistics.length
    ? `可核验数据：${statistics.map(row => `${row.label} ${home} ${row.home}${row.key === 'possession' || row.key === 'passAccuracy' ? '%' : ''}，${away} ${row.away}${row.key === 'possession' || row.key === 'passAccuracy' ? '%' : ''}`).join('；')}。`
    : '本次未能匹配到可核验的逐场技术统计，因此只报道赛果，不推断比赛过程。';
  return {
    title: `${competition}赛后速评：${outcome}`,
    summary: `${home} ${homeScore}–${awayScore} ${away}。${statistics.length ? '赛评数据仅采用已匹配的逐场统计。' : '目前仅有已核验比分。'}`,
    body: `${date}，${competition}：${home} ${homeScore}–${awayScore} ${away}。${outcome}。${statsLine}\n\n比分来源：Football-Data.org。${statistics.length ? '逐场统计来源：PitchAPI；按赛事、球队、日期和完全一致的比分匹配。' : ''}`,
  };
}

const key = process.env.DEEPSEEK_API_KEY?.trim();
async function writeReview(fixture: Fixture, facts: ReturnType<typeof factBundle>) {
  const fallback = fallbackArticle(fixture, facts);
  if (!key) return { ...fallback, aiGenerated: false };
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat', temperature: 0.15, max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '你是足球赛后数据编辑。只依据用户提供的比赛事实与逐场统计写中文赛评。比分来自已核验来源；技术统计只有在 statistics 非空时才可使用。不得补写进球过程、球员、战术、伤病、红黄牌、比赛转折或未提供的统计。只能比较明确给出的数值。不要添加任何事实或数字。返回 JSON，且只包含 title、summary、body 三个字符串字段。summary 一句话；body 两到四句，末尾保留数据来源说明。若逐场统计为空，明确说目前只能确认比分，不要假装有技术分析。' },
          { role: 'user', content: JSON.stringify(facts) },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);
    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const draft = JSON.parse(result.choices?.[0]?.message?.content || '{}') as { title?: string; summary?: string; body?: string };
    if (!draft.title?.trim() || !draft.summary?.trim() || !draft.body?.trim()) throw new Error('AI response omitted a required field.');
    const permittedNumbers = new Set(JSON.stringify(facts).match(/\d+(?:\.\d+)?/g) || []);
    const draftNumbers = `${draft.title}\n${draft.summary}\n${draft.body}`.match(/\d+(?:\.\d+)?/g) || [];
    if (draftNumbers.some(number => !permittedNumbers.has(number))) throw new Error('AI added an unverified numeric claim.');
    return { title: draft.title.trim(), summary: draft.summary.trim(), body: draft.body.trim(), aiGenerated: true };
  } catch (error) {
    console.warn(`AI review rejected for ${fixture.id}; keeping the verified factual fallback. ${String(error)}`);
    return { ...fallback, aiGenerated: false };
  }
}

const existingIds = new Set(history.articles.map(article => article.id));
const generated: GeneratedArticle[] = [];
for (const fixture of fixtures) {
  const id = `match-review-${createHash('sha256').update(fixture.id).digest('hex').slice(0, 12)}`;
  if (existingIds.has(id)) continue;
  const stats = verifiedMatchStats(fixture);
  const facts = factBundle(fixture, stats);
  const review = await writeReview(fixture, facts);
  generated.push({
    id, ...review, url: 'https://www.football-data.org/', publishedAt: new Date().toISOString(),
    category: '赛后速评', aiGenerated: review.aiGenerated, sourceMatchIds: [fixture.id],
    dataSources: [
      { label: 'Football-Data.org · fixture and final score', updatedAt: football.updatedAt, url: 'https://www.football-data.org/', recordId: fixture.id },
      ...(stats && matchSnapshot ? [{ label: 'PitchAPI · verified match statistics', updatedAt: matchSnapshot.updatedAt, url: 'https://pitchapi.dev/', recordId: stats.id }] : []),
    ],
  });
}

if (generated.length === 0) {
  console.log(`No new match reviews. ${fixtures.length} recent verified fixtures already have individual articles.`);
  process.exit(0);
}
const newlyCoveredMatchIds = new Set(generated.flatMap(article => article.sourceMatchIds));
const priorArticles = history.articles.filter(article => !(article.id.startsWith('match-results-')
  && article.sourceMatchIds?.length
  && article.sourceMatchIds.every(matchId => newlyCoveredMatchIds.has(matchId))));
const updated: ArticleFile = { articles: [...generated, ...priorArticles].slice(0, 60) };
await mkdir(dirname(articleFile), { recursive: true });
const temporary = `${articleFile}.tmp`;
await writeFile(temporary, JSON.stringify(updated, null, 2) + '\n', 'utf8');
await rename(temporary, articleFile);
console.log(`Drafted ${generated.length} individual match reviews from verified fixtures; ${generated.filter(item => item.aiGenerated).length} passed AI claim checks; ${generated.filter(item => item.sourceMatchIds.length && verifiedMatchStats(fixtures.find(f => f.id === item.sourceMatchIds[0])!)?.teamStatsVerified).length} matched PitchAPI match stats.`);
