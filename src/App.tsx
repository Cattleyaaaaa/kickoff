import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowUpRight, ArrowRight, ArrowDown, Search, Sun, Moon, Globe2, Menu, X, Check, Plus, Trophy, UsersRound, MessageCircle, Heart, SlidersHorizontal, Clock3, ChevronRight, Shield, Zap, MoveUpRight } from 'lucide-react';
import { teams, articles, extraStories, discussions, words, localeIndex, localizeLeague, localizeClub, localizePlayer, browserLocale } from './data';
import type { FootballSnapshot } from '../scripts/football-transform';
import { isPublishablePlayerStatsSnapshot } from '../scripts/player-transform';
import type { PlayerStatsSnapshot } from '../scripts/player-transform';
import { isAdvancedStatsSnapshot } from './advancedSnapshot';
import type { AdvancedStatsSnapshot } from './advancedSnapshot';
import { getClubMark } from './clubIdentity';
import BayernKit from './BayernKit';
import StatsBoard from './StatsBoard';
import TeamStandingsBoard from './TeamStandingsBoard';
import { playerMetricGroups, playerValues, teamMetricGroups, teamValues } from './metricCatalog';
import './ui.css';
import './club-identity.css';
import './club-kits-2627.css';
import './player-stats.css';
import './team-hub.css';
import './team-picker.css';
import './matches.css';

const routes = ['home', 'news', 'matches', 'standings', 'team-stats', 'teams', 'players'];
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

function Crest({ name, code = undefined, color = '#7377db', small = false }) {
  const mark = getClubMark(name, color, code);
  return <span className={`crest ${mark.dedicatedKit ? `crest-kit crest-kit-${mark.code}` : `crest-${mark.pattern}`}${mark.pattern === 'bayern' ? ' crest-bayern' : ''}${small ? ' crest-small' : ''}`} style={{ '--club': mark.primary, '--club-secondary': mark.accent, '--club-trim': mark.trim } as React.CSSProperties} aria-hidden="true">{mark.pattern === 'bayern' && <BayernKit />}<span className="crest-code">{mark.code}</span></span>;
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
function UnavailableMatches({ locale }: { locale: Locale }) {
  return <><PageTitle title={words[locale].results} description={words[locale].resultsSub} label="FULL TIME" /><section className="results-panel"><div className="empty-state"><Trophy size={38} /><h2>{copy(locale, '赛果暂不可用', '賽果暫不可用', 'Results unavailable')}</h2><p>{copy(locale, '真实数据尚未同步成功，请稍后刷新。', '真實數據尚未同步成功，請稍後重新整理。', 'Verified data has not synced yet. Please refresh later.')}</p></div></section></>;
}
function LiveMatches({ locale, favorites, data }: { locale: Locale; favorites: string[]; data: FootballSnapshot }) {
  const t = words[locale];
  const isStale = Date.now() - new Date(data.updatedAt).getTime() > 24 * 60 * 60 * 1000;
  const [view, setView] = useState<'schedule' | 'results'>('schedule');
  const [date, setDate] = useState('all');
  const [month, setMonth] = useState('all');
  const [league, setLeague] = useState('all');
  const [following, setFollowing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(40);
  const [teamQuery, setTeamQuery] = useState('');
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 6);
  const recent = data.matches.filter(match => new Date(match.utcDate) >= cutoff);
  const dates = [...new Set(recent.map(match => localDateKey(match.utcDate)))];
  const rows = recent.filter(match => (date === 'all' || localDateKey(match.utcDate) === date)
    && (league === 'all' || match.league === league)
    && (teamQuery === '' || `${match.home} ${match.away}`.toLowerCase().includes(teamQuery.toLowerCase()))
    && (!following || favorites.includes(match.teamHome) || favorites.includes(match.teamAway)));
  const schedule = [...(data.fixtures || [])].filter(match => (league === 'all' || match.league === league)
    && (month === 'all' || match.utcDate.slice(0, 7) === month)
    && (`${match.home} ${match.away}`.toLowerCase().includes(teamQuery.toLowerCase()))
    && (!following || favorites.includes(match.teamHome) || favorites.includes(match.teamAway)))
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  const months = [...new Set((data.fixtures || []).map(match => match.utcDate.slice(0, 7)))].sort();
  const selected = rows.find(match => match.id === selectedId) || rows[0];
  const statusLabel = (status: string) => status === 'FINISHED' || status === 'FINISHED_AET' || status === 'FINISHED_PEN'
    ? copy(locale, '完赛', '已完賽', 'FT')
    : status === 'POSTPONED' ? copy(locale, '延期', '延期', 'Postponed')
      : status === 'SUSPENDED' ? copy(locale, '暂停', '暫停', 'Suspended')
        : status === 'IN_PLAY' || status === 'PAUSED' ? copy(locale, '进行中', '進行中', 'Live')
          : copy(locale, '未开赛', '未開賽', 'Scheduled');
  const matchDate = (utcDate: string) => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(utcDate));
  return <><PageTitle title={copy(locale, '比赛中心', '賽事中心', 'Match center')} description={copy(locale, '查看本赛季完整赛程，也可切换到近期赛果。', '查看本賽季完整賽程，也可切換至近期賽果。', 'Browse this season’s full fixture list and recent results.')} label="FIXTURES / FULL TIME" />
    <section className="results-panel reveal">{isStale && <p className="stats-unavailable" role="status">{copy(locale, '数据已超过 24 小时未更新，近期赛果可能不完整。', '資料已超過 24 小時未更新，近期賽果可能不完整。', 'Data has not updated for over 24 hours; recent results may be incomplete.')}</p>}
      <div className="match-view-tabs tabs"><button className={view === 'schedule' ? 'selected' : ''} onClick={() => { setView('schedule'); setVisibleCount(40); }}>{copy(locale, '本赛季赛程', '本賽季賽程', 'Season fixtures')}<span>{data.fixtures?.length ?? 0}</span></button><button className={view === 'results' ? 'selected' : ''} onClick={() => setView('results')}>{copy(locale, '近期赛果', '近期賽果', 'Recent results')}<span>{recent.length}</span></button></div>
      <div className="match-filters"><label className="match-filter"><span>{copy(locale, '赛事', '賽事', 'Competition')}</span><select value={league} onChange={event => setLeague(event.target.value)}><option value="all">{copy(locale, '全部赛事', '全部賽事', 'All competitions')}</option>{leagues.map(name => <option key={name} value={name}>{localizeLeague(name, locale)}</option>)}</select></label>
        {view === 'schedule' ? <label className="match-filter"><span>{copy(locale, '月份', '月份', 'Month')}</span><select value={month} onChange={event => { setMonth(event.target.value); setVisibleCount(40); }}><option value="all">{copy(locale, '整个赛季', '整個賽季', 'Full season')}</option>{months.map(value => <option key={value} value={value}>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(new Date(`${value}-01T12:00:00`))}</option>)}</select></label>
          : <label className="match-filter"><span>{copy(locale, '日期', '日期', 'Date')}</span><select value={date} onChange={event => setDate(event.target.value)}><option value="all">{t.sevenDays}</option>{dates.map(day => <option value={day} key={day}>{matchDateLabel(`${day}T12:00:00`, locale)}</option>)}</select></label>}
        <label className="match-filter match-search"><span>{copy(locale, '球队', '球隊', 'Team')}</span><input value={teamQuery} onChange={event => { setTeamQuery(event.target.value); setVisibleCount(40); }} placeholder={copy(locale, '搜索球队', '搜尋球隊', 'Search teams')} /></label>
        <button className={'button match-follow-filter' + (following ? ' selected' : '')} onClick={() => setFollowing(!following)}>{following ? <Check size={18} /> : <UsersRound size={18} />}{copy(locale, '关注球队', '關注球隊', 'Followed teams')}</button>
      </div>
      {view === 'schedule' ? <><p className="schedule-season-note">{copy(locale, `本赛季共收录 ${schedule.length} 场比赛。选择赛事或月份可缩小范围。`, `本賽季共收錄 ${schedule.length} 場比賽。選擇賽事或月份可縮小範圍。`, `${schedule.length} fixtures in this season view. Filter by competition or month.`)}</p><div className="match-grid">{schedule.slice(0, visibleCount).map(match => <article className="match-tile schedule-tile" key={match.id}><div className="match-top"><span>{localizeLeague(match.league, locale)}</span><span>{matchDate(match.utcDate)}</span><b>{statusLabel(match.status)}</b></div><div className="match-pair"><div><Crest name={match.home} code={match.teamHome} color={match.colors[0]} /><strong>{localizeClub(match.home, locale)}</strong></div><b className="score">{Number.isInteger(match.hs) && Number.isInteger(match.as) ? <>{match.hs}<i>:</i>{match.as}</> : <i>VS</i>}</b><div><Crest name={match.away} code={match.teamAway} color={match.colors[1]} /><strong>{localizeClub(match.away, locale)}</strong></div></div><div className="match-bottom">{statusLabel(match.status)}<ArrowUpRight size={18} /></div></article>)}</div>{!schedule.length && <div className="empty-state">{copy(locale, '当前本地赛程文件为空。同步最新数据后即可查看本赛季完整赛程。', '目前本地賽程檔案為空。同步最新資料後即可查看本賽季完整賽程。', 'The local fixture snapshot is empty. Sync the latest data to view the full season.')}</div>}{schedule.length > visibleCount && <button className="button load-more-matches" onClick={() => setVisibleCount(count => count + 40)}>{copy(locale, `再显示 40 场（剩余 ${schedule.length - visibleCount} 场）`, `再顯示 40 場（剩餘 ${schedule.length - visibleCount} 場）`, `Load 40 more (${schedule.length - visibleCount} left)`)}</button>}</>
        : <><div className="results-toolbar"><div className="tabs"><button className={!following ? 'selected' : ''} onClick={() => setFollowing(false)}>{t.scoreAll}</button><button className={following ? 'selected' : ''} onClick={() => setFollowing(true)}>{t.scoreFollowing}</button></div></div><div className="match-grid">{rows.map(match => <button className={'result-row match-tile' + (selected?.id === match.id ? ' active' : '')} key={match.id} onClick={() => setSelectedId(match.id)}><div className="match-top"><span>{localizeLeague(match.league, locale)}</span><span>{matchDate(match.utcDate)}</span><b>FT</b></div><div className="match-pair"><div><Crest name={match.home} code={match.teamHome} color={match.colors[0]} /><strong>{localizeClub(match.home, locale)}</strong></div><b className="score">{match.hs}<i>:</i>{match.as}</b><div><Crest name={match.away} code={match.teamAway} color={match.colors[1]} /><strong>{localizeClub(match.away, locale)}</strong></div></div>{match.penalties && <p className="penalty-note">{copy(locale, '点球大战', '十二碼決勝', 'Penalties')} {match.penalties.home}:{match.penalties.away}</p>}<div className="match-bottom">{copy(locale, '查看赛果', '查看賽果', 'View result')}<ArrowUpRight size={18} /></div></button>)}</div>{!rows.length && <div className="empty-state">{copy(locale, '最近七天没有符合条件的完赛记录。', '最近七天沒有符合條件的完賽紀錄。', 'No finished matches match these filters in the last seven days.')}</div>}</>}
      <p className="data-note">{copy(locale, '数据来源：Football-Data.org · 上次更新：', '資料來源：Football-Data.org · 上次更新：', 'Source: Football-Data.org · Updated: ')}{updatedLabel(data.updatedAt, locale)} · <a href="https://www.football-data.org/" target="_blank" rel="noopener noreferrer">{copy(locale, '查看数据来源', '查看資料來源', 'View source')}</a></p>
    </section>{view === 'results' && selected && <section id="match-center" className="match-center"><SectionTitle kicker="POST MATCH" title={copy(locale, '比赛中心', '賽事中心', 'Match center')} /><div className="recap-card"><span className="tag">{copy(locale, '真实赛果', '真實賽果', 'Verified result')}</span><h3>{localizeClub(selected.home, locale)} <span>{selected.hs} — {selected.as}</span> {localizeClub(selected.away, locale)}</h3>{selected.penalties && <p>{copy(locale, '点球大战', '十二碼決勝', 'Penalty shootout')} {selected.penalties.home}:{selected.penalties.away}</p>}<p>{copy(locale, '免费数据源暂不提供完整进球事件与阵容。', '免費數據源暫不提供完整入球事件與陣容。', 'Detailed goal events and lineups are not available on the free data plan.')}</p></div></section>}</>;
}

function CompetitionTabs({ locale, league, onChange }: { locale: Locale; league: string; onChange: (league: string) => void }) {
  return <div className="team-league-picker tabs scroll-tabs" aria-label={copy(locale, '选择赛事', '選擇賽事', 'Choose competition')}>{leagues.map(name => <button key={name} className={league === name ? 'selected' : ''} onClick={() => onChange(name)}>{localizeLeague(name, locale)}</button>)}</div>;
}

function StandingsPage({ locale, data }: { locale: Locale; data: FootballSnapshot | null }) {
  const [league, setLeague] = useState('英超');
  return <section className="standings-page">
    <PageTitle title={copy(locale, '联赛积分榜', '聯賽積分榜', 'League standings')} description={copy(locale, '查看各项赛事排名、积分和晋级区间。', '查看各項賽事排名、積分和晉級區間。', 'Standings, points and qualification zones by competition.')} label="LEAGUE TABLE" icon={Trophy} />
    <CompetitionTabs locale={locale} league={league} onChange={setLeague} />
    <TeamStandingsBoard key={league} locale={locale} league={league} data={data} />
  </section>;
}

function TeamStatsPage({ locale, data, advanced }: { locale: Locale; data: FootballSnapshot | null; advanced: AdvancedStatsSnapshot | null }) {
  const [league, setLeague] = useState('英超');
  const standing = data?.standings[league];
  const preview = advanced?.leagues[league];
  const baseEntries = (standing?.groups.flatMap(group => group.rows) || []).map(row => {
    const advanced = data?.teamStatsSource && row.id !== null ? data.teamStats?.[league]?.[String(row.id)] : undefined;
    return { id: String(row.id ?? row.team), position: row.pos, name: localizeClub(row.team, locale), sub: `${row.p} ${copy(locale, '场', '場', 'played')}`, crest: <Crest name={row.team} color={row.color} small />, values: teamValues(row, advanced) };
  });
  const entries = preview?.teams.length ? preview.teams.map(team => ({
    id: team.id, name: localizeClub(team.name, locale),
    sub: `${team.games} ${copy(locale, '场', '場', 'played')}`,
    crest: <Crest name={team.name} small />, values: team.values,
  })) : baseEntries;
  const source = preview?.teams.length
    ? `PitchAPI · ${updatedLabel(advanced!.updatedAt, locale)} · ${copy(locale, '球队统计覆盖', '球隊統計涵蓋', 'Team stats cover')} ${preview.teamStatsMatches}/${preview.finishedMatches} ${copy(locale, '场完赛', '場完賽', 'finished matches')}${advanced?.localRepair ? ` · ${copy(locale, '本地离线修复快照', '本地離線修復快照', 'Locally repaired snapshot')}` : ''}`
    : data
    ? `${copy(locale, '积分榜基础数据：', '積分榜基礎資料：', 'Standings base: ')}Football-Data.org · ${updatedLabel(data.updatedAt, locale)}${data.teamStatsSource ? ` | GOAL API · ${updatedLabel(data.teamStatsSource.updatedAt, locale)}` : ''}`
    : copy(locale, '等待数据同步', '等待資料同步', 'Waiting for data sync');
  return <section className="team-stats-page">
    <PageTitle title={copy(locale, '球队榜', '球隊榜', 'Team stats')} description={copy(locale, '比较各队进攻、传控、防守和纪律表现。', '比較各隊進攻、傳控、防守和紀律表現。', 'Compare team attack, passing, defence and discipline.')} label="CLUB NUMBERS" icon={Shield} />
    <CompetitionTabs locale={locale} league={league} onChange={setLeague} />
    <StatsBoard key={league} locale={locale} entries={entries} groups={teamMetricGroups} source={source} />
  </section>;
}

function Teams({ locale, favorites, toggleFavorite, onPick, clubs }: { locale: Locale; favorites: string[]; toggleFavorite: (code: string) => void; onPick: () => void; clubs: Array<{ name: string; en: string; short: string; color: string; league: string }> }) {
  const [q, setQ] = useState('');
  const [league, setLeague] = useState('英超');
  const rows = clubs.filter(t => t.league === league && (t.name + t.en + t.short).toLowerCase().includes(q.toLowerCase()));
  return <section id="clubs" className="team-hub">
    <PageTitle title={copy(locale, '球队中心', '球隊中心', 'Club center')} description={copy(locale, '浏览球队资料，找到并关注你的主队。', '瀏覽球隊資料，找到並關注你的主隊。', 'Explore clubs and follow the teams you support.')} label="YOUR COLORS" icon={Shield} />
    <div className="team-league-picker tabs scroll-tabs" aria-label={copy(locale, '选择赛事', '選擇賽事', 'Choose competition')}>{leagues.map(name => <button key={name} className={league === name ? 'selected' : ''} onClick={() => setLeague(name)}>{localizeLeague(name, locale)}</button>)}</div>
    <section className="team-hub-section"><SectionTitle kicker="YOUR COLORS" title={copy(locale, '找到你的主队', '找到你的主隊', 'Find your club')} /><div className="page-tools"><label className="inline-search"><Search size={19} /><input aria-label={words[locale].choose} value={q} onChange={e => setQ(e.target.value)} placeholder={copy(locale, '搜索球队', '搜尋球隊', 'Search clubs')} /></label><button className="button primary" onClick={onPick}>{words[locale].choose}<Plus size={18} /></button></div><div className="club-grid">{rows.map(t => <article className="club-card" key={t.short} style={{ '--club': t.color } as React.CSSProperties}><div className="club-card-top"><span>{localizeLeague(t.league, locale)}</span><span>{t.short}</span></div><Crest name={t.short} color={t.color} /><h2>{locale === 'en' ? t.en : localizeClub(t.name, locale)}</h2><span className="club-english">{t.en.toUpperCase()}</span><button className={favorites.includes(t.short) ? 'club-follow followed' : 'club-follow'} aria-pressed={favorites.includes(t.short)} onClick={() => toggleFavorite(t.short)}>{favorites.includes(t.short) ? <Check size={19} /> : <Plus size={19} />}{favorites.includes(t.short) ? copy(locale, '已关注', '已關注', 'Following') : copy(locale, '关注球队', '關注球隊', 'Follow club')}</button></article>)}</div>{!rows.length && <div className="empty-state">{words[locale].noSearch}</div>}</section>
  </section>;
}
function Players({ locale, snapshot, advanced }: { locale: Locale; snapshot: PlayerStatsSnapshot | null; advanced: AdvancedStatsSnapshot | null }) {
  const [league, setLeague] = useState('英超');
  const selected = snapshot?.leagues[league];
  const preview = advanced?.leagues[league];
  const legacyEntries = (selected?.players || []).map(player => ({
    id: player.id,
    name: player.localizedNames?.[locale] || localizePlayer(player.name, locale),
    sub: [localizeClub(player.team, locale), player.position, player.nationality].filter(Boolean).join(' · '),
    values: playerValues(player),
  }));
  const entries = preview?.players.length ? preview.players.map(player => ({
    id: player.id, name: localizePlayer(player.name, locale),
    sub: [localizeClub(player.team, locale), player.position].filter(Boolean).join(' · '),
    values: player.values,
  })) : legacyEntries;
  return <section id="players">
    <PageTitle title={copy(locale, '球员数据', '球員數據', 'Player stats')} description={copy(locale, '按赛事查看已核实的赛季球员数据。', '按賽事查看已核實的賽季球員資料。', 'Verified season player statistics by competition.')} label="GAME CHANGERS" icon={Zap} />
    {!preview && !snapshot && <p className="stats-unavailable" role="status">{copy(locale, '尚未导入完整的本赛季球员统计快照。', '尚未匯入完整的本賽季球員統計快照。', 'No current-season player statistics snapshot has been imported yet.')}</p>}
    <div className="data-card player-league-card"><div className="table-toolbar player-toolbar"><div className="tabs scroll-tabs">{leagues.map(name => <button key={name} className={league === name ? 'selected' : ''} onClick={() => setLeague(name)}>{localizeLeague(name, locale)}</button>)}</div><span className="season-label">{preview?.season || selected?.season || '—'}</span></div></div>
    <StatsBoard key={league} locale={locale} entries={entries} groups={playerMetricGroups} source={preview ? `PitchAPI · ${updatedLabel(advanced!.updatedAt, locale)} · ${copy(locale, '球员统计覆盖', '球員統計涵蓋', 'Player stats cover')} ${preview.playerStatsMatches}/${preview.finishedMatches} ${copy(locale, '场完赛', '場完賽', 'finished matches')}${advanced?.localRepair ? ` · ${copy(locale, '本地离线修复快照', '本地離線修復快照', 'Locally repaired snapshot')}` : ''}` : selected ? `GOAL API · ${updatedLabel(snapshot!.updatedAt, locale)}` : copy(locale, '等待本赛季球员统计快照', '等待本賽季球員統計快照', 'Waiting for current-season player stats')} />
  </section>;
}
export default function App() {
  const [page,setPage]=useState(readRoute), [locale,setLocale]=useState(browserLocale), [theme,setTheme]=useState(localStorage.getItem('kickoff-theme')||'light');
  const [favorites,setFavorites]=useState(()=>readSaved('kickoff-teams',[])), [draft,setDraft]=useState([]), [modal,setModal]=useState(null), [article,setArticle]=useState(null), [menu,setMenu]=useState(false), [pickerQuery,setPickerQuery]=useState('');
  const [query,setQuery]=useState(''), [searchFilter,setSearchFilter]=useState(0);
  const root=useRef(null); const t=words[locale]; const idx=localeIndex[locale]; const [snapshot,setSnapshot]=useState<FootballSnapshot | null>(null);
  const [playerStats,setPlayerStats]=useState<PlayerStatsSnapshot | null>(null);
  const [advancedStats,setAdvancedStats]=useState<AdvancedStatsSnapshot | null>(null);
  const clubOptions = (() => {
    if (!snapshot) return teams;
    const byCode = new Map<string, { name: string; en: string; short: string; color: string; league: string }>();
    for (const league of leagues) for (const group of snapshot.standings[league]?.groups || []) for (const row of group.rows) {
      const mark = getClubMark(row.team, row.color);
      if (!byCode.has(mark.code)) byCode.set(mark.code, { name: row.team, en: row.team, short: mark.code, color: row.color || mark.primary, league });
    }
    return [...byCode.values()];
  })();
  useEffect(()=>{ document.documentElement.lang=locale; localStorage.setItem('kickoff-locale',locale); },[locale]);
  useEffect(()=>{ const controller=new AbortController(); (async()=>{ for(const url of ['/api/v1/football','/data/football.json']) { try { const response=await fetch(url,{signal:controller.signal,cache:'no-store'}); if(!response.ok)continue; const data=await response.json(); if(isFootballSnapshot(data)){setSnapshot(data);break;} } catch { if(controller.signal.aborted)break; } } })(); return ()=>controller.abort(); },[]);
  useEffect(()=>{ const controller=new AbortController(); fetch('/data/players.json',{signal:controller.signal,cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{if(isPublishablePlayerStatsSnapshot(data))setPlayerStats(data);}).catch(()=>{}); return ()=>controller.abort(); },[]);
  useEffect(()=>{ const controller=new AbortController(); fetch('/data/advanced.json',{signal:controller.signal,cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{if(isAdvancedStatsSnapshot(data))setAdvancedStats(data);}).catch(()=>{}); return ()=>controller.abort(); },[]);
  useEffect(()=>{ const media=matchMedia('(prefers-color-scheme: dark)'); const apply=()=>document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme; apply();localStorage.setItem('kickoff-theme',theme);media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply); },[theme]);
  useEffect(()=>{const onPop=()=>{setPage(readRoute());setMenu(false);window.scrollTo(0,0);};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
  useEffect(()=>{const key=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setModal('search');}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);
  useEffect(()=>{if(!localStorage.getItem('kickoff-onboarded')){const id=setTimeout(()=>{setDraft(favorites);setModal('teams');},1400);return()=>clearTimeout(id);}},[]);
  useLayoutEffect(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const ctx=gsap.context(()=>{gsap.from('.reveal',{y:14,opacity:0,duration:.45,stagger:.06,ease:'power2.out',clearProps:'all'});},root);return()=>ctx.revert();},[page]);
  const navigate=route=>{history.pushState({},'',route==='home'?'/':'/'+route);setPage(route);setMenu(false);setModal(null);window.scrollTo({top:0,behavior:'instant'});};
  const persist=next=>{setFavorites(next);localStorage.setItem('kickoff-teams',JSON.stringify(next));};
  const toggleFavorite=code=>persist(favorites.includes(code)?favorites.filter(v=>v!==code):[...favorites,code]);
  const openPicker=()=>{setDraft([...favorites]);setPickerQuery('');setModal('teams');};
  const closeModal=()=>{if(modal==='teams')localStorage.setItem('kickoff-onboarded','1');setModal(null);};
  const openArticle=a=>{setArticle(a);setModal('article');};
  const items: Array<{ kind: number; title: string; meta: string; article?: (typeof articles)[number]; route?: string }> = [...articles.map(a=>({kind:1,title:a.title[idx],meta:localizeLeague(a.league.split(' · ')[0],locale),article:a})),...clubOptions.map(v=>({kind:2,title:locale==='en'?v.en:localizeClub(v.name,locale),meta:localizeLeague(v.league,locale),route:'teams'})),...Object.values(playerStats?.leagues || {}).flatMap(group=>group.players.map(player=>({kind:3,title:player.localizedNames?.[locale] || localizePlayer(player.name,locale),meta:localizeClub(player.team,locale),route:'players'}))),...(snapshot?.matches || []).map(v=>({kind:4,title:`${localizeClub(v.home,locale)} ${v.hs} — ${v.as} ${localizeClub(v.away,locale)}`,meta:localizeLeague(v.league,locale),route:'matches'}))];
  const searchResults=items.filter(v=>(!searchFilter||v.kind===searchFilter)&&(v.title+' '+v.meta).toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="app-shell" data-page={page} ref={root}><div className="announcement"><span>THE GAME IS OURS.</span><span>{t.tagline} <span aria-hidden="true">✳</span> EST. 2026</span></div><header className="site-header"><div className="header-inner"><button className="brand" onClick={()=>navigate('home')} aria-label="Kickoff home"><span className="logo-mark">K<span>↗</span></span><b>kickoff<span>.</span></b></button><nav className={menu?'primary-nav nav-open':'primary-nav'} aria-label="主导航">{routes.map((r,i)=><button key={r} className={page===r?'active':''} aria-current={page===r?'page':undefined} onClick={()=>navigate(r)}>{t.nav[i]}</button>)}</nav><div className="header-actions"><button className="header-search" aria-label={t.openSearch} onClick={()=>setModal('search')}><Search size={20}/><span>{copy(locale,'搜点什么','搜點甚麼','Search')}</span><kbd>⌘ K</kbd></button><select aria-label={t.language} value={locale} onChange={e=>setLocale(e.target.value as Locale)}><option value="zh-CN">简</option><option value="zh-TW">繁</option><option value="en">EN</option></select><button className="icon-button" aria-label={t.theme} title={theme} onClick={()=>setTheme(theme==='light'?'dark':theme==='dark'?'system':'light')}>{theme==='dark'?<Moon size={20}/>:theme==='system'?<Globe2 size={20}/>:<Sun size={20}/>}</button><button className="menu-button icon-button" aria-label="Menu" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div></div></header>
  <main className="page-container" key={page}>{page==='home'||page==='news'?<NewsFeed locale={locale} onOpen={openArticle} home={page==='home'} navigate={navigate} onJoin={()=>setModal('join')} onPick={openPicker}/>:page==='matches'?(snapshot?<LiveMatches locale={locale} favorites={favorites} data={snapshot}/>:<UnavailableMatches locale={locale}/>):page==='standings'?<StandingsPage locale={locale} data={snapshot}/>:page==='team-stats'?<TeamStatsPage locale={locale} data={snapshot} advanced={advancedStats}/>:page==='teams'?<Teams locale={locale} favorites={favorites} toggleFavorite={toggleFavorite} onPick={openPicker} clubs={clubOptions}/>:<Players locale={locale} snapshot={playerStats} advanced={advancedStats}/>}</main>
  <footer className="site-footer"><div><b>kickoff<span>↗</span></b><p>{t.footer}</p></div><div className="footer-right"><span>© 2026 KICKOFF</span><span>FOOTBALL NEVER ENDS.</span>{snapshot&&<a href="https://www.football-data.org/" target="_blank" rel="noopener noreferrer">Football data provided by the Football-Data.org API</a>}{playerStats && Object.keys(playerStats.leagues).length > 0 && <a href="https://goal-api.com/" target="_blank" rel="noopener noreferrer">Player stats provided by GOAL API</a>}</div></footer>
  {modal==='teams'&&<Modal title={t.chooseTitle} onClose={closeModal}><p className="modal-description">{t.chooseNote}</p><label className="team-picker-search"><Search size={19}/><input autoFocus value={pickerQuery} onChange={e=>setPickerQuery(e.target.value)} placeholder={copy(locale,'搜索球队名称或缩写','搜尋球隊名稱或縮寫','Search clubs or abbreviations')}/></label><div className="team-picker-grid">{clubOptions.filter(v=>(v.name+v.en+v.short+v.league).toLowerCase().includes(pickerQuery.trim().toLowerCase())).map(v=><button className={'team-choice'+(draft.includes(v.short)?' chosen':'')} key={v.short} onClick={()=>setDraft(draft.includes(v.short)?draft.filter(a=>a!==v.short):[...draft,v.short])} aria-pressed={draft.includes(v.short)}><Crest name={v.short} color={v.color} small/><span><b>{locale==='en'?v.en:localizeClub(v.name,locale)}</b><small>{localizeLeague(v.league,locale)}</small></span>{draft.includes(v.short)?<Check size={21}/>:<Plus size={21}/>}</button>)}</div><div className="modal-actions"><button className="text-link" onClick={closeModal}>{t.skip}</button><button className="button primary" onClick={()=>{persist(draft);closeModal();}}>{t.save}<ArrowRight size={19}/></button></div><p className="data-note">{t.local}</p></Modal>}
  {modal==='search'&&<Modal title={t.searchTitle} onClose={closeModal} wide><label className="search-input"><Search size={24}/><input autoFocus aria-label={t.search} value={query} placeholder={t.search} onChange={e=>setQuery(e.target.value)}/></label><div className="tabs search-filters">{t.filters.map((v,i)=><button className={searchFilter===i?'selected':''} key={v} onClick={()=>setSearchFilter(i)}>{v}</button>)}</div><div className="search-results">{query.trim()?searchResults.length?searchResults.map((v,i)=><button className="search-result" key={i} onClick={()=>v.article?openArticle(v.article):navigate(v.route)}><span className="tag">{t.filters[v.kind]}</span><span><b>{v.title}</b><small>{v.meta}</small></span><ArrowUpRight size={22}/></button>):<p className="empty-state">{t.noSearch}</p>:<p className="search-hint"><Zap size={21}/>{t.searchTip}</p>}</div></Modal>}
  {modal==='article'&&article&&<Modal title={article.title[idx]} onClose={closeModal} wide><div className="story-meta"><span className="tag">{localizeLeague(article.league.split(' · ')[0],locale)}</span><span>{copy(locale,'示例摘要','示例摘要','Sample summary')}</span></div><p className="article-summary">{article.summary[idx]}</p><p className="data-note">{copy(locale,'这是版式预览内容。真实新闻上线后会提供媒体来源和原文链接。','這是版面預覽內容。真實新聞上線後會提供媒體來源和原文連結。','This is sample editorial content. Published news will include its source and original link.')}</p><div className="article-comments"><MessageCircle size={23}/><h3>{copy(locale,'这球，你怎么看？','這球，你怎麼看？','What’s your take?')}</h3><p>{copy(locale,'登录功能上线后，即可在新闻下评论。','登入功能上線後，即可在新聞下評論。','Comments will open when sign-in launches.')}</p></div></Modal>}
  {modal==='join'&&<Modal title={copy(locale,'看台为你留了位置','看台為你留了位置','Your place in the stands')} onClose={closeModal}><div className="join-art" aria-hidden="true">✳</div><p className="modal-description">{copy(locale,'评论、点赞和回复会在登录功能上线后开放。现在可以先关注主队。','評論、點讚和回覆會在登入功能上線後開放。現在可以先關注主隊。','Comments, likes and replies will open with sign-in. You can choose your clubs now.')}</p><button className="button primary" onClick={openPicker}>{t.choose}<ArrowRight size={19}/></button></Modal>}
  </div>;
}
