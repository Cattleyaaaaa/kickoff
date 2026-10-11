type Pattern = 'bars' | 'tritone' | 'slash' | 'sash' | 'split' | 'hoops' | 'plain' | 'gradient' | 'center' | 'chest' | 'cross';

type ClubMark = {
  code: string;
  primary: string;
  accent: string;
  pattern: Pattern;
  trim: string;
};

const clubMarks = new Map<string, ClubMark>();

function addClub(aliases: string[], code: string, primary: string, accent: string, pattern: Pattern, trim = accent) {
  const mark = { code, primary, accent, pattern, trim };
  for (const alias of aliases) clubMarks.set(alias, mark);
}

// 2026/27 home-shirt cues. These are simplified CSS drawings without crests or sponsors.
// Official references: https://www.premierleague.com/en/news/4672981/premier-league-club-kits-for-202627-season
// https://www.mancity.com/news/club/new-puma-home-kit-gallery-63914855
// https://www.realmadrid.com/en-US/news/football/first-team/latest-news/asi-es-la-nueva-camiseta-para-la-temporada-2026-27-03-06-2026
// https://store.fcbarcelona.com/en-ws/pages/home-26-27
// https://www.psg.fr/en/content/actu_en_-paris-saint-germain-and-nike-unveil-the-2026-2027-psg-club-news-25-26
// https://www.bundesliga.com/de/bundesliga/news/neue-trikots-saison-2026-27-clubs-heim-auswarts-event-fanshop-37607
// https://ligue1.com/fr/articles/l1_article_5323-first-look-at-the-2026-27-ligue-1-mc-donald-s-kits
// https://www.legaseriea.it/serie-a/news/tutti-i-colori-della-serie-a-parte-1
// https://www.legaseriea.it/serie-a/news/tutti-i-colori-della-serie-a-parte-2
// An entry here overrides its earlier generic colour marker.

// Premier League
addClub(['MCI', '曼城', 'Manchester City', 'Man City'], 'MCI', '#8bd3ed', '#3e9ccc', 'gradient', '#18445f');
addClub(['ARS', '阿森纳', 'Arsenal'], 'ARS', '#db283b', '#f8f6ec', 'split', '#e9dbbe');
addClub(['LIV', '利物浦', 'Liverpool'], 'LIV', '#c52338', '#f7f2e8', 'plain');
addClub(['MUN', 'Man United', '曼联'], 'MUN', '#d92638', '#171b1c', 'plain');
addClub(['CHE', 'Chelsea', '切尔西'], 'CHE', '#174cbd', '#f4f6fa', 'plain');
addClub(['TOT', 'Tottenham', '托特纳姆热刺'], 'TOT', '#f8f8f2', '#263653', 'plain');
addClub(['NEW', 'Newcastle', '纽卡斯尔联'], 'NEW', '#222427', '#f7f7f0', 'bars');
addClub(['BHA', 'Brighton Hove', '布莱顿'], 'BHA', '#176cb8', '#f7f8f4', 'bars');
addClub(['BRE', 'Brentford', '布伦特福德'], 'BRE', '#d52c40', '#f8f6ed', 'bars');
addClub(['LEE', 'Leeds United', '利兹联'], 'LEE', '#f8f8ee', '#2356a3', 'plain', '#e7c947');
addClub(['EVE', 'Everton', '埃弗顿'], 'EVE', '#2353ae', '#f7f8f4', 'plain');
addClub(['HUL', 'Hull City', '赫尔城'], 'HUL', '#e6a23d', '#252629', 'bars');
addClub(['NFO', 'Nottingham', '诺丁汉森林'], 'NFO', '#cc263c', '#f7f4ec', 'plain');
addClub(['SUN', 'Sunderland', '桑德兰'], 'SUN', '#cd2638', '#fcf9f3', 'bars');
addClub(['CRY', 'Crystal Palace', '水晶宫'], 'CRY', '#2459b8', '#ca3543', 'bars');
addClub(['AVL', 'Aston Villa', '阿斯顿维拉'], 'AVL', '#83354e', '#9ad0e8', 'split');
addClub(['BOU', 'Bournemouth', '伯恩茅斯'], 'BOU', '#d33742', '#252427', 'bars');
addClub(['IPS', 'Ipswich Town', '伊普斯维奇'], 'IPS', '#2354ae', '#f7f7f0', 'plain');
addClub(['COV', 'Coventry City', '考文垂'], 'COV', '#69bde5', '#f7f8f2', 'plain');
addClub(['FUL', 'Fulham', '富勒姆'], 'FUL', '#f8f8f4', '#29292b', 'split');

// La Liga
addClub(['RMA', '皇家马德里', 'Real Madrid'], 'RMA', '#fbfaf5', '#1c4c42', 'plain', '#dd82aa');
addClub(['BAR', '巴塞罗那', 'Barcelona'], 'BAR', '#9f293f', '#245caa', 'tritone', '#172c58');
addClub(['ATM', 'Atleti', '马德里竞技'], 'ATM', '#d32d3d', '#fcf8f1', 'bars');
addClub(['BET', 'Real Betis', '皇家贝蒂斯'], 'BET', '#268854', '#f9faf3', 'bars');
addClub(['SEV', 'Sevilla FC', '塞维利亚'], 'SEV', '#faf9f3', '#d43c45', 'plain');
addClub(['ATH', 'Athletic', '毕尔巴鄂竞技'], 'ATH', '#c6273d', '#faf7f0', 'bars');
addClub(['VIL', 'Villarreal', '比利亚雷亚尔'], 'VIL', '#f5d437', '#2451a5', 'plain');
addClub(['Alavés'], 'ALA', '#2770b8', '#faf9f3', 'bars');
addClub(['Celta'], 'CEL', '#83c8e7', '#f8f7f2', 'plain');
addClub(['Deportivo'], 'DEP', '#2165b3', '#faf9f3', 'bars');
addClub(['Elche'], 'ELC', '#faf9f3', '#278452', 'chest');
addClub(['Espanyol', '西班牙人'], 'ESP', '#285dac', '#faf9f2', 'bars');
addClub(['Getafe'], 'GET', '#2453a5', '#f8f8f2', 'plain');
addClub(['Levante'], 'LEV', '#9a354a', '#233a72', 'bars');
addClub(['Málaga', '马拉加'], 'MAL', '#3c99c8', '#faf9f2', 'bars');
addClub(['Osasuna'], 'OSA', '#bf283a', '#20395a', 'plain');
addClub(['Rayo Vallecano'], 'RAY', '#faf9f3', '#d23642', 'sash');
addClub(['Real Sociedad'], 'RSO', '#2769ba', '#faf9f2', 'bars');
addClub(['Santander'], 'RAC', '#faf9f3', '#23805a', 'chest');
addClub(['Valencia'], 'VAL', '#faf9f3', '#24252a', 'plain');

// Serie A
addClub(['INT', '国际米兰', 'Inter Milan'], 'INT', '#1858ae', '#1b222b', 'bars');
addClub(['MIL', 'AC米兰', 'Milan'], 'MIL', '#c52b3b', '#222326', 'bars');
addClub(['JUV', 'Juventus', '尤文图斯'], 'JUV', '#f8f8f1', '#252628', 'bars');
addClub(['NAP', 'Napoli', '那不勒斯'], 'NAP', '#398ec9', '#f8f8f3', 'plain');
addClub(['ROM', 'Roma', '罗马'], 'ROM', '#8c2f38', '#dfa83e', 'plain');
addClub(['Atalanta'], 'ATA', '#2457ac', '#22252a', 'bars');
addClub(['Bologna'], 'BOL', '#bf2d3e', '#27365b', 'bars');
addClub(['Cagliari'], 'CAG', '#b72c3e', '#253763', 'split');
addClub(['Como 1907'], 'COM', '#2674b5', '#f7f7f0', 'plain');
addClub(['Fiorentina'], 'FIO', '#60429b', '#f7f6ef', 'plain');
addClub(['Frosinone'], 'FRO', '#f0cf3c', '#2753a1', 'plain');
addClub(['Genoa'], 'GEN', '#b92e42', '#243456', 'split');
addClub(['Lazio'], 'LAZ', '#80c4e5', '#f7f7f1', 'plain');
addClub(['Lecce'], 'LEC', '#d5ad33', '#b92e41', 'bars');
addClub(['Monza'], 'MON', '#d33b46', '#f7f6ef', 'center');
addClub(['Parma'], 'PAR', '#faf9f3', '#2b2d32', 'cross');
addClub(['Sassuolo'], 'SAS', '#238c61', '#232729', 'bars');
addClub(['Torino'], 'TOR', '#863746', '#f8f6ef', 'plain');
addClub(['Udinese'], 'UDI', '#f8f8f3', '#252629', 'bars');
addClub(['Venezia FC'], 'VEN', '#242729', '#ef9439', 'center', '#2d9b65');

// Bundesliga
addClub(['FCB', '拜仁慕尼黑', 'Bayern Munich'], 'FCB', '#cf2c3d', '#f8f7f0', 'plain');
addClub(['BVB', 'Dortmund', '多特蒙德'], 'BVB', '#f2d630', '#22252a', 'plain', '#f8f8ef');
addClub(['B04', 'Leverkusen', '勒沃库森'], 'B04', '#c22d3e', '#22252a', 'bars');
addClub(['RBL', 'RB Leipzig', '莱比锡'], 'RBL', '#f8f8f2', '#d13946', 'plain');
addClub(['1. FC Köln'], 'KOE', '#f8f8f2', '#d33640', 'plain');
addClub(['Augsburg'], 'FCA', '#cf3945', '#278454', 'bars');
addClub(['Bremen', '云达不来梅'], 'SVW', '#23825d', '#f3f7ee', 'plain');
addClub(['Elversberg'], 'ELV', '#24282b', '#e4d039', 'plain');
addClub(['Frankfurt'], 'SGE', '#c52d40', '#222326', 'bars');
addClub(['Freiburg'], 'SCF', '#c73243', '#22252a', 'bars');
addClub(['Hoffenheim'], 'TSG', '#276cb8', '#f5f8f2', 'plain');
addClub(['HSV'], 'HSV', '#f8f8f2', '#2852a1', 'plain');
addClub(["M'gladbach"], 'BMG', '#f7f8f2', '#252729', 'sash', '#298457');
addClub(['Mainz'], 'M05', '#d23643', '#f8f7f1', 'bars');
addClub(['SC Paderborn'], 'SCP', '#2861a9', '#242a37', 'bars');
addClub(['Schalke'], 'S04', '#2554aa', '#f7f8f2', 'plain');
addClub(['Stuttgart'], 'VFB', '#f8f8f2', '#d13c45', 'chest');
addClub(['Union Berlin'], 'FCU', '#ca2d3e', '#f7f7ef', 'plain');

// Ligue 1
addClub(['PSG', '巴黎圣日耳曼', 'Paris Saint-Germain'], 'PSG', '#2452a1', '#d33746', 'center', '#f8f8f1');
addClub(['OM', 'Marseille', '马赛'], 'OM', '#f8f9f4', '#55b3de', 'plain');
addClub(['OL', 'Olympique Lyon', '里昂'], 'OL', '#f8f8f3', '#d03d47', 'center', '#2561ad');
addClub(['ASM', 'Monaco', '摩纳哥'], 'ASM', '#fbf9f1', '#d13945', 'sash');
addClub(['RC Lens', '朗斯'], 'RCL', '#c93640', '#e7c13d', 'bars');
addClub(['Angers SCO'], 'ANG', '#f8f8f2', '#25272a', 'bars');
addClub(['Auxerre'], 'AJA', '#f8f8f2', '#2b5daa', 'plain');
addClub(['Brest'], 'BRE', '#cd3541', '#f8f7f1', 'plain');
addClub(['Le Havre'], 'HAC', '#74b9dd', '#263c6d', 'split');
addClub(['Le Mans'], 'LEM', '#d5b143', '#c33440', 'split');
addClub(['Lille'], 'LIL', '#c73442', '#24365e', 'plain');
addClub(['Lorient'], 'FCL', '#ea883d', '#222629', 'plain');
addClub(['Nice'], 'NIC', '#c33142', '#232528', 'bars');
addClub(['Paris FC'], 'PFC', '#294c90', '#69b1db', 'plain');
addClub(['Stade Rennais'], 'REN', '#c73140', '#24272b', 'plain');
addClub(['Strasbourg'], 'RCS', '#316ab7', '#f7f8f3', 'plain');
addClub(['Toulouse'], 'TFC', '#6d4a9b', '#f8f7f0', 'plain');
addClub(['Troyes'], 'EST', '#2f70b5', '#f7f8f2', 'plain');

// Champions League clubs outside the five domestic leagues
addClub(['Bodø/Glimt'], 'BOD', '#e9c938', '#24262a', 'plain');
addClub(['Club Brugge'], 'BRU', '#2866a9', '#22272b', 'bars');
addClub(['Fenerbahçe'], 'FEN', '#e9ca43', '#26365f', 'bars');
addClub(['Feyenoord'], 'FEY', '#d13743', '#f9f8f1', 'split');
addClub(['Galatasaray'], 'GAL', '#c52f3e', '#e5a537', 'split');
addClub(['LASK'], 'LASK', '#f8f8f2', '#27282a', 'bars');
addClub(['PAE AEK'], 'AEK', '#d7bd39', '#25272a', 'bars');
addClub(['Porto'], 'POR', '#2867b6', '#f9f8f3', 'bars');
addClub(['PSV'], 'PSV', '#cf3040', '#f9f8f2', 'bars');
addClub(['Sabah FK'], 'SAB', '#274b91', '#e9c844', 'plain');
addClub(['Shaktar', 'Shakhtar'], 'SHA', '#e28538', '#252729', 'bars');
addClub(['Sl. Bratislava'], 'SLO', '#7bbedd', '#f8f8f3', 'plain');
addClub(['Slavia Praha'], 'SLA', '#f8f8f2', '#cc3543', 'split');
addClub(['Sporting CP'], 'SPO', '#258557', '#f9f9f1', 'hoops');
addClub(['Viking'], 'VIK', '#c83441', '#232629', 'plain');

const fallbackColors = [
  ['#287c71', '#e7c86a'], ['#66479a', '#e7d8fc'], ['#a34b40', '#f5c873'],
  ['#285e9a', '#badfed'], ['#8a536d', '#f4d3d0'], ['#436a3a', '#dceca3'],
  ['#a1662c', '#f5d7a0'], ['#495a79', '#cfdaee'],
] as const;
const fallbackPatterns: Pattern[] = ['bars', 'sash', 'split', 'hoops', 'plain'];

function hashName(name: string) {
  let hash = 0;
  for (const character of name) hash = ((hash * 31) + character.codePointAt(0)!) >>> 0;
  return hash;
}

function shortCode(name: string) {
  if (/^[A-Z0-9]{2,4}$/.test(name)) return name;
  const words = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[A-Za-z]+/g);
  return words?.[0]?.slice(0, 3).toUpperCase() || name.slice(0, 2);
}

export function getClubMark(name: string, suppliedColor?: string, suppliedCode?: string): ClubMark {
  const known = clubMarks.get(name) || (suppliedCode ? clubMarks.get(suppliedCode) : undefined);
  if (known) return known;
  const hash = hashName(name);
  const [fallbackPrimary, fallbackAccent] = fallbackColors[hash % fallbackColors.length];
  return {
    code: shortCode(name),
    primary: suppliedColor && suppliedColor !== '#7377db' ? suppliedColor : fallbackPrimary,
    accent: fallbackAccent,
    pattern: fallbackPatterns[(hash >>> 3) % fallbackPatterns.length],
    trim: fallbackAccent,
  };
}
