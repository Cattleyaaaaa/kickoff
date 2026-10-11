export const competitions = [
  { code: 'PL', name: '英超' },
  { code: 'PD', name: '西甲' },
  { code: 'SA', name: '意甲' },
  { code: 'BL1', name: '德甲' },
  { code: 'FL1', name: '法甲' },
  { code: 'CL', name: '欧冠' },
];

export type ApiTeam = { id?: number; name?: string; shortName?: string; tla?: string };
export type ApiMatch = {
  id: number; status: string; utcDate: string;
  homeTeam: ApiTeam; awayTeam: ApiTeam;
  score?: { duration?: string; fullTime?: { home?: number | null; away?: number | null }; penalties?: { home?: number | null; away?: number | null } };
};
export type ApiMatchesResponse = { matches: ApiMatch[] };
export type ApiStandingsResponse = {
  season?: { startDate?: string; endDate?: string };
  standings: Array<{ type: string; group?: string; table?: Array<{
    position: number; team: ApiTeam; points: number; playedGames: number;
    won: number; draw: number; lost: number; goalDifference: number;
    goalsFor?: number | null; goalsAgainst?: number | null;
  }> }>;
};
export type MatchResult = {
  id: string; league: string; utcDate: string; home: string; away: string;
  hs: number; as: number; teamHome: string; teamAway: string; colors: [string, string];
  penalties?: { home: number; away: number };
};
export type FixtureResult = {
  id: string; league: string; utcDate: string; home: string; away: string;
  teamHome: string; teamAway: string; colors: [string, string];
  status: string; hs: number | null; as: number | null;
};
export type StandingGroup = {
  name: string;
  rows: Array<{ id: number | null; sourceName: string; code: string; pos: number; team: string; color: string; pts: number; p: number; w: number; d: number; l: number; gd: string; gf: number | null; ga: number | null }>;
};
export type StandingResult = { season: string; startDate?: string; endDate?: string; groups: StandingGroup[] };
export type FootballSnapshot = {
  source: 'football-data.org'; updatedAt: string;
  range: { from: string; to: string }; matches: MatchResult[];
  fixtures?: FixtureResult[];
  teamStatsSource?: { name: string; updatedAt: string };
  teamStats?: Record<string, Record<string, Partial<Record<'shots' | 'shotsPerGame' | 'shotsOnTarget' | 'possession' | 'passes' | 'passesCompleted' | 'keyPasses' | 'dribblesAttempted' | 'dribblesCompleted' | 'offsides' | 'fouls' | 'yellowCards' | 'redCards' | 'tackles' | 'interceptions' | 'clearances' | 'cleanSheets' | 'saves', number | null>>>>;
  standings: Record<string, StandingResult>;
};

const knownTeams = new Map([
  ['Arsenal FC', ['阿森纳', 'ARS', '#e34448']],
  ['Liverpool FC', ['利物浦', 'LIV', '#c93640']],
  ['Manchester City FC', ['曼城', 'MCI', '#54a8dc']],
  ['Real Madrid CF', ['皇家马德里', 'RMA', '#d6b652']],
  ['FC Barcelona', ['巴塞罗那', 'BAR', '#783e99']],
  ['FC Bayern München', ['拜仁慕尼黑', 'FCB', '#d64545']],
  ['Paris Saint-Germain FC', ['巴黎圣日耳曼', 'PSG', '#4b67b2']],
  ['FC Internazionale Milano', ['国际米兰', 'INT', '#3279bd']],
]);

function teamInfo(team: ApiTeam = {}) {
  const known = knownTeams.get(team.name);
  return {
    name: known?.[0] || team.shortName || team.name || 'Unknown team',
    code: known?.[1] || team.tla || String(team.id || '').slice(-3),
    color: known?.[2] || '#7377db',
  };
}

export function normalizeMatches(payload: ApiMatchesResponse, league: string): MatchResult[] {
  if (!Array.isArray(payload?.matches)) throw new Error(`${league}: missing matches array`);
  return payload.matches.flatMap(match => {
    const homeScore = match.score?.fullTime?.home;
    const awayScore = match.score?.fullTime?.away;
    if (match.status !== 'FINISHED' || !match.utcDate || !Number.isInteger(homeScore) || !Number.isInteger(awayScore)) return [];
    const home = teamInfo(match.homeTeam);
    const away = teamInfo(match.awayTeam);
    const shootout = match.score?.duration === 'PENALTY_SHOOTOUT' ? match.score.penalties : undefined;
    const penaltyHome = shootout?.home;
    const penaltyAway = shootout?.away;
    const hasShootout = Number.isInteger(penaltyHome) && Number.isInteger(penaltyAway)
      && penaltyHome! >= 0 && penaltyAway! >= 0 && homeScore! >= penaltyHome! && awayScore! >= penaltyAway!;
    return [{
      id: String(match.id), league, utcDate: match.utcDate,
      home: home.name, away: away.name,
      hs: hasShootout ? homeScore! - penaltyHome! : homeScore!,
      as: hasShootout ? awayScore! - penaltyAway! : awayScore!,
      ...(hasShootout ? { penalties: { home: penaltyHome!, away: penaltyAway! } } : {}),
      teamHome: home.code, teamAway: away.code, colors: [home.color, away.color],
    }];
  });
}

export function normalizeFixtures(payload: ApiMatchesResponse, league: string): FixtureResult[] {
  if (!Array.isArray(payload?.matches)) throw new Error(`${league}: missing fixtures array`);
  return payload.matches.flatMap(match => {
    if (!match.utcDate || !match.homeTeam?.name || !match.awayTeam?.name
      || ['CANCELLED', 'ABANDONED'].includes(match.status)) return [];
    const home = teamInfo(match.homeTeam);
    const away = teamInfo(match.awayTeam);
    return [{
      id: String(match.id), league, utcDate: match.utcDate,
      home: home.name, away: away.name,
      teamHome: home.code, teamAway: away.code,
      colors: [home.color, away.color] as [string, string],
      status: match.status,
      hs: Number.isInteger(match.score?.fullTime?.home) ? match.score!.fullTime!.home! : null,
      as: Number.isInteger(match.score?.fullTime?.away) ? match.score!.fullTime!.away! : null,
    }];
  });
}

export function normalizeStandings(payload: ApiStandingsResponse, league: string): StandingResult {
  if (!Array.isArray(payload?.standings)) throw new Error(`${league}: missing standings array`);
  const seasonStart = payload.season?.startDate?.slice(0, 4);
  const seasonEnd = payload.season?.endDate?.slice(2, 4);
  const groups = payload.standings.filter(group => group.type === 'TOTAL').map(group => ({
    name: group.group || '',
    rows: (group.table || []).map(entry => {
      const team = teamInfo(entry.team);
      return {
        id: entry.team.id ?? null, sourceName: entry.team.name || team.name, code: team.code, pos: entry.position, team: team.name, color: team.color,
        pts: entry.points, p: entry.playedGames, w: entry.won,
        d: entry.draw, l: entry.lost,
        gd: entry.goalDifference > 0 ? `+${entry.goalDifference}` : String(entry.goalDifference ?? 0),
        gf: Number.isInteger(entry.goalsFor) ? entry.goalsFor! : null,
        ga: Number.isInteger(entry.goalsAgainst) ? entry.goalsAgainst! : null,
      };
    }),
  })).filter(group => group.rows.length);
  return {
    season: seasonStart && seasonEnd ? `${seasonStart} / ${seasonEnd}` : '',
    startDate: payload.season?.startDate,
    endDate: payload.season?.endDate,
    groups,
  };
}
