import type { PlayerStat } from '../scripts/player-transform';
import type { StandingGroup } from '../scripts/football-transform';

export type MetricKey = 'goals' | 'goalsAgainst' | 'shots' | 'shotsOnTarget' | 'shotAccuracy' | 'goalConversion'
  | 'assists' | 'penaltyGoals' | 'shotsPerGame' | 'possession' | 'passes' | 'passesCompleted' | 'passAccuracy' | 'keyPasses'
  | 'dribblesAttempted' | 'dribblesCompleted' | 'dribbleSuccessRate' | 'offsides' | 'fouls'
  | 'yellowCards' | 'redCards' | 'tackles' | 'interceptions' | 'clearances' | 'cleanSheets'
  | 'saves' | 'appearances';
export type MetricCategory = 'attack' | 'passing' | 'dribbling' | 'defending' | 'discipline';
export const metricCategories: Record<MetricCategory, [string, string, string]> = {
  attack: ['进攻', '進攻', 'Attack'], passing: ['传控', '傳控', 'Passing'],
  dribbling: ['突破', '突破', 'Dribbling'], defending: ['防守', '防守', 'Defending'],
  discipline: ['纪律', '紀律', 'Discipline'],
};
export const metricLabels: Record<MetricKey, [string, string, string]> = {
  goals: ['进球', '入球', 'Goals'], goalsAgainst: ['失球', '失球', 'Goals conceded'],
  shots: ['射门', '射門', 'Shots'], shotsOnTarget: ['射正', '射正', 'Shots on target'],
  shotAccuracy: ['射正率', '射正率', 'Shot accuracy'], goalConversion: ['射门转化率', '射門轉化率', 'Goal conversion'],
  assists: ['助攻', '助攻', 'Assists'], possession: ['控球率', '控球率', 'Possession'],
  penaltyGoals: ['点球进球', '點球入球', 'Penalty goals'], shotsPerGame: ['场均射门', '場均射門', 'Shots per game'],
  passes: ['传球', '傳球', 'Passes'], passesCompleted: ['成功传球', '成功傳球', 'Completed passes'],
  passAccuracy: ['传球成功率', '傳球成功率', 'Pass accuracy'], keyPasses: ['关键传球', '關鍵傳球', 'Key passes'],
  dribblesAttempted: ['尝试过人', '嘗試過人', 'Dribbles attempted'],
  dribblesCompleted: ['过人成功', '過人成功', 'Successful dribbles'],
  dribbleSuccessRate: ['过人成功率', '過人成功率', 'Dribble success'],
  offsides: ['越位', '越位', 'Offsides'], fouls: ['犯规', '犯規', 'Fouls'],
  yellowCards: ['黄牌', '黃牌', 'Yellow cards'], redCards: ['红牌', '紅牌', 'Red cards'],
  tackles: ['抢断', '搶斷', 'Tackles'], interceptions: ['拦截', '攔截', 'Interceptions'],
  clearances: ['解围', '解圍', 'Clearances'], cleanSheets: ['零封', '零封', 'Clean sheets'],
  saves: ['扑救', '撲救', 'Saves'], appearances: ['出场', '出場', 'Appearances'],
};
export const teamMetricGroups: Record<MetricCategory, MetricKey[]> = {
  attack: ['goals', 'goalsAgainst', 'shots', 'shotsPerGame', 'shotsOnTarget', 'shotAccuracy', 'goalConversion'],
  passing: ['possession', 'passes', 'passesCompleted', 'passAccuracy', 'keyPasses'],
  dribbling: ['dribblesAttempted', 'dribblesCompleted', 'dribbleSuccessRate'],
  defending: ['tackles', 'interceptions', 'clearances', 'cleanSheets', 'saves'],
  discipline: ['yellowCards', 'redCards', 'fouls', 'offsides'],
};
export const playerMetricGroups: Record<MetricCategory, MetricKey[]> = {
  attack: ['appearances', 'goals', 'assists', 'penaltyGoals', 'shots', 'shotsOnTarget', 'shotAccuracy', 'goalConversion'],
  passing: ['passes', 'passesCompleted', 'passAccuracy', 'keyPasses'],
  dribbling: ['dribblesAttempted', 'dribblesCompleted', 'dribbleSuccessRate'],
  defending: ['tackles', 'interceptions', 'clearances', 'cleanSheets', 'saves'],
  discipline: ['yellowCards', 'redCards', 'fouls', 'offsides'],
};
export type MetricValues = Partial<Record<MetricKey, number | null>>;
export const percentageMetrics = new Set<MetricKey>(['shotAccuracy', 'goalConversion', 'possession', 'passAccuracy', 'dribbleSuccessRate']);
export function validMetric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export function rate(numerator: unknown, denominator: unknown): number | null {
  const n = validMetric(numerator), d = validMetric(denominator);
  return n !== null && d !== null && d > 0 && n <= d ? Math.round(n / d * 1000) / 10 : null;
}
export function metricValue(values: MetricValues, key: MetricKey): number | null {
  if (key === 'shotAccuracy') return rate(values.shotsOnTarget, values.shots);
  if (key === 'goalConversion') return rate(values.goals, values.shots);
  if (key === 'passAccuracy') return rate(values.passesCompleted, values.passes);
  if (key === 'dribbleSuccessRate') return rate(values.dribblesCompleted, values.dribblesAttempted);
  return validMetric(values[key]);
}
export function teamValues(row: StandingGroup['rows'][number], advanced?: MetricValues): MetricValues {
  return { ...advanced, goals: row.gf, goalsAgainst: row.ga };
}
export function playerValues(player: PlayerStat): MetricValues {
  return { ...player, goals: player.goals };
}
