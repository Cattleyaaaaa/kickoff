import type { MetricValues } from './metricCatalog';

export type AdvancedStatsSnapshot = {
  source: 'pitchapi.dev';
  schemaVersion: 1;
  updatedAt: string;
  season: string;
  requestCount: number;
  leagues: Record<string, {
    season: string;
    finishedMatches: number;
    teamStatsMatches: number;
    playerStatsMatches: number;
    advancedTeamMatches: number;
    advancedPlayerMatches: number;
    teams: Array<{ id: string; name: string; games: number; values: MetricValues }>;
    players: Array<{ id: string; name: string; team: string; position: string | null; appearances: number; values: MetricValues }>;
  }>;
};

export function isAdvancedStatsSnapshot(value: unknown): value is AdvancedStatsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<AdvancedStatsSnapshot>;
  return snapshot.source === 'pitchapi.dev' && snapshot.schemaVersion === 1
    && typeof snapshot.updatedAt === 'string' && typeof snapshot.season === 'string'
    && !!snapshot.leagues && typeof snapshot.leagues === 'object'
    && Object.values(snapshot.leagues).every(league => !!league
      && typeof league.finishedMatches === 'number'
      && Array.isArray(league.teams) && Array.isArray(league.players));
}
