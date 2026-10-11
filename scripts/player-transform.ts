export type PlayerStat = {
  id: string;
  name: string;
  team: string;
  goals: number;
  assists: number | null;
  appearances: number | null;
  position: string | null;
  nationality: string | null;
};

export type PlayerLeague = { season: string; players: PlayerStat[] };
export type PlayerStatsSnapshot = {
  source: 'goal-api.com';
  updatedAt: string;
  leagues: Record<string, PlayerLeague>;
};

export type ApiTopScorer = {
  id?: string;
  playerId?: string | null;
  playerName?: string | null;
  teamName?: string | null;
  goals?: string | number | null;
  assists?: string | number | null;
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
    return [{
      id: row.playerId || row.id || key,
      name,
      team,
      goals,
      assists: nonNegativeInteger(row.assists),
      appearances: null,
      position: null,
      nationality: null,
    }];
  });
}

export function isPlayerStatsSnapshot(value: unknown): value is PlayerStatsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<PlayerStatsSnapshot>;
  return data.source === 'goal-api.com' && typeof data.updatedAt === 'string'
    && !!data.leagues && typeof data.leagues === 'object'
    && Object.values(data.leagues).every(league => !!league && typeof league.season === 'string' && Array.isArray(league.players));
}
