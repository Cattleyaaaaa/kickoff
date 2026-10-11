export type PlayerStat = {
  id: string;
  name: string;
  localizedNames?: Partial<Record<'zh-CN' | 'zh-TW' | 'en', string>>;
  team: string;
  goals: number;
  assists: number | null;
  penaltyGoals?: number | null;
  shots?: number | null;
  shotsOnTarget?: number | null;
  passes?: number | null;
  passesCompleted?: number | null;
  keyPasses?: number | null;
  dribblesAttempted?: number | null;
  dribblesCompleted?: number | null;
  offsides?: number | null;
  fouls?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  tackles?: number | null;
  interceptions?: number | null;
  clearances?: number | null;
  cleanSheets?: number | null;
  saves?: number | null;
  appearances: number | null;
  position: string | null;
  nationality: string | null;
};

export type PlayerLeague = { season: string; players: PlayerStat[] };
export type PlayerStatsSnapshot = {
  schemaVersion: 2;
  source: 'goal-api.com';
  verification?: 'provider-only' | 'independently-verified';
  updatedAt: string;
  leagues: Record<string, PlayerLeague>;
};

export type ApiTopScorer = {
  id?: string;
  leagueId?: string | null;
  season?: string | null;
  playerId?: string | null;
  playerName?: string | null;
  teamName?: string | null;
  goals?: string | number | null;
  assists?: string | number | null;
  penaltyGoals?: string | number | null;
  appearances?: string | number | null;
  shots?: string | number | null;
  shotsOnTarget?: string | number | null;
  passes?: string | number | null;
  passesCompleted?: string | number | null;
  keyPasses?: string | number | null;
  dribblesAttempted?: string | number | null;
  dribblesCompleted?: string | number | null;
  offsides?: string | number | null;
  fouls?: string | number | null;
  yellowCards?: string | number | null;
  redCards?: string | number | null;
  tackles?: string | number | null;
  interceptions?: string | number | null;
  clearances?: string | number | null;
  cleanSheets?: string | number | null;
  saves?: string | number | null;
  position?: string | null;
  nationality?: string | null;
};

function nonNegativeInteger(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

export function normalizeTopScorers(rows: ApiTopScorer[]): PlayerStat[] {
  if (!Array.isArray(rows)) throw new Error('Top scorers response has no data array');
  const seen = new Set<string>();
  return rows.flatMap(row => {
    const name = row.playerName?.trim();
    const team = row.teamName?.trim();
    const goals = nonNegativeInteger(row.goals);
    if (!name || !team || goals === null) return [];
    const key = `${name.toLocaleLowerCase()}|${team.toLocaleLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const optional = (field: keyof ApiTopScorer, output: keyof PlayerStat) => {
      const value = nonNegativeInteger(row[field] as string | number | null | undefined);
      return value === null ? {} : { [output]: value };
    };
    return [{
      id: row.playerId || row.id || key,
      name,
      team,
      goals,
      assists: nonNegativeInteger(row.assists),
      ...optional('penaltyGoals', 'penaltyGoals'),
      ...optional('shots', 'shots'),
      ...optional('shotsOnTarget', 'shotsOnTarget'),
      ...optional('passes', 'passes'),
      ...optional('passesCompleted', 'passesCompleted'),
      ...optional('keyPasses', 'keyPasses'),
      ...optional('dribblesAttempted', 'dribblesAttempted'),
      ...optional('dribblesCompleted', 'dribblesCompleted'),
      ...optional('offsides', 'offsides'),
      ...optional('fouls', 'fouls'),
      ...optional('yellowCards', 'yellowCards'),
      ...optional('redCards', 'redCards'),
      ...optional('tackles', 'tackles'),
      ...optional('interceptions', 'interceptions'),
      ...optional('clearances', 'clearances'),
      ...optional('cleanSheets', 'cleanSheets'),
      ...optional('saves', 'saves'),
      appearances: nonNegativeInteger(row.appearances),
      position: row.position?.trim() || null,
      nationality: row.nationality?.trim() || null,
    }];
  });
}

export function isPlayerStatsSnapshot(value: unknown): value is PlayerStatsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<PlayerStatsSnapshot>;
  return data.schemaVersion === 2 && data.source === 'goal-api.com' && typeof data.updatedAt === 'string'
    && !!data.leagues && typeof data.leagues === 'object'
    && Object.values(data.leagues).every(league => !!league && typeof league.season === 'string' && Array.isArray(league.players));
}

// A provider response alone does not prove that its current-season totals are accurate.
// Older snapshots without this field also stay out of the published player leaderboard.
export function isPublishablePlayerStatsSnapshot(value: unknown): value is PlayerStatsSnapshot {
  return isPlayerStatsSnapshot(value) && value.verification === 'independently-verified';
}
