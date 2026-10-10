const teams = [
  { name: '阿森纳', en: 'Arsenal', color: '#e34448', short: 'ARS', league: '英超' },
  { name: '利物浦', en: 'Liverpool', color: '#c93640', short: 'LIV', league: '英超' },
  { name: '曼城', en: 'Man City', color: '#54a8dc', short: 'MCI', league: '英超' },
  { name: '皇家马德里', en: 'Real Madrid', color: '#d6b652', short: 'RMA', league: '西甲' },
  { name: '巴塞罗那', en: 'Barcelona', color: '#783e99', short: 'BAR', league: '西甲' },
  { name: '拜仁慕尼黑', en: 'Bayern', color: '#d64545', short: 'FCB', league: '德甲' },
  { name: '巴黎圣日耳曼', en: 'PSG', color: '#4b67b2', short: 'PSG', league: '法甲' },
  { name: '国际米兰', en: 'Inter', color: '#3279bd', short: 'INT', league: '意甲' },
];

const articles = [
  {
    league: '英超 · 赛前看点', time: '18 分钟前', source: 'Kickoff 编辑部', topic: '焦点比赛', read: 5, visual: 'feature',
    title: ['周末焦点战前瞻：攻防节奏，可能决定比赛走向', '週末焦點戰前瞻：攻防節奏，可能決定比賽走向', 'Weekend preview: the tempo battle that could decide the match'],
    summary: ['两支球队都擅长快速推进，中场争夺和边路保护将成为关键。来看看数据如何描绘这场对决。', '兩支球隊都擅長快速推進，中場爭奪和邊路保護將成為關鍵。看看數據如何描繪這場對決。', 'Both sides like to move the ball quickly. Midfield control and protection out wide could shape the result.'],
  },
  {
    league: '欧冠 · 数据观察', time: '42 分钟前', source: 'Kickoff 数据组', topic: '战术分析', read: 4, visual: 'violet',
    title: ['欧冠淘汰赛观察：高位压迫如何改变出球选择', '歐冠淘汰賽觀察：高位壓迫如何改變出球選擇', 'Champions League watch: how a high press changes the build-up'],
    summary: ['从控球区域到向前传球比例，用一组比赛指标读懂淘汰赛里的战术取舍。', '從控球區域到向前傳球比例，用一組比賽指標讀懂淘汰賽中的戰術取捨。', 'From possession zones to forward-pass rate, a few match metrics reveal the tactical trade-offs.'],
  },
  {
    league: '西甲 · 球队动态', time: '1 小时前', source: 'Kickoff 快讯', topic: '赛程速览', read: 3, visual: 'blue',
    title: ['本轮赛程与积分形势：每一分都值得关注', '本輪賽程與積分形勢：每一分都值得關注', 'The fixtures and table picture: every point matters'],
    summary: ['整理本轮关键场次、开球时间与当前积分变化，方便你快速跟进争冠与保级形势。', '整理本輪關鍵場次、開賽時間與目前積分變化，方便你快速掌握爭冠與護級形勢。', 'A quick guide to key fixtures, kick-off times and the latest shape of the title and relegation races.'],
  },
];

const extraStories = [
  {
    id: 'transfer-watch', league: '英超 · 转会观察', time: '', source: 'Kickoff 编辑部', topic: '转会观察', read: 4, visual: 'amber', label: ['转会观察', '轉會觀察', 'Transfers'],
    title: ['从传闻到官宣：一笔转会到底要经过哪些步骤？', '從傳聞到官宣：一筆轉會到底要經過哪些步驟？', 'From rumour to announcement: how a transfer happens'],
    summary: ['接触、报价、个人条款、体检与注册，梳理转会报道中的关键节点。看懂消息进展，也分清媒体推测与俱乐部确认。', '接觸、報價、個人條款、體檢與註冊，梳理轉會報道中的關鍵節點。看懂消息進展，也分清媒體推測與球會確認。', 'Talks, offers, personal terms, medicals and registration: understand the stages of a deal and distinguish speculation from club confirmation.'],
  },
  {
    id: 'squad-notebook', league: '德甲 · 伤停观察', time: '', source: 'Kickoff 数据组', topic: '伤停观察', read: 3, visual: 'blue', label: ['阵容观察', '陣容觀察', 'Squad notes'],
    title: ['回归训练不等于马上首发：读懂赛前阵容消息', '回歸訓練不等於馬上正選：讀懂賽前陣容消息', 'Back in training, but ready to start? Reading squad news'],
    summary: ['个人训练、合练和进入比赛名单代表不同阶段。关注教练发布会与官方名单，理解伤停和轮换如何影响球队的比赛计划。', '個人訓練、合練和進入比賽名單代表不同階段。關注教練發佈會與官方名單，理解傷停和輪換如何影響球隊的比賽計劃。', 'Individual work, team training and a place in the matchday squad mean different things. Follow official updates to understand availability and rotation.'],
  },
  {
    id: 'terrace-stories', league: '意甲 · 球场故事', time: '', source: 'Kickoff 编辑部', topic: '球场故事', read: 5, visual: 'coral', label: ['球场故事', '球場故事', 'Fan culture'],
    title: ['九十分钟之外：球迷为什么把看台叫作主场？', '九十分鐘之外：球迷為甚麼把看台叫作主場？', 'Beyond ninety minutes: what makes a ground feel like home?'],
    summary: ['一首队歌、一条围巾和每次比赛前的固定仪式，共同构成球迷的归属感。从看台文化开始，发现足球的另一面。', '一首隊歌、一條圍巾和每次比賽前的固定儀式，共同構成球迷的歸屬感。從看台文化開始，發現足球的另一面。', 'Songs, scarves and familiar matchday rituals give supporters a sense of belonging. Explore the game through the culture of the stands.'],
  },
];
articles.push(...extraStories);

const results = [
  { home: '曼城', away: '阿森纳', hs: 2, as: 1, league: '英超', date: '10月08日', teamHome: 'MCI', teamAway: 'ARS', colors: ['#54a8dc', '#e34448'] },
  { home: '国际米兰', away: 'AC米兰', hs: 1, as: 1, league: '意甲', date: '10月07日', teamHome: 'INT', teamAway: 'MIL', colors: ['#3279bd', '#bf424c'] },
  { home: '巴塞罗那', away: '马德里竞技', hs: 3, as: 2, league: '西甲', date: '10月06日', teamHome: 'BAR', teamAway: 'ATM', colors: ['#783e99', '#d4464a'] },
  { home: '拜仁慕尼黑', away: '多特蒙德', hs: 2, as: 0, league: '德甲', date: '10月05日', teamHome: 'FCB', teamAway: 'BVB', colors: ['#d64545', '#d8ad3d'] },
];

const tableRows = [
  { pos: 1, team: '阿森纳', pts: 18, p: 7, w: 6, d: 0, l: 1, gd: '+12', color: '#e34448' },
  { pos: 2, team: '曼城', pts: 16, p: 7, w: 5, d: 1, l: 1, gd: '+10', color: '#54a8dc' },
  { pos: 3, team: '利物浦', pts: 15, p: 7, w: 5, d: 0, l: 2, gd: '+8', color: '#c93640' },
  { pos: 4, team: '阿斯顿维拉', pts: 14, p: 7, w: 4, d: 2, l: 1, gd: '+6', color: '#936249' },
  { pos: 5, team: '热刺', pts: 13, p: 7, w: 4, d: 1, l: 2, gd: '+5', color: '#535e78' },
];
const playerLeaders = [
  { name: '埃尔林·哈兰德', en: 'Erling Haaland', position: '前锋', enPosition: 'Forward', team: '曼城', enTeam: 'Man City', nationality: '🇳🇴', apps: 7, goals: 8, assists: 2, color: '#54a8dc' },
  { name: '穆罕默德·萨拉赫', en: 'Mohamed Salah', position: '前锋', enPosition: 'Forward', team: '利物浦', enTeam: 'Liverpool', nationality: '🇪🇬', apps: 7, goals: 6, assists: 4, color: '#c93640' },
  { name: '布卡约·萨卡', en: 'Bukayo Saka', position: '边锋', enPosition: 'Winger', team: '阿森纳', enTeam: 'Arsenal', nationality: '🏴', apps: 6, goals: 4, assists: 3, color: '#e34448' },
  { name: '裘德·贝林厄姆', en: 'Jude Bellingham', position: '中场', enPosition: 'Midfielder', team: '皇家马德里', enTeam: 'Real Madrid', nationality: '🏴', apps: 7, goals: 5, assists: 2, color: '#d6b652' },
];

const discussions = [
  { initials: 'JY', name: 'JellyYellow', team: ['阿森纳球迷', '阿森納球迷', 'Arsenal fan'], color: 'orange', text: ['这场中场的对抗强度会不会是胜负手？我觉得边后卫的站位也很关键。', '這場中場的對抗強度會不會是勝負手？我覺得邊後衛的站位也很關鍵。', 'Could the midfield battle decide this one? The full-back positioning matters too.'], likes: 284, replies: 46, tag: ['英超 · 赛前看点', '英超 · 賽前看點', 'Premier League · Preview'] },
  { initials: 'MK', name: 'Mika_90', team: ['中立观赛', '中立觀賽', 'Neutral fan'], color: 'purple', text: ['把这两队最近五场的射门转化率放一起看，差别还挺明显的。', '把這兩隊最近五場的射門轉化率放一起看，差別還挺明顯的。', 'The gap in shot conversion across their last five games is pretty striking.'], likes: 193, replies: 28, tag: ['数据讨论', '數據討論', 'Data talk'] },
  { initials: 'AL', name: 'AzzurriLife', team: ['意甲球迷', '意甲球迷', 'Serie A fan'], color: 'green', text: ['德比踢成平局也很合理，最后十五分钟双方都不想冒险。', '德比踢成平局也很合理，最後十五分鐘雙方都不想冒險。', 'A draw in the derby made sense. Neither side wanted to take a big risk late on.'], likes: 117, replies: 19, tag: ['意甲 · 赛后', '意甲 · 賽後', 'Serie A · Full-time'] },
];

const words = {
  'zh-CN': {
    nav: ['首页', '新闻', '比赛', '积分榜', '球队', '球员'], tagline: '为每份热爱，找到同频球迷', sub: '全球赛场 · 每日更新', today: '球迷主场', daily: '每日更新',
    headline1: '为每份热爱，', headline2: '找到同频球迷', headSub: '最新资讯、赛后赛果、球队故事和球迷观点。无论你支持谁，这里都有同一份热爱。', discover: '看看今天的足球', choose: '选择球队',
    latest: '最新新闻', latestSub: '全球赛场，一手跟进', allNews: '全部新闻', moreStory: '更多足球故事', all: '全部赛事', read: '分钟阅读', results: '近期赛果', resultsSub: '最近 7 天 · 赛后结果', schedule: '赛程与赛果', sevenDays: '最近 7 天',
    dynamics: '球队动态', dynamicsSub: '跟进你关心的每一次出场', noTeams: '暂时没有关注球队', popular: '热门球队正在发生什么', hot: '热门讨论', hotSub: '球迷正在聊什么', pick: '挑选你的主队',
    language: '语言', theme: '切换主题', search: '搜索球队、球员、新闻、比赛', searchTitle: '全站搜索', filters: ['全部', '新闻', '球队', '球员', '比赛'], noSearch: '没有找到相关内容', searchTip: '试试搜索“阿森纳”、“欧冠”或“赛前分析”', allDates: '全部日期',
    chooseTitle: '选择你关注的球队', chooseNote: '之后可在球队动态中优先看到它们。你可以先跳过，稍后再选。', skip: '暂时跳过', save: '保存关注', source: '来源', demo: '赛果示例 · 连接足球数据 API 后替换示例内容。',
    footer: '好球值得分享。好观点，值得被听见。', local: '关注列表保存在当前设备，之后可随登录功能同步。', scoreAll: '全部赛事', scoreFollowing: '关注球队', searchLabel: '搜索', openSearch: '搜索', close: '关闭', sourceRead: '阅读原文',
  },
  'zh-TW': {
    nav: ['首頁', '新聞', '賽事', '積分榜', '球隊', '球員'], tagline: '為每份熱愛，找到同頻球迷', sub: '全球賽場 · 每日更新', today: '球迷主場', daily: '每日更新',
    headline1: '為每份熱愛，', headline2: '找到同頻球迷', headSub: '最新資訊、賽後賽果、球隊故事和球迷觀點。無論你支持誰，這裡都有同一份熱愛。', discover: '看看今天的足球', choose: '選擇球隊',
    latest: '最新新聞', latestSub: '全球賽場，第一時間跟進', allNews: '全部新聞', moreStory: '更多足球故事', all: '全部賽事', read: '分鐘閱讀', results: '近期賽果', resultsSub: '最近 7 天 · 賽後結果', schedule: '賽程與賽果', sevenDays: '最近 7 天',
    dynamics: '球隊動態', dynamicsSub: '跟進你關心的每一次出場', noTeams: '暫時沒有關注球隊', popular: '熱門球隊正在發生什麼', hot: '熱門討論', hotSub: '球迷正在聊什麼', pick: '挑選你的主隊',
    language: '語言', theme: '切換主題', search: '搜尋球隊、球員、新聞、賽事', searchTitle: '全站搜尋', filters: ['全部', '新聞', '球隊', '球員', '賽事'], noSearch: '找不到相關內容', searchTip: '試試搜尋「阿森納」、「歐冠」或「賽前分析」', allDates: '全部日期',
    chooseTitle: '選擇你關注的球隊', chooseNote: '之後可在球隊動態中優先看到它們。你可以先跳過，稍後再選。', skip: '暫時跳過', save: '儲存關注', source: '來源', demo: '賽果示例 · 連接足球數據 API 後替換示例內容。',
    footer: '好球值得分享。好觀點，值得被聽見。', local: '關注清單儲存在目前裝置，之後可隨登入功能同步。', scoreAll: '全部賽事', scoreFollowing: '關注球隊', searchLabel: '搜尋', openSearch: '搜尋', close: '關閉', sourceRead: '閱讀原文',
  },
  en: {
    nav: ['Home', 'News', 'Matches', 'Standings', 'Teams', 'Players'], tagline: 'Find your people through football', sub: 'Global football · Updated daily', today: 'The fans’ home', daily: 'Daily update',
    headline1: 'Find your people,', headline2: 'through football.', headSub: 'News, full-time scores, team stories and fan voices. Whoever you support, there’s a place for your passion here.', discover: 'Explore today’s game', choose: 'Choose teams',
    latest: 'Latest stories', latestSub: 'A closer look at the global game', allNews: 'All news', moreStory: 'On the touchline', all: 'All competitions', read: 'min read', results: 'Recent results', resultsSub: 'Last 7 days · Full-time scores', schedule: 'Fixtures & results', sevenDays: 'Last 7 days',
    dynamics: 'Team updates', dynamicsSub: 'Follow every moment that matters', noTeams: 'No teams followed yet', popular: 'Popular teams, latest stories', hot: 'Trending discussions', hotSub: 'What fans are talking about', pick: 'Pick your team',
    language: 'Language', theme: 'Change theme', search: 'Search teams, players, news, matches', searchTitle: 'Search Kickoff', filters: ['All', 'News', 'Teams', 'Players', 'Matches'], noSearch: 'No results found', searchTip: 'Try “Arsenal”, “Champions League”, or “preview”', allDates: 'All dates',
    chooseTitle: 'Choose your teams', chooseNote: 'Their updates will get priority. You can skip this and choose later.', skip: 'Skip for now', save: 'Save teams', source: 'Source', demo: 'Sample results · Connect a football data API to replace this content.',
    footer: 'Good football is better shared. Good takes deserve to be heard.', local: 'Saved on this device. Sign-in sync can be added later.', scoreAll: 'All competitions', scoreFollowing: 'Following teams', searchLabel: 'Search', openSearch: 'Search', close: 'Close', sourceRead: 'Read source',
  },
};

const localeIndex = { 'zh-CN': 0, 'zh-TW': 1, en: 2 };
const leagueNames = {
  '英超': ['英超', '英超', 'Premier League'], '西甲': ['西甲', '西甲', 'La Liga'], '意甲': ['意甲', '意甲', 'Serie A'],
  '德甲': ['德甲', '德甲', 'Bundesliga'], '法甲': ['法甲', '法甲', 'Ligue 1'], '欧冠': ['欧冠', '歐冠', 'Champions League'],
};
const clubNames = {
  '曼城': ['曼城', '曼城', 'Manchester City'], '阿森纳': ['阿森纳', '阿森納', 'Arsenal'],
  '国际米兰': ['国际米兰', '國際米蘭', 'Inter Milan'], 'AC米兰': ['AC米兰', 'AC米蘭', 'AC Milan'],
  '巴塞罗那': ['巴塞罗那', '巴塞隆納', 'Barcelona'], '马德里竞技': ['马德里竞技', '馬德里競技', 'Atlético Madrid'],
  '拜仁慕尼黑': ['拜仁慕尼黑', '拜仁慕尼黑', 'Bayern Munich'], '多特蒙德': ['多特蒙德', '多特蒙德', 'Borussia Dortmund'],
};
function localizeLeague(name, locale) { return leagueNames[name]?.[localeIndex[locale]] || name; }
function localizeClub(name, locale) { return clubNames[name]?.[localeIndex[locale]] || name; }
function localizeDate(date, locale) {
  if (locale !== 'en') return date;
  const match = date.match(/(\d+)月(\d+)日/);
  return match ? new Date(2026, Number(match[1]) - 1, Number(match[2])).toLocaleDateString('en', { month: 'short', day: '2-digit' }) : date;
}
function localizeSource(source, locale) {
  if (locale !== 'en') return source.replace('编辑部', '編輯部').replace('数据组', '數據組').replace('快讯', '快訊');
  return source.replace('编辑部', 'Editorial desk').replace('数据组', 'Data desk').replace('快讯', 'News desk');
}
function localizeTime(time, locale) {
  if (locale !== 'en') return time;
  return time.replace('分钟前', 'min ago').replace('小时', 'h').replace('前', ' ago');
}

function browserLocale(): keyof typeof words {
  const saved = localStorage.getItem('kickoff-locale');
  if (saved && saved in words) return saved as keyof typeof words;
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh-tw') || lang.startsWith('zh-hk') || lang.startsWith('zh-mo') || lang.includes('hant')) return 'zh-TW';
  return lang.startsWith('en') ? 'en' : 'zh-CN';
}


export { teams, articles, extraStories, results, tableRows, playerLeaders, discussions, words, localeIndex, localizeLeague, localizeClub, localizeDate, localizeSource, localizeTime, browserLocale };
