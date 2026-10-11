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

const discussions = [
  { initials: 'JY', name: 'JellyYellow', team: ['阿森纳球迷', '阿森納球迷', 'Arsenal fan'], color: 'orange', text: ['这场中场的对抗强度会不会是胜负手？我觉得边后卫的站位也很关键。', '這場中場的對抗強度會不會是勝負手？我覺得邊後衛的站位也很關鍵。', 'Could the midfield battle decide this one? The full-back positioning matters too.'], likes: 284, replies: 46, tag: ['英超 · 赛前看点', '英超 · 賽前看點', 'Premier League · Preview'] },
  { initials: 'MK', name: 'Mika_90', team: ['中立观赛', '中立觀賽', 'Neutral fan'], color: 'purple', text: ['把这两队最近五场的射门转化率放一起看，差别还挺明显的。', '把這兩隊最近五場的射門轉化率放一起看，差別還挺明顯的。', 'The gap in shot conversion across their last five games is pretty striking.'], likes: 193, replies: 28, tag: ['数据讨论', '數據討論', 'Data talk'] },
  { initials: 'AL', name: 'AzzurriLife', team: ['意甲球迷', '意甲球迷', 'Serie A fan'], color: 'green', text: ['德比踢成平局也很合理，最后十五分钟双方都不想冒险。', '德比踢成平局也很合理，最後十五分鐘雙方都不想冒險。', 'A draw in the derby made sense. Neither side wanted to take a big risk late on.'], likes: 117, replies: 19, tag: ['意甲 · 赛后', '意甲 · 賽後', 'Serie A · Full-time'] },
];

const words = {
  'zh-CN': {
    nav: ['首页', '新闻', '比赛', '积分榜', '球队榜', '球队', '球员'], tagline: '为每份热爱，找到同频球迷', sub: '全球赛场 · 每日更新', today: '球迷主场', daily: '每日更新',
    headline1: '为每份热爱，', headline2: '找到同频球迷', headSub: '最新资讯、赛后赛果、球队故事和球迷观点。无论你支持谁，这里都有同一份热爱。', discover: '看看今天的足球', choose: '选择球队',
    latest: '最新新闻', latestSub: '全球赛场，一手跟进', allNews: '全部新闻', moreStory: '更多足球故事', all: '全部赛事', read: '分钟阅读', results: '近期赛果', resultsSub: '最近 7 天 · 赛后结果', schedule: '赛程与赛果', sevenDays: '最近 7 天',
    dynamics: '球队动态', dynamicsSub: '跟进你关心的每一次出场', noTeams: '暂时没有关注球队', popular: '热门球队正在发生什么', hot: '热门讨论', hotSub: '球迷正在聊什么', pick: '挑选你的主队',
    language: '语言', theme: '切换主题', search: '搜索球队、球员、新闻、比赛', searchTitle: '全站搜索', filters: ['全部', '新闻', '球队', '球员', '比赛'], noSearch: '没有找到相关内容', searchTip: '试试搜索“阿森纳”、“欧冠”或“赛前分析”', allDates: '全部日期',
    chooseTitle: '选择你关注的球队', chooseNote: '之后可在球队动态中优先看到它们。你可以先跳过，稍后再选。', skip: '暂时跳过', save: '保存关注', source: '来源', demo: '赛果示例 · 连接足球数据 API 后替换示例内容。',
    footer: '好球值得分享。好观点，值得被听见。', local: '关注列表保存在当前设备，之后可随登录功能同步。', scoreAll: '全部赛事', scoreFollowing: '关注球队', searchLabel: '搜索', openSearch: '搜索', close: '关闭', sourceRead: '阅读原文',
  },
  'zh-TW': {
    nav: ['首頁', '新聞', '賽事', '積分榜', '球隊榜', '球隊', '球員'], tagline: '為每份熱愛，找到同頻球迷', sub: '全球賽場 · 每日更新', today: '球迷主場', daily: '每日更新',
    headline1: '為每份熱愛，', headline2: '找到同頻球迷', headSub: '最新資訊、賽後賽果、球隊故事和球迷觀點。無論你支持誰，這裡都有同一份熱愛。', discover: '看看今天的足球', choose: '選擇球隊',
    latest: '最新新聞', latestSub: '全球賽場，第一時間跟進', allNews: '全部新聞', moreStory: '更多足球故事', all: '全部賽事', read: '分鐘閱讀', results: '近期賽果', resultsSub: '最近 7 天 · 賽後結果', schedule: '賽程與賽果', sevenDays: '最近 7 天',
    dynamics: '球隊動態', dynamicsSub: '跟進你關心的每一次出場', noTeams: '暫時沒有關注球隊', popular: '熱門球隊正在發生什麼', hot: '熱門討論', hotSub: '球迷正在聊什麼', pick: '挑選你的主隊',
    language: '語言', theme: '切換主題', search: '搜尋球隊、球員、新聞、賽事', searchTitle: '全站搜尋', filters: ['全部', '新聞', '球隊', '球員', '賽事'], noSearch: '找不到相關內容', searchTip: '試試搜尋「阿森納」、「歐冠」或「賽前分析」', allDates: '全部日期',
    chooseTitle: '選擇你關注的球隊', chooseNote: '之後可在球隊動態中優先看到它們。你可以先跳過，稍後再選。', skip: '暫時跳過', save: '儲存關注', source: '來源', demo: '賽果示例 · 連接足球數據 API 後替換示例內容。',
    footer: '好球值得分享。好觀點，值得被聽見。', local: '關注清單儲存在目前裝置，之後可隨登入功能同步。', scoreAll: '全部賽事', scoreFollowing: '關注球隊', searchLabel: '搜尋', openSearch: '搜尋', close: '關閉', sourceRead: '閱讀原文',
  },
  en: {
    nav: ['Home', 'News', 'Matches', 'Standings', 'Team stats', 'Teams', 'Players'], tagline: 'Find your people through football', sub: 'Global football · Updated daily', today: 'The fans’ home', daily: 'Daily update',
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
  '利物浦': ['利物浦', '利物浦', 'Liverpool'], '皇家马德里': ['皇家马德里', '皇家馬德里', 'Real Madrid'],
  '巴黎圣日耳曼': ['巴黎圣日耳曼', '巴黎聖日耳門', 'Paris Saint-Germain'],
  '国际米兰': ['国际米兰', '國際米蘭', 'Inter Milan'], 'AC米兰': ['AC米兰', 'AC米蘭', 'AC Milan'],
  '巴塞罗那': ['巴塞罗那', '巴塞隆納', 'Barcelona'], '马德里竞技': ['马德里竞技', '馬德里競技', 'Atlético Madrid'],
  '拜仁慕尼黑': ['拜仁慕尼黑', '拜仁慕尼黑', 'Bayern Munich'], '多特蒙德': ['多特蒙德', '多特蒙德', 'Borussia Dortmund'],
};
// Football-Data.org returns most club names in English. Keep display names here
// so the selected site language applies consistently to API-fed tables/results.
const apiClubNames = {
  'Brighton Hove': ['布莱顿', '白禮頓', 'Brighton & Hove Albion'],
  Brentford: ['布伦特福德', '賓福特', 'Brentford'],
  'Leeds United': ['利兹联', '列斯聯', 'Leeds United'],
  Everton: ['埃弗顿', '愛華頓', 'Everton'],
  'Hull City': ['赫尔城', '侯城', 'Hull City'],
  Newcastle: ['纽卡斯尔联', '紐卡素', 'Newcastle United'],
  Chelsea: ['切尔西', '車路士', 'Chelsea'],
  'Ipswich Town': ['伊普斯维奇', '葉士域治', 'Ipswich Town'],
  'Man United': ['曼联', '曼聯', 'Manchester United'],
  Nottingham: ['诺丁汉森林', '諾定咸森林', 'Nottingham Forest'],
  Sunderland: ['桑德兰', '新特蘭', 'Sunderland'],
  'Crystal Palace': ['水晶宫', '水晶宮', 'Crystal Palace'],
  'Aston Villa': ['阿斯顿维拉', '阿士東維拉', 'Aston Villa'],
  Bournemouth: ['伯恩茅斯', '般尼茅夫', 'Bournemouth'],
  'Coventry City': ['考文垂', '高雲地利', 'Coventry City'],
  Fulham: ['富勒姆', '富咸', 'Fulham'],
  Tottenham: ['托特纳姆热刺', '熱刺', 'Tottenham Hotspur'],
  Atleti: ['马德里竞技', '馬德里體育會', 'Atlético Madrid'],
  'Real Betis': ['皇家贝蒂斯', '皇家貝迪斯', 'Real Betis'],
  'Sevilla FC': ['塞维利亚', '西維爾', 'Sevilla'],
  Alavés: ['阿拉维斯', '艾拉維斯', 'Alavés'],
  Deportivo: ['拉科鲁尼亚', '拉科魯尼亞', 'Deportivo La Coruña'],
  'Real Sociedad': ['皇家社会', '皇家蘇斯達', 'Real Sociedad'],
  Villarreal: ['比利亚雷亚尔', '維拉利爾', 'Villarreal'],
  Athletic: ['毕尔巴鄂竞技', '畢爾包', 'Athletic Club'],
  Espanyol: ['西班牙人', '愛斯賓奴', 'Espanyol'],
  Getafe: ['赫塔费', '基達菲', 'Getafe'],
  'Rayo Vallecano': ['巴列卡诺', '華歷簡奴', 'Rayo Vallecano'],
  Osasuna: ['奥萨苏纳', '奧沙辛拿', 'Osasuna'],
  Celta: ['塞尔塔', '切爾達', 'Celta Vigo'],
  Santander: ['桑坦德竞技', '桑坦德競技', 'Racing Santander'],
  Levante: ['莱万特', '利雲特', 'Levante'],
  Elche: ['埃尔切', '艾爾切', 'Elche'],
  Málaga: ['马拉加', '馬拉加', 'Málaga'],
  Valencia: ['瓦伦西亚', '華倫西亞', 'Valencia'],
  Roma: ['罗马', '羅馬', 'Roma'], Lazio: ['拉齐奥', '拉素', 'Lazio'],
  Cagliari: ['卡利亚里', '卡利亞里', 'Cagliari'], Milan: ['AC米兰', 'AC米蘭', 'AC Milan'],
  Frosinone: ['弗罗西诺内', '弗羅西諾內', 'Frosinone'], Juventus: ['尤文图斯', '祖雲達斯', 'Juventus'],
  'Como 1907': ['科莫', '科木', 'Como'], Napoli: ['那不勒斯', '拿坡里', 'Napoli'],
  Sassuolo: ['萨索洛', '薩斯索羅', 'Sassuolo'], Atalanta: ['亚特兰大', '阿特蘭大', 'Atalanta'],
  Lecce: ['莱切', '萊切', 'Lecce'], Udinese: ['乌迪内斯', '烏甸尼斯', 'Udinese'],
  Torino: ['都灵', '拖連奴', 'Torino'], Parma: ['帕尔马', '帕爾馬', 'Parma'], Monza: ['蒙扎', '蒙沙', 'Monza'],
  Fiorentina: ['佛罗伦萨', '費倫天拿', 'Fiorentina'], Bologna: ['博洛尼亚', '博洛尼亞', 'Bologna'],
  Genoa: ['热那亚', '熱拿亞', 'Genoa'], 'Venezia FC': ['威尼斯', '威尼斯', 'Venezia'],
  Dortmund: ['多特蒙德', '多蒙特', 'Borussia Dortmund'], Freiburg: ['弗赖堡', '弗賴堡', 'Freiburg'],
  Bremen: ['云达不来梅', '雲達不來梅', 'Werder Bremen'], Augsburg: ['奥格斯堡', '奧格斯堡', 'Augsburg'],
  Leverkusen: ['勒沃库森', '利華古遜', 'Bayer Leverkusen'], Mainz: ['美因茨', '緬恩斯', 'Mainz'],
  Elversberg: ['埃尔弗斯贝格', '艾華斯堡', 'Elversberg'], 'RB Leipzig': ['莱比锡', 'RB萊比錫', 'RB Leipzig'],
  Frankfurt: ['法兰克福', '法蘭克福', 'Eintracht Frankfurt'], Schalke: ['沙尔克04', '史浩克04', 'Schalke 04'],
  'SC Paderborn': ['帕德博恩', '柏達邦', 'SC Paderborn'], '1. FC Köln': ['科隆', '科隆', '1. FC Köln'],
  Hoffenheim: ['霍芬海姆', '賀芬咸', 'Hoffenheim'], Stuttgart: ['斯图加特', '史特加', 'Stuttgart'],
  HSV: ['汉堡', '漢堡', 'Hamburger SV'], 'Union Berlin': ['柏林联合', '柏林聯', 'Union Berlin'],
  "M'gladbach": ['门兴格拉德巴赫', '慕遜加柏', 'Borussia Mönchengladbach'],
  Monaco: ['摩纳哥', '摩納哥', 'Monaco'], 'Olympique Lyon': ['里昂', '里昂', 'Olympique Lyonnais'],
  'Paris FC': ['巴黎FC', '巴黎FC', 'Paris FC'], Lille: ['里尔', '里爾', 'Lille'],
  'Stade Rennais': ['雷恩', '雷恩', 'Stade Rennais'], 'RC Lens': ['朗斯', '朗斯', 'Lens'],
  'Angers SCO': ['昂热', '昂熱', 'Angers'], Strasbourg: ['斯特拉斯堡', '斯特拉斯堡', 'Strasbourg'],
  'Le Mans': ['勒芒', '勒芒', 'Le Mans'], Auxerre: ['欧塞尔', '歐塞爾', 'Auxerre'],
  Brest: ['布雷斯特', '比斯特', 'Brest'], Lorient: ['洛里昂', '羅連安特', 'Lorient'],
  Toulouse: ['图卢兹', '圖盧茲', 'Toulouse'], Nice: ['尼斯', '尼斯', 'Nice'], Troyes: ['特鲁瓦', '特魯瓦', 'Troyes'],
  Marseille: ['马赛', '馬賽', 'Marseille'], 'Le Havre': ['勒阿弗尔', '勒哈佛爾', 'Le Havre'],
  'Sporting CP': ['葡萄牙体育', '士砵亭', 'Sporting CP'], 'PAE AEK': ['雅典AEK', 'AEK雅典', 'AEK Athens'],
  Shaktar: ['顿涅茨克矿工', '薩克達', 'Shakhtar Donetsk'], Fenerbahçe: ['费内巴切', '費倫巴治', 'Fenerbahçe'],
  PSV: ['埃因霍温', '燕豪芬', 'PSV Eindhoven'], 'Club Brugge': ['布鲁日', '布魯日', 'Club Brugge'],
  'Slavia Praha': ['布拉格斯拉维亚', '布拉格斯拉維亞', 'Slavia Prague'], LASK: ['林茨', '林茨', 'LASK'],
  Galatasaray: ['加拉塔萨雷', '加拉塔沙雷', 'Galatasaray'], Viking: ['维京', '維京', 'Viking'],
  Porto: ['波尔图', '波圖', 'Porto'], Feyenoord: ['费耶诺德', '飛燕諾', 'Feyenoord'],
  'Sabah FK': ['沙巴足球俱乐部', '沙巴足球會', 'Sabah FK'],
  'Sl. Bratislava': ['布拉迪斯拉发', '布拉迪斯拉發', 'Slovan Bratislava'],
  'Bodø/Glimt': ['博德闪耀', '波杜基林特', 'Bodø/Glimt'],
};
function localizeLeague(name, locale) { return leagueNames[name]?.[localeIndex[locale]] || name; }
function localizeClub(name, locale) { return clubNames[name]?.[localeIndex[locale]] || apiClubNames[name]?.[localeIndex[locale]] || name; }
const knownPlayerNames = {
  'Erling Haaland': ['埃尔林·哈兰德', '艾寧·夏蘭特', 'Erling Haaland'],
  'E. Haaland': ['埃尔林·哈兰德', '艾寧·夏蘭特', 'Erling Haaland'],
  'Alexander Isak': ['亚历山大·伊萨克', '亞歷山大·伊薩克', 'Alexander Isak'],
  'Pascal Gross': ['帕斯卡尔·格罗斯', '柏斯高·格羅斯', 'Pascal Groß'],
  'Pedro Joao': ['佩德罗·若昂', '柏度·祖奧', 'Pedro João'],
  'Rayan Cherki': ['拉扬·谢尔基', '拉揚·謝爾基', 'Rayan Cherki'],
  'Bruno Fernandes': ['布鲁诺·费尔南德斯', '般奴·費南迪斯', 'Bruno Fernandes'],
  'Bukayo Saka': ['布卡约·萨卡', '布卡約·沙卡', 'Bukayo Saka'],
  'Cole Palmer': ['科尔·帕尔默', '高爾·彭馬', 'Cole Palmer'],
  'R. Lewandowski': ['罗伯特·莱万多夫斯基', '羅伯特·萊萬多夫斯基', 'Robert Lewandowski'],
  'A. Budimir': ['安特·布迪米尔', '安特·布迪米爾', 'Ante Budimir'],
  'A. Moleiro': ['阿尔贝托·莫莱罗', '阿爾貝托·莫萊羅', 'Alberto Moleiro'],
  'Hernandez Cucho': ['库乔·埃尔南德斯', '古祖·靴南迪斯', 'Cucho Hernández'],
  'Yamal Lamine': ['拉明·亚马尔', '拉明·耶馬', 'Lamine Yamal'],
  'J. Alvarez': ['胡利安·阿尔瓦雷斯', '祖利安·艾華利斯', 'Julián Álvarez'],
  'Jude Bellingham': ['裘德·贝林厄姆', '祖迪·比寧咸', 'Jude Bellingham'],
  'C. Pulisic': ['克里斯蒂安·普利西奇', '基斯甸·普列錫', 'Christian Pulisic'],
  'K. Yildiz': ['凯南·伊尔迪兹', '堅拿·耶迪斯', 'Kenan Yıldız'],
  'H. Calhanoglu': ['恰尔汗奥卢', '恰爾汗奧盧', 'Hakan Çalhanoğlu'],
  'R. Leao': ['拉斐尔·莱奥', '拉斐爾·利亞奧', 'Rafael Leão'],
  'M. Thuram': ['马库斯·图拉姆', '馬古斯·杜林', 'Marcus Thuram'],
  'L. Diaz': ['路易斯·迪亚斯', '路爾斯·迪亞斯', 'Luis Díaz'],
  'H. Kane': ['哈里·凯恩', '哈利·簡尼', 'Harry Kane'],
  'J. Burkardt': ['乔纳森·布卡特', '莊拿芬·布卡特', 'Jonathan Burkardt'],
  'S. Gnabry': ['塞尔日·格纳布里', '沙治·拿比', 'Serge Gnabry'],
  'E. Lepaul': ['埃斯特班·勒保尔', '艾斯特班·勒保爾', 'Estéban Lepaul'],
  'P. Sulc': ['帕维尔·舒尔茨', '柏華·舒爾斯', 'Pavel Šulc'],
  'O. Dembele': ['奥斯曼·登贝莱', '奧斯文·丹比利', 'Ousmane Dembélé'],
  'B. Barcola': ['布拉德利·巴尔科拉', '巴特利·巴高拿', 'Bradley Barcola'],
  'K. Mbappe': ['基利安·姆巴佩', '基利安·麥巴比', 'Kylian Mbappé'],
  'V. Osimhen': ['维克托·奥斯梅恩', '域陀·奧森漢', 'Victor Osimhen'],
  'A. Gordon': ['安东尼·戈登', '安東尼·哥頓', 'Anthony Gordon'],
  'G. Martinelli': ['加布里埃尔·马丁内利', '加比爾·馬天尼利', 'Gabriel Martinelli'],
};
function localizePlayer(name, locale) { return knownPlayerNames[name]?.[localeIndex[locale]] || name; }
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


export { teams, articles, extraStories, discussions, words, localeIndex, localizeLeague, localizeClub, localizePlayer, localizeDate, localizeSource, localizeTime, browserLocale };
