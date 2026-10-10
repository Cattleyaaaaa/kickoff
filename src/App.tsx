import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowUpRight, ArrowRight, ArrowDown, Search, Sun, Moon, Globe2, Menu, X, Check, Plus, Trophy, UsersRound, MessageCircle, Heart, SlidersHorizontal, Clock3, ChevronRight, Shield, Zap, MoveUpRight } from 'lucide-react';
import { teams, articles, extraStories, results, tableRows, playerLeaders, discussions, words, localeIndex, localizeLeague, localizeClub, localizeDate, browserLocale } from './data';
import type { FootballSnapshot } from '../scripts/football-transform';
import './ui.css';

const routes = ['home', 'news', 'matches', 'standings', 'teams', 'players'];
const leagues = ['英超', '西甲', '意甲', '德甲', '法甲', '欧冠'];
const readRoute = () => routes.find(route => '/' + route === location.pathname.replace(/\/$/, '')) || 'home';
const copy = (locale, simplified, traditional, english) => locale === 'en' ? english : locale === 'zh-TW' ? traditional : simplified;
const readSaved = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
type Locale = keyof typeof words;
const localDateKey = (value: string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const matchDateLabel = (value: string, locale: Locale) => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(value));
const updatedLabel = (value: string, locale: Locale) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
function isFootballSnapshot(value: unknown): value is FootballSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<FootballSnapshot>;
  return data.source === 'football-data.org' && typeof data.updatedAt === 'string' && Array.isArray(data.matches) && !!data.standings && typeof data.standings === 'object';
}

function Crest({ name, color = '#7377db', small = false }) {
  return <span className={'crest' + (small ? ' crest-small' : '')} style={{ '--club': color } as React.CSSProperties} aria-hidden="true"><span>{name.slice(0, 2)}</span></span>;
}
function SectionTitle({ kicker, title, action = null }) {
  return <div className="section-title"><div><span className="eyebrow">{kicker}</span><h2>{title}<span className="title-dot">.</span></h2></div>{action}</div>;
}
function PageTitle({ title, description, label, icon: Icon = Trophy }) {
  return <div className="page-title reveal"><div><span className="eyebrow">KICKOFF / {label}</span><h1>{title}<span className="title-dot">.</span></h1><p>{description}</p></div><div className="page-stamp" aria-hidden="true"><Icon size={38} /><span>{label}</span></div></div>;
}
function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (ref.current?.querySelector('input') || ref.current?.querySelector('button,select'))?.focus();
    const keydown = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const nodes = [...ref.current.querySelectorAll('button:not(:disabled),input,select,a[href],textarea')];
      if (!nodes.length) return;
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); (previous as HTMLElement | null)?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section ref={ref} className={'modal ' + (wide ? 'modal-wide' : '')} role="dialog" aria-modal="true" aria-label={title}><div className="modal-top"><span className="eyebrow">KICKOFF / YOUR SPACE</span><button className="icon-button" aria-label="Close / 关闭" onClick={onClose}><X /></button></div><h2>{title}</h2>{children}</section></div>;
}
function StoryArt({ article, lead = false }) {
  if (lead) return <div className="story-photo"><img src="/images/soccer-match-photo.jpg" alt="" /><span className="photo-caption">EDITOR'S PICK ↗</span></div>;
  const label = article.label?.[2] || (article.visual === 'violet' ? 'TACTICS' : 'MATCHDAY');
  return <div className={'story-art art-' + article.visual} aria-hidden="true"><div className="mini-pitch"><i /><b /><span>×</span></div><strong>{label}</strong><span className="art-arrow">↗</span></div>;
}
function ArticleCard({ article, locale, onOpen, lead = false }) {
  const idx = localeIndex[locale];
  return <article id={article.id} className={lead ? 'lead-story' : 'feed-story'}>
    <button className="art-button" tabIndex={-1} aria-label={article.title[idx]} onClick={() => onOpen(article)}><StoryArt article={article} lead={lead} /></button>
    <div className="story-copy"><div className="story-meta"><span className="tag">{localizeLeague(article.league.split(' · ')[0], locale)}</span><span>{copy(locale, '示例选题', '示例選題', 'Editorial sample')}</span><span className="read-time"><Clock3 size={14} />{article.read} {copy(locale, '分钟', '分鐘', 'min')}</span></div><h3><button onClick={() => onOpen(article)}>{article.title[idx]}</button></h3><p>{article.summary[idx]}</p><div className="story-end"><span className="source-dot">K</span><span>Kickoff {copy(locale, '编辑部', '編輯部', 'Editorial')}</span><button aria-label={copy(locale, '阅读摘要', '閱讀摘要', 'Read summary')} className="round-button" onClick={() => onOpen(article)}><ArrowUpRight size={20} /></button></div>{lead && <p className="photo-credit">{copy(locale, '比赛配图：', '比賽配圖：', 'Illustrative match photo: ')}<a href="https://commons.wikimedia.org/wiki/File:Soccer_match.jpg" target="_blank" rel="noopener noreferrer">AngusConnaltyPhotos / Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a> ({copy(locale, '页面裁切显示', '頁面裁切顯示', 'display cropped')})</p>}</div>
  </article>;
}
function Discussion({ locale, onJoin }) {
  const idx = localeIndex[locale];
  return <section id="discussions" className="discussion-block reveal"><SectionTitle kicker="THE STANDS / 看台声音" title={words[locale].hot} action={<span className="sticker small-sticker">FANS FIRST ✳</span>} /><p className="section-desc">{copy(locale, '聊比赛，也聊你的热爱。', '聊比賽，也聊你的熱愛。', 'Big games. Different takes. Same love.')}</p><div className="discussion-grid">{discussions.map((item, i) => <article className={'discussion-card discussion-' + i} key={item.initials}><span className="discussion-topic">{item.tag[idx]}</span><p className="fan-quote">“{item.text[idx]}”</p><div className="fan-person"><span className="avatar">{item.initials}</span><span><b>{item.name}</b><small>{item.team[idx]}</small></span></div><div className="discussion-actions"><button onClick={onJoin} aria-label={copy(locale, '点赞', '點讚', 'Like')}><Heart size={17} />{item.likes}</button><button onClick={onJoin} aria-label={copy(locale, '回复', '回覆', 'Reply')}><MessageCircle size={17} />{item.replies}</button><span>↗</span></div></article>)}</div><div className="discussion-foot"><span>{copy(locale, '评论示例 · 登录上线后开放发言、点赞和回复', '評論示例 · 登入上線後開放發言、點讚和回覆', 'Sample discussions · Posting, likes and replies open with sign-in')}</span><button className="text-link" onClick={onJoin}>{copy(locale, '加入看台', '加入看台', 'Join the stands')}<ArrowRight size={18} /></button></div></section>;
}
function MatchBreakdown({ locale }) {
  const events = [
    ['23′',copy(locale,'主队进球','主隊進球','Home goal'),'1 – 0'],
    ['51′',copy(locale,'客队黄牌','客隊黃牌','Away booking'),'🟨'],
    ['68′',copy(locale,'客队扳平','客隊扳平','Away equaliser'),'1 – 1'],
    ['82′',copy(locale,'主队换人','主隊換人','Home substitution'),'↔'],
    ['89′',copy(locale,'主队进球','主隊進球','Home goal'),'2 – 1'],
  ];
  return <div className="recap-breakdown"><div><h4>{copy(locale,'比赛事件','比賽事件','Match events')}</h4><div className="event-timeline">{events.map(([minute,label,score])=><div key={minute}><time>{minute}</time><span>{label}</span><b>{score}</b></div>)}</div></div><div><h4>{copy(locale,'比赛统计','比賽統計','Match stats')}</h4>{[[copy(locale,'控球率','控球率','Possession'),'58%','42%',58],[copy(locale,'射门','射門','Shots'),14,9,61],[copy(locale,'角球','角球','Corners'),7,5,58]].map(([label,home,away,percent])=><div className="stat-row" key={label}><div><b>{home}</b><span>{label}</span><b>{away}</b></div><div className="stat-track"><span style={{width:percent+'%'}}/></div></div>)}<p>{copy(locale,'事件与统计均为示例。','事件與統計均為示例。','Events and stats are illustrative.')}</p></div></div>;
}
function NewsFeed({ locale, onOpen, home = false, navigate, onJoin, onPick }) {
  const t = words[locale], idx = localeIndex[locale];
  const [league, setLeague] = useState('all');
  const [filters, setFilters] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = articles.filter(a => (league === 'all' || a.league.startsWith(league)) && (a.title[idx] + a.summary[idx]).toLowerCase().includes(query.toLowerCase()));
  return <>
    {home ? <section className="home-hero reveal" id="home"><div className="hero-copy"><span className="eyebrow"><span className="live-dot" /> FOOTBALL. FRIENDS. EVERYTHING.</span><h1><span>{t.headline1}</span><br /><em>{t.headline2}</em></h1><p>{copy(locale, '从第一声哨响，到赛后的意犹未尽。这里，都是自己人。', '從第一聲哨響，到賽後的意猶未盡。這裡，都是自己人。', 'From the first whistle to the last debate. This is your home end.')}</p><div className="hero-buttons"><button className="button primary" onClick={() => document.getElementById('news').scrollIntoView({ behavior: 'smooth' })}>{t.discover}<ArrowDown size={19} /></button><button className="button plain" onClick={onPick}><UsersRound size={19} />{t.choose}</button></div></div><div className="hero-collage" aria-hidden="true"><div className="pitch-card"><span>THE HOME END</span><div className="pitch-lines"><i /><b /><em /></div><strong>90<span>+</span></strong><small>ALL FOR THE GAME.</small></div><div className="sticker hero-sticker">FOR THE<br />LOVE OF<br /><b>FOOTBALL.</b></div><span className="scribble-star">✳</span><span className="collage-caption">SAME GAME. YOUR WAY. ↗</span></div></section> : <PageTitle title={t.latest} description={copy(locale, '赛场内外的故事，一次看个够。', '賽場內外的故事，一次看個夠。', 'The stories, the noise, the beautiful game.')} label="NEWSROOM" icon={Zap} />}
    <div className="league-ribbon reveal"><span className="eyebrow">{copy(locale, '全球赛场', '全球賽場', 'AROUND THE GAME')}</span>{leagues.map((l, i) => <button className={'league-pill league-' + i + (league === l ? ' selected' : '')} aria-pressed={league === l} key={l} onClick={() => { setLeague(league === l ? 'all' : l); document.getElementById('news')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span>●</span>{localizeLeague(l, locale)}</button>)}</div>
    <section id="news" className="news-section reveal"><SectionTitle kicker={home ? '01 / THE LATEST' : 'THE EDIT'} title={home ? t.latest : copy(locale, '新闻速递', '新聞速遞', 'Fresh off the pitch')} action={home ? <button className="text-link" onClick={() => navigate('news')}>{t.allNews}<ArrowUpRight size={20} /></button> : null} />
      <div className="news-toolbar"><div className="tabs"><button className={league === 'all' ? 'selected' : ''} onClick={() => setLeague('all')}>{copy(locale, '最新发布', '最新發佈', 'Latest')}</button>{league !== 'all' && <button className="selected" onClick={() => setLeague('all')}>{localizeLeague(league, locale)}<X size={14} /></button>}</div><button className="button filter-button" aria-expanded={filters} onClick={() => setFilters(!filters)}><SlidersHorizontal size={18} />{copy(locale, '筛选', '篩選', 'Filter')}</button></div>
      {filters && <div className="filter-panel"><label>{copy(locale, '关键词', '關鍵詞', 'Keyword')}<input value={query} onChange={e => setQuery(e.target.value)} placeholder={copy(locale, '搜索新闻标题', '搜尋新聞標題', 'Search headlines')} /></label><label>{t.all}<select value={league} onChange={e => setLeague(e.target.value)}><option value="all">{t.all}</option>{leagues.map(l => <option key={l} value={l}>{localizeLeague(l, locale)}</option>)}</select></label><button className="text-link" onClick={() => { setLeague('all'); setQuery(''); }}>{copy(locale, '重置', '重設', 'Reset')}</button></div>}
      {filtered.length ? <><div className="news-lead-grid"><ArticleCard article={filtered[0]} locale={locale} onOpen={onOpen} lead /><aside className="quick-read"><div className="quick-title"><Zap size={23} /><h3>{copy(locale, '球迷快读', '球迷快讀', 'The quick read')}</h3><span>↗</span></div>{extraStories.map((a, i) => <button className="quick-item" key={a.id} onClick={() => onOpen(a)}><span>0{i + 1}</span><div><small>{a.label[idx]}</small><b>{a.title[idx]}</b></div><ArrowUpRight size={18} /></button>)}<span className="quick-note">{copy(locale, '编辑选题 / 示例内容', '編輯選題 / 示例內容', 'EDITORIAL PICKS / SAMPLE STORIES')}</span></aside></div><div className="feed-heading"><h3>{t.moreStory}</h3><span>{String(filtered.length).padStart(2, '0')} STORIES</span></div><div className="story-list">{filtered.slice(1).map(a => <ArticleCard article={a} locale={locale} onOpen={onOpen} key={a.topic} />)}</div></> : <div className="empty-state"><Search size={32} /><h3>{t.noSearch}</h3><button className="button primary" onClick={() => { setLeague('all'); setQuery(''); }}>{copy(locale, '查看全部新闻', '查看全部新聞', 'Show all stories')}</button></div>}
    </section>{home && <Discussion locale={locale} onJoin={onJoin} />}
  </>;
}
function Matches({ locale, favorites }) {
  const t = words[locale];
  const [date, setDate] = useState('all'), [following, setFollowing] = useState(false), [selected, setSelected] = useState(results[0]);
  const rows = results.filter(r => (date === 'all' || r.date === date) && (!following || favorites.includes(r.teamHome) || favorites.includes(r.teamAway)));
  return <><PageTitle title={t.results} description={t.resultsSub} label="FULL TIME" /><section className="results-panel reveal"><div className="results-toolbar"><div className="tabs"><button className={!following ? 'selected' : ''} onClick={() => setFollowing(false)}>{t.scoreAll}</button><button className={following ? 'selected' : ''} onClick={() => setFollowing(true)}>{t.scoreFollowing}</button></div><label className="date-select"><Clock3 size={18} /><select aria-label={copy(locale, '按日期筛选赛果', '按日期篩選賽果', 'Filter results by date')} value={date} onChange={e => setDate(e.target.value)}><option value="all">{t.sevenDays}</option>{results.map(r => <option value={r.date} key={r.date}>{localizeDate(r.date, locale)}</option>)}</select></label></div><div className="match-grid">{rows.map(r => <button className={'result-row match-tile' + (selected === r ? ' active' : '')} key={r.teamHome} onClick={() => setSelected(r)}><div className="match-top"><span>{localizeLeague(r.league, locale)}</span><span>{localizeDate(r.date, locale)}</span><b>FT</b></div><div className="match-pair"><div><Crest name={r.teamHome} color={r.colors[0]} /><strong>{localizeClub(r.home, locale)}</strong></div><b className="score">{r.hs}<i>:</i>{r.as}</b><div><Crest name={r.teamAway} color={r.colors[1]} /><strong>{localizeClub(r.away, locale)}</strong></div></div><div className="match-bottom">{copy(locale, '赛后回顾', '賽後回顧', 'Match recap')}<ArrowUpRight size={18} /></div></button>)}</div>{!rows.length && <div className="empty-state">{copy(locale, '这个筛选条件下暂无赛果。', '這個篩選條件下暫無賽果。', 'No results match these filters.')}</div>}<p className="data-note">{t.demo}</p></section><section id="match-center" className="match-center"><SectionTitle kicker="POST MATCH" title={copy(locale, '比赛中心', '比賽中心', 'Match center')} /><div className="recap-card"><span className="tag">{copy(locale, '示例赛果', '示例賽果', 'Sample result')}</span><h3>{localizeClub(selected.home, locale)} <span>{selected.hs} — {selected.as}</span> {localizeClub(selected.away, locale)}</h3><p>{copy(locale, '完整战报、进球者与比赛事件将在接入数据后展示。', '完整戰報、進球者與比賽事件將在接入數據後展示。', 'Match reports, scorers and events will appear when verified data is connected.')}</p>{selected === results[0] && <MatchBreakdown locale={locale} />}</div></section></>;
}
function Standings({ locale }) {
  const [league, setLeague] = useState('英超');
  return <section id="standings"><PageTitle title={copy(locale, '积分榜', '積分榜', 'Standings')} description={copy(locale, '每一分，都在改写故事。', '每一分，都在改寫故事。', 'Every point changes the story.')} label="THE TABLE" /><div className="data-card"><div className="table-toolbar"><div className="tabs scroll-tabs">{leagues.map(l => <button className={league === l ? 'selected' : ''} onClick={() => setLeague(l)} key={l}>{localizeLeague(l, locale)}</button>)}</div><span className="season-label">2026 / 27</span></div>{league === '英超' ? <div className="table-scroll"><table className="standings-table"><thead><tr>{['#',copy(locale, '球队', '球隊', 'Club'),copy(locale, '场次', '場次', 'P'),copy(locale, '胜 / 平 / 负', '勝 / 和 / 負', 'W / D / L'),copy(locale, '净胜球', '淨勝球', 'GD'),copy(locale, '积分', '積分', 'PTS')].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{tableRows.map(r => <tr key={r.pos}><td><span className={'rank ' + (r.pos <= 3 ? 'top-rank' : '')}>{r.pos}</span></td><td><span className="table-club"><Crest name={r.team} color={r.color} small />{localizeClub(r.team, locale)}</span></td><td>{r.p}</td><td>{r.w} / {r.d} / {r.l}</td><td>{r.gd}</td><td><strong className="points">{r.pts}</strong></td></tr>)}</tbody></table></div> : <div className="empty-state"><Trophy size={35} /><h3>{localizeLeague(league, locale)}</h3><p>{copy(locale, '此赛事数据尚未接入。', '此賽事數據尚未接入。', 'Data for this competition is not connected yet.')}</p></div>}<p className="data-note">{copy(locale, '积分榜为示例数据，当前仅提供英超布局预览。', '積分榜為示例數據，目前僅提供英超版面預覽。', 'Sample standings. Premier League is the available preview.')}</p></div></section>;
}
function LiveMatches({ locale, favorites, data }: { locale: Locale; favorites: string[]; data: FootballSnapshot }) {
  const t = words[locale];
  const [date, setDate] = useState('all');
  const [following, setFollowing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 6);
  const recent = data.matches.filter(match => new Date(match.utcDate) >= cutoff);
  const dates = [...new Set(recent.map(match => localDateKey(match.utcDate)))];
  const rows = recent.filter(match => (date === 'all' || localDateKey(match.utcDate) === date)
    && (!following || favorites.includes(match.teamHome) || favorites.includes(match.teamAway)));
  const selected = rows.find(match => match.id === selectedId) || rows[0];
  return <><PageTitle title={t.results} description={t.resultsSub} label="FULL TIME" />
    <section className="results-panel reveal"><div className="results-toolbar"><div className="tabs">
      <button className={!following ? 'selected' : ''} onClick={() => setFollowing(false)}>{t.scoreAll}</button>
      <button className={following ? 'selected' : ''} onClick={() => setFollowing(true)}>{t.scoreFollowing}</button>
    </div><label className="date-select"><Clock3 size={18} /><select aria-label={copy(locale, '按日期筛选赛果', '按日期篩選賽果', 'Filter results by date')} value={date} onChange={event => setDate(event.target.value)}>
      <option value="all">{t.sevenDays}</option>{dates.map(day => <option value={day} key={day}>{matchDateLabel(`${day}T12:00:00`, locale)}</option>)}
    </select></label></div><div className="match-grid">{rows.map(match => <button className={'result-row match-tile' + (selected?.id === match.id ? ' active' : '')} key={match.id} onClick={() => setSelectedId(match.id)}>
      <div className="match-top"><span>{localizeLeague(match.league, locale)}</span><span>{matchDateLabel(match.utcDate, locale)}</span><b>FT</b></div>
      <div className="match-pair"><div><Crest name={match.teamHome} color={match.colors[0]} /><strong>{localizeClub(match.home, locale)}</strong></div><b className="score">{match.hs}<i>:</i>{match.as}</b><div><Crest name={match.teamAway} color={match.colors[1]} /><strong>{localizeClub(match.away, locale)}</strong></div></div>
      <div className="match-bottom">{copy(locale, '查看赛果', '查看賽果', 'View result')}<ArrowUpRight size={18} /></div>
    </button>)}</div>{!rows.length && <div className="empty-state">{copy(locale, '最近七天没有符合条件的完赛记录。', '最近七天沒有符合條件的完賽紀錄。', 'No finished matches match these filters in the last seven days.')}</div>}
      <p className="data-note">{copy(locale, '赛后数据 · 上次更新：', '賽後數據 · 上次更新：', 'Post-match data · Updated: ')}{updatedLabel(data.updatedAt, locale)}</p>
    </section>{selected && <section id="match-center" className="match-center"><SectionTitle kicker="POST MATCH" title={copy(locale, '比赛中心', '比賽中心', 'Match center')} /><div className="recap-card"><span className="tag">{copy(locale, '真实赛果', '真實賽果', 'Verified result')}</span><h3>{localizeClub(selected.home, locale)} <span>{selected.hs} — {selected.as}</span> {localizeClub(selected.away, locale)}</h3><p>{copy(locale, '免费数据源暂不提供完整进球事件与阵容。', '免費數據源暫不提供完整入球事件與陣容。', 'Detailed goal events and lineups are not available on the free data plan.')}</p></div></section>}</>;
}

function LiveStandings({ locale, data }: { locale: Locale; data: FootballSnapshot }) {
  const [league, setLeague] = useState('英超');
  const standing = data.standings[league];
  return <section id="standings"><PageTitle title={copy(locale, '积分榜', '積分榜', 'Standings')} description={copy(locale, '每一分，都在改写故事。', '每一分，都在改寫故事。', 'Every point changes the story.')} label="THE TABLE" />
    <div className="data-card"><div className="table-toolbar"><div className="tabs scroll-tabs">{leagues.map(name => <button className={league === name ? 'selected' : ''} onClick={() => setLeague(name)} key={name}>{localizeLeague(name, locale)}</button>)}</div><span className="season-label">{standing?.season || '—'}</span></div>
      {standing?.groups.length ? standing.groups.map((group, index) => <div key={group.name || index}>{standing.groups.length > 1 && <h2 className="standings-group-heading">{group.name.replace('_', ' ')}</h2>}<div className="table-scroll"><table className="standings-table"><thead><tr>{['#', copy(locale, '球队', '球隊', 'Club'), copy(locale, '场次', '場次', 'P'), copy(locale, '胜 / 平 / 负', '勝 / 和 / 負', 'W / D / L'), copy(locale, '净胜球', '淨勝球', 'GD'), copy(locale, '积分', '積分', 'PTS')].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{group.rows.map(row => <tr key={row.pos + row.team}><td><span className={'rank ' + (row.pos <= 3 ? 'top-rank' : '')}>{row.pos}</span></td><td><span className="table-club"><Crest name={row.team} color={row.color} small />{localizeClub(row.team, locale)}</span></td><td>{row.p}</td><td>{row.w} / {row.d} / {row.l}</td><td>{row.gd}</td><td><strong className="points">{row.pts}</strong></td></tr>)}</tbody></table></div></div>) : <div className="empty-state"><Trophy size={35} /><h3>{localizeLeague(league, locale)}</h3><p>{copy(locale, '此赛事目前没有可用积分榜。', '此賽事目前沒有可用積分榜。', 'No standings are available for this competition right now.')}</p></div>}
      <p className="data-note">{copy(locale, '当前赛季积分榜 · 上次更新：', '目前賽季積分榜 · 上次更新：', 'Current season standings · Updated: ')}{updatedLabel(data.updatedAt, locale)}</p>
    </div></section>;
}

function Teams({ locale, favorites, toggleFavorite, onPick }) {
  const [q, setQ] = useState('');
  const rows = teams.filter(t => (t.name + t.en).toLowerCase().includes(q.toLowerCase()));
  return <section id="clubs"><PageTitle title={copy(locale, '找到你的主队', '找到你的主隊', 'Find your club')} description={copy(locale, '不同的队徽，同样的热爱。', '不同的隊徽，同樣的熱愛。', 'Different badges. The same love.')} label="YOUR COLORS" icon={Shield} /><div className="page-tools"><label className="inline-search"><Search size={19} /><input aria-label={words[locale].choose} value={q} onChange={e => setQ(e.target.value)} placeholder={copy(locale, '搜索球队', '搜尋球隊', 'Search clubs')} /></label><button className="button primary" onClick={onPick}>{words[locale].choose}<Plus size={18} /></button></div><div className="club-grid">{rows.map(t => <article className="club-card" key={t.short} style={{ '--club': t.color } as React.CSSProperties}><div className="club-card-top"><span>{localizeLeague(t.league, locale)}</span><span>{t.short}</span></div><Crest name={t.short} color={t.color} /><h2>{locale === 'en' ? t.en : localizeClub(t.name, locale)}</h2><span className="club-english">{t.en.toUpperCase()}</span><button className={favorites.includes(t.short) ? 'club-follow followed' : 'club-follow'} aria-pressed={favorites.includes(t.short)} onClick={() => toggleFavorite(t.short)}>{favorites.includes(t.short) ? <Check size={19} /> : <Plus size={19} />}{favorites.includes(t.short) ? copy(locale, '已关注', '已關注', 'Following') : copy(locale, '关注球队', '關注球隊', 'Follow club')}</button></article>)}</div>{!rows.length && <div className="empty-state">{words[locale].noSearch}</div>}</section>;
}
function Players({ locale }) {
  const [metric, setMetric] = useState('goals');
  const rows = [...playerLeaders].sort((a,b) => b[metric] - a[metric]);
  const labels = { goals:copy(locale,'进球','進球','Goals'), assists:copy(locale,'助攻','助攻','Assists'), apps:copy(locale,'出场','出場','Apps') };
  return <section id="players"><PageTitle title={copy(locale,'球员数据','球員數據','Player stats')} description={copy(locale,'场上的主角，数字里的故事。','場上的主角，數字裡的故事。','The players behind the numbers.')} label="GAME CHANGERS" icon={Zap} /><div className="player-podium">{rows.slice(0,3).map((p,i) => <article className="player-highlight" key={p.en} style={{ '--club': p.color } as React.CSSProperties}><span className="player-position">0{i+1} / {labels[metric]}</span><div className="player-initial" aria-hidden="true">{p.en.split(' ').map(n=>n[0]).join('')}</div><strong className="player-stat">{p[metric]}</strong><h2>{locale === 'en' ? p.en : p.name}</h2><p>{locale === 'en' ? p.enTeam : p.team} · {locale === 'en' ? p.enPosition : p.position}</p></article>)}</div><div className="data-card"><div className="table-toolbar"><div className="tabs">{Object.entries(labels).map(([key,label])=><button key={key} className={metric===key?'selected':''} onClick={()=>setMetric(key)}>{label}</button>)}</div><span className="season-label">2026 / 27</span></div><div className="table-scroll"><table className="players-table"><thead><tr><th>{copy(locale,'球员','球員','Player')}</th><th>{labels.apps}</th><th>{labels.goals}</th><th>{labels.assists}</th></tr></thead><tbody>{rows.map(p=><tr key={p.en}><td><div className="table-club"><Crest name={p.en} color={p.color} small /><span><b>{locale==='en'?p.en:p.name}</b><small>{p.nationality} · {locale==='en'?p.enPosition:p.position} · {locale==='en'?p.enTeam:p.team}</small></span></div></td><td>{p.apps}</td><td>{p.goals}</td><td>{p.assists}</td></tr>)}</tbody></table></div><p className="data-note">{copy(locale,'当前赛季示例数据 · 可按进球、助攻或出场排序','目前賽季示例數據 · 可按進球、助攻或出場排序','Sample season data · Sort by goals, assists or appearances')}</p></div></section>;
}

export default function App() {
  const [page,setPage]=useState(readRoute), [locale,setLocale]=useState(browserLocale), [theme,setTheme]=useState(localStorage.getItem('kickoff-theme')||'light');
  const [favorites,setFavorites]=useState(()=>readSaved('kickoff-teams',[])), [draft,setDraft]=useState([]), [modal,setModal]=useState(null), [article,setArticle]=useState(null), [menu,setMenu]=useState(false);
  const [query,setQuery]=useState(''), [searchFilter,setSearchFilter]=useState(0);
  const root=useRef(null); const t=words[locale]; const idx=localeIndex[locale]; const [snapshot,setSnapshot]=useState<FootballSnapshot | null>(null);
  useEffect(()=>{ document.documentElement.lang=locale; localStorage.setItem('kickoff-locale',locale); },[locale]);
  useEffect(()=>{ const controller=new AbortController(); fetch('/data/football.json',{signal:controller.signal,cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{if(isFootballSnapshot(data))setSnapshot(data);}).catch(()=>{}); return ()=>controller.abort(); },[]);
  useEffect(()=>{ const media=matchMedia('(prefers-color-scheme: dark)'); const apply=()=>document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme; apply();localStorage.setItem('kickoff-theme',theme);media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply); },[theme]);
  useEffect(()=>{const onPop=()=>{setPage(readRoute());setMenu(false);window.scrollTo(0,0);};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
  useEffect(()=>{const key=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setModal('search');}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);
  useEffect(()=>{if(!localStorage.getItem('kickoff-onboarded')){const id=setTimeout(()=>{setDraft(favorites);setModal('teams');},1400);return()=>clearTimeout(id);}},[]);
  useLayoutEffect(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const ctx=gsap.context(()=>{gsap.from('.reveal',{y:14,opacity:0,duration:.45,stagger:.06,ease:'power2.out',clearProps:'all'});},root);return()=>ctx.revert();},[page]);
  const navigate=route=>{history.pushState({},'',route==='home'?'/':'/'+route);setPage(route);setMenu(false);setModal(null);window.scrollTo({top:0,behavior:'instant'});};
  const persist=next=>{setFavorites(next);localStorage.setItem('kickoff-teams',JSON.stringify(next));};
  const toggleFavorite=code=>persist(favorites.includes(code)?favorites.filter(v=>v!==code):[...favorites,code]);
  const openPicker=()=>{setDraft([...favorites]);setModal('teams');};
  const closeModal=()=>{if(modal==='teams')localStorage.setItem('kickoff-onboarded','1');setModal(null);};
  const openArticle=a=>{setArticle(a);setModal('article');};
  const items: Array<{ kind: number; title: string; meta: string; article?: (typeof articles)[number]; route?: string }> = [...articles.map(a=>({kind:1,title:a.title[idx],meta:localizeLeague(a.league.split(' · ')[0],locale),article:a})),...teams.map(v=>({kind:2,title:locale==='en'?v.en:v.name,meta:localizeLeague(v.league,locale),route:'teams'})),...playerLeaders.map(v=>({kind:3,title:locale==='en'?v.en:v.name,meta:locale==='en'?v.enTeam:v.team,route:'players'})),...(snapshot?.matches || results).map(v=>({kind:4,title:`${localizeClub(v.home,locale)} ${v.hs} — ${v.as} ${localizeClub(v.away,locale)}`,meta:localizeLeague(v.league,locale),route:'matches'}))];
  const searchResults=items.filter(v=>(!searchFilter||v.kind===searchFilter)&&(v.title+' '+v.meta).toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="app-shell" data-page={page} ref={root}><div className="announcement"><span>THE GAME IS OURS.</span><span>{t.tagline} <span aria-hidden="true">✳</span> EST. 2026</span></div><header className="site-header"><div className="header-inner"><button className="brand" onClick={()=>navigate('home')} aria-label="Kickoff home"><span className="logo-mark">K<span>↗</span></span><b>kickoff<span>.</span></b></button><nav className={menu?'primary-nav nav-open':'primary-nav'} aria-label="主导航">{routes.map((r,i)=><button key={r} className={page===r?'active':''} aria-current={page===r?'page':undefined} onClick={()=>navigate(r)}>{t.nav[i]}</button>)}</nav><div className="header-actions"><button className="header-search" aria-label={t.openSearch} onClick={()=>setModal('search')}><Search size={20}/><span>{copy(locale,'搜点什么','搜點甚麼','Search')}</span><kbd>⌘ K</kbd></button><select aria-label={t.language} value={locale} onChange={e=>setLocale(e.target.value as Locale)}><option value="zh-CN">简</option><option value="zh-TW">繁</option><option value="en">EN</option></select><button className="icon-button" aria-label={t.theme} title={theme} onClick={()=>setTheme(theme==='light'?'dark':theme==='dark'?'system':'light')}>{theme==='dark'?<Moon size={20}/>:theme==='system'?<Globe2 size={20}/>:<Sun size={20}/>}</button><button className="menu-button icon-button" aria-label="Menu" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div></div></header>
  <main className="page-container" key={page}>{page==='home'||page==='news'?<NewsFeed locale={locale} onOpen={openArticle} home={page==='home'} navigate={navigate} onJoin={()=>setModal('join')} onPick={openPicker}/>:page==='matches'?(snapshot?<LiveMatches locale={locale} favorites={favorites} data={snapshot}/>:<Matches locale={locale} favorites={favorites}/>):page==='standings'?(snapshot?<LiveStandings locale={locale} data={snapshot}/>:<Standings locale={locale}/>):page==='teams'?<Teams locale={locale} favorites={favorites} toggleFavorite={toggleFavorite} onPick={openPicker}/>:<Players locale={locale}/>}</main>
  <footer className="site-footer"><div><b>kickoff<span>↗</span></b><p>{t.footer}</p></div><div className="footer-right"><span>© 2026 KICKOFF</span><span>FOOTBALL NEVER ENDS.</span>{snapshot&&<a href="https://www.football-data.org/" target="_blank" rel="noopener noreferrer">Football data provided by the Football-Data.org API</a>}</div></footer>
  {modal==='teams'&&<Modal title={t.chooseTitle} onClose={closeModal}><p className="modal-description">{t.chooseNote}</p><div className="team-picker-grid">{teams.map(v=><button className={'team-choice'+(draft.includes(v.short)?' chosen':'')} key={v.short} onClick={()=>setDraft(draft.includes(v.short)?draft.filter(a=>a!==v.short):[...draft,v.short])} aria-pressed={draft.includes(v.short)}><Crest name={v.short} color={v.color} small/><span><b>{locale==='en'?v.en:localizeClub(v.name,locale)}</b><small>{localizeLeague(v.league,locale)}</small></span>{draft.includes(v.short)?<Check size={21}/>:<Plus size={21}/>}</button>)}</div><div className="modal-actions"><button className="text-link" onClick={closeModal}>{t.skip}</button><button className="button primary" onClick={()=>{persist(draft);closeModal();}}>{t.save}<ArrowRight size={19}/></button></div><p className="data-note">{t.local}</p></Modal>}
  {modal==='search'&&<Modal title={t.searchTitle} onClose={closeModal} wide><label className="search-input"><Search size={24}/><input autoFocus aria-label={t.search} value={query} placeholder={t.search} onChange={e=>setQuery(e.target.value)}/></label><div className="tabs search-filters">{t.filters.map((v,i)=><button className={searchFilter===i?'selected':''} key={v} onClick={()=>setSearchFilter(i)}>{v}</button>)}</div><div className="search-results">{query.trim()?searchResults.length?searchResults.map((v,i)=><button className="search-result" key={i} onClick={()=>v.article?openArticle(v.article):navigate(v.route)}><span className="tag">{t.filters[v.kind]}</span><span><b>{v.title}</b><small>{v.meta}</small></span><ArrowUpRight size={22}/></button>):<p className="empty-state">{t.noSearch}</p>:<p className="search-hint"><Zap size={21}/>{t.searchTip}</p>}</div></Modal>}
  {modal==='article'&&article&&<Modal title={article.title[idx]} onClose={closeModal} wide><div className="story-meta"><span className="tag">{localizeLeague(article.league.split(' · ')[0],locale)}</span><span>{copy(locale,'示例摘要','示例摘要','Sample summary')}</span></div><p className="article-summary">{article.summary[idx]}</p><p className="data-note">{copy(locale,'这是版式预览内容。真实新闻上线后会提供媒体来源和原文链接。','這是版面預覽內容。真實新聞上線後會提供媒體來源和原文連結。','This is sample editorial content. Published news will include its source and original link.')}</p><div className="article-comments"><MessageCircle size={23}/><h3>{copy(locale,'这球，你怎么看？','這球，你怎麼看？','What’s your take?')}</h3><p>{copy(locale,'登录功能上线后，即可在新闻下评论。','登入功能上線後，即可在新聞下評論。','Comments will open when sign-in launches.')}</p></div></Modal>}
  {modal==='join'&&<Modal title={copy(locale,'看台为你留了位置','看台為你留了位置','Your place in the stands')} onClose={closeModal}><div className="join-art" aria-hidden="true">✳</div><p className="modal-description">{copy(locale,'评论、点赞和回复会在登录功能上线后开放。现在可以先关注主队。','評論、點讚和回覆會在登入功能上線後開放。現在可以先關注主隊。','Comments, likes and replies will open with sign-in. You can choose your clubs now.')}</p><button className="button primary" onClick={openPicker}>{t.choose}<ArrowRight size={19}/></button></Modal>}
  </div>;
}
