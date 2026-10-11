export type Zone = 'champions' | 'championsQualifying' | 'europePending' | 'europa' | 'conference' | 'relegationPlayoff' | 'relegation' | 'roundOf16' | 'knockoutPlayoff' | 'eliminated';

type Range = { from: number; to: number; zone: Zone };
type DomesticRule = { teams: number; ranges: Range[] };

// Each competition has its own base allocation. European positions remain a
// projection until domestic cups and UEFA's extra places have been settled.
const domesticRules: Record<string, DomesticRule> = {
  '英超': { teams: 20, ranges: [
    { from: 1, to: 4, zone: 'champions' }, { from: 5, to: 5, zone: 'europePending' },
    { from: 18, to: 20, zone: 'relegation' },
  ] },
  '西甲': { teams: 20, ranges: [
    { from: 1, to: 4, zone: 'champions' }, { from: 5, to: 5, zone: 'europa' },
    { from: 6, to: 6, zone: 'conference' }, { from: 18, to: 20, zone: 'relegation' },
  ] },
  '意甲': { teams: 20, ranges: [
    { from: 1, to: 4, zone: 'champions' }, { from: 5, to: 5, zone: 'europa' },
    { from: 6, to: 6, zone: 'conference' }, { from: 18, to: 20, zone: 'relegation' },
  ] },
  '德甲': { teams: 18, ranges: [
    { from: 1, to: 4, zone: 'champions' }, { from: 5, to: 5, zone: 'europa' },
    { from: 6, to: 6, zone: 'conference' }, { from: 16, to: 16, zone: 'relegationPlayoff' },
    { from: 17, to: 18, zone: 'relegation' },
  ] },
  '法甲': { teams: 18, ranges: [
    { from: 1, to: 3, zone: 'champions' }, { from: 4, to: 4, zone: 'championsQualifying' },
    { from: 5, to: 5, zone: 'europa' }, { from: 6, to: 6, zone: 'conference' },
    { from: 16, to: 16, zone: 'relegationPlayoff' }, { from: 17, to: 18, zone: 'relegation' },
  ] },
};

export function zoneForPosition(league: string, position: number, teamCount: number): Zone | null {
  if (!Number.isInteger(position) || position < 1 || position > teamCount) return null;
  if (league === '欧冠') {
    if (teamCount !== 36) return null;
    return position <= 8 ? 'roundOf16' : position <= 24 ? 'knockoutPlayoff' : 'eliminated';
  }
  const rule = domesticRules[league];
  if (!rule || teamCount !== rule.teams) return null;
  return rule.ranges.find(range => position >= range.from && position <= range.to)?.zone ?? null;
}

export const zoneLabels: Record<Zone, [string, string, string]> = {
  champions: ['欧冠区', '歐冠區', 'Champions League'],
  championsQualifying: ['欧冠资格赛区', '歐冠資格賽區', 'Champions League qualifying'],
  europePending: ['欧冠 / 欧联待定', '歐冠 / 歐霸待定', 'UCL / Europa pending'],
  europa: ['欧联候选', '歐霸候選', 'Europa candidate'],
  conference: ['欧协杯候选', '歐協聯候選', 'Conference candidate'],
  relegationPlayoff: ['升降级附加赛区', '升降級附加賽區', 'Relegation play-off'],
  relegation: ['降级区', '降級區', 'Relegation'],
  roundOf16: ['直通十六强', '直通十六強', 'Round of 16'],
  knockoutPlayoff: ['淘汰赛附加赛', '淘汰賽附加賽', 'Knockout play-off'],
  eliminated: ['出局区', '出局區', 'Eliminated'],
};

export function legendZones(league: string): Zone[] {
  if (league === '欧冠') return ['roundOf16', 'knockoutPlayoff', 'eliminated'];
  return [...new Set(domesticRules[league]?.ranges.map(range => range.zone) || [])];
}

export const zoneRuleSources: Record<string, string> = {
  '英超': 'https://www.premierleague.com/en/european-qualification-explained',
  '西甲': 'https://www.laliga.com/laliga-easports/clasificacion',
  '意甲': 'https://www.legaseriea.it/serie-a/news/scenari-nella-corsa-all-europa',
  '德甲': 'https://www.bundesliga.com/en/bundesliga/news/how-many-bundesliga-teams-can-qualify-for-europe-19689',
  '法甲': 'https://ligue1.com/en/articles/l1_article_5194-europe-what-has-changed-after-lens-coupe-de-france-win',
  '欧冠': 'https://www.uefa.com/uefachampionsleague/news/0291-1bd88ae04870-e1e038c319e3-1000--champions-league-league-phase-standings-how-teams-level-on-/',
};

export const zoneExplanations: Record<string, [string, string, string]> = {
  '英超': ['英超没有升降级附加赛：第 18–20 名直接降级。第 5 名欧冠或欧联资格待定；欧协杯先由联赛杯冠军取得，不能固定标给第 6 名。', '英超沒有升降級附加賽：第 18–20 名直接降級。第 5 名歐冠或歐霸資格待定；歐協聯先由聯賽盃冠軍取得，不能固定標給第 6 名。', 'No relegation play-off: 18–20 go down. Fifth depends on the UEFA extra spot; the EFL Cup winner holds the Conference route, so sixth is not fixed.'],
  '西甲': ['西甲按当前常规席位示意；国王杯结果及 UEFA 额外名额可能改变欧战区间。', '西甲按目前常規席位示意；國王盃結果及 UEFA 額外名額可能改變歐戰區間。', 'Standard league places; the domestic cup and UEFA extra spots can change European zones.'],
  '意甲': ['意甲按基础联赛席位示意；意大利杯结果可能使欧联和欧协杯席位顺延。', '意甲按基礎聯賽席位示意；意大利盃結果可能使歐霸及歐協聯席位順延。', 'Baseline league places; the Coppa Italia can move Europa and Conference places.'],
  '德甲': ['德甲第 16 名参加升降级附加赛；德国杯结果可能改变欧联及欧协杯名次。', '德甲第 16 名參加升降級附加賽；德國盃結果可能改變歐霸及歐協聯名次。', '16th enters the relegation play-off; the DFB Cup can move European places.'],
  '法甲': ['法甲第 4 名进入欧冠资格赛、第 16 名参加升降级附加赛；法国杯结果可能改变欧战名次。', '法甲第 4 名進入歐冠資格賽、第 16 名參加升降級附加賽；法國盃結果可能改變歐戰名次。', '4th enters UCL qualifying, 16th the relegation play-off; the Coupe de France can move European places.'],
  '欧冠': ['欧冠联赛阶段：前 8 名直通十六强，9–24 名参加淘汰赛附加赛，25–36 名出局。', '歐冠聯賽階段：前 8 名直通十六強，9–24 名參加淘汰賽附加賽，25–36 名出局。', 'League phase: 1–8 reach the round of 16, 9–24 enter play-offs, 25–36 are eliminated.'],
};
