import type { FootballSnapshot } from '../scripts/football-transform';
import { localizeClub } from './data';
import { legendZones, zoneForPosition, zoneLabels, zoneRuleSources, zoneExplanations } from './qualificationZones';
import { getClubMark } from './clubIdentity';
import BayernKit from './BayernKit';
import type { CSSProperties } from 'react';
import './team-standings-board.css';

type Locale = 'zh-CN' | 'zh-TW' | 'en';
const index = (locale: Locale) => locale === 'en' ? 2 : locale === 'zh-TW' ? 1 : 0;
function Crest({ name, color }: { name: string; color: string }) {
  const mark = getClubMark(name, color);
  return <span className={`crest crest-small ${mark.dedicatedKit ? `crest-kit crest-kit-${mark.code}` : `crest-${mark.pattern}`}${mark.pattern === 'bayern' ? ' crest-bayern' : ''}`} style={{ '--club': mark.primary, '--club-secondary': mark.accent, '--club-trim': mark.trim } as CSSProperties} aria-hidden="true">{mark.pattern === 'bayern' && <BayernKit />}<span className="crest-code">{mark.code}</span></span>;
}

export default function TeamStandingsBoard({ locale, league, data }: {
  locale: Locale; league: string; data: FootballSnapshot | null;
}) {
  const standing = data?.standings[league];
  const rows = standing?.groups.flatMap(group => group.rows) || [];
  const showZones = standing?.groups.length === 1 && rows.length === (league === '欧冠' ? 36 : league === '德甲' || league === '法甲' ? 18 : 20);
  return <div className="team-standings-board data-card">
    <div className="team-board-heading"><strong>{locale === 'en' ? 'League standings' : locale === 'zh-TW' ? '聯賽積分榜' : '积分榜'}</strong><span className="season-label">{standing?.season || '—'}</span></div>
    {showZones && <div className="zone-legend" aria-label={locale === 'en' ? 'Table zones' : '排名区间'}>
      <div className="zone-legend-items">{legendZones(league).map(zone => <span key={zone} className={`zone-legend-item zone-${zone}`}><i />{zoneLabels[zone][index(locale)]}</span>)}</div>
      {league !== '欧冠' && <span className="zone-legend-caveat">{locale === 'en' ? 'European places are projections, not confirmed qualification' : locale === 'zh-TW' ? '歐戰席位為預測，並非確定資格' : '欧战席位为预测，并非确定资格'}</span>}
    </div>}
    {standing?.groups.length ? standing.groups.map((group, groupIndex) => <div key={`${group.name}-${groupIndex}`}>
      {standing.groups.length > 1 && <h3 className="standings-group-heading">{group.name.replaceAll('_', ' ')}</h3>}
      <div className="table-scroll"><table className="team-board-table"><thead><tr><th>#</th><th>{locale === 'en' ? 'Club' : '球队'}</th><th>{locale === 'en' ? 'P' : '场次'}</th><th>{locale === 'en' ? 'W / D / L' : '胜 / 平 / 负'}</th><th>{locale === 'en' ? 'GF' : '进球'}</th><th>{locale === 'en' ? 'GA' : '失球'}</th><th>{locale === 'en' ? 'GD' : '净胜球'}</th><th>{locale === 'en' ? 'PTS' : '积分'}</th>{showZones && <th className="team-board-zone-heading">{locale === 'en' ? 'Zone' : locale === 'zh-TW' ? '區間' : '区间'}</th>}</tr></thead>
        <tbody>{group.rows.map((row, rowIndex) => {
          const zone = showZones ? zoneForPosition(league, row.pos, rows.length) : null;
          const previousZone = rowIndex > 0 && showZones ? zoneForPosition(league, group.rows[rowIndex - 1].pos, rows.length) : null;
          return <tr key={`${row.id ?? row.team}-${rowIndex}`} className={zone ? `team-zone-row zone-${zone}` : ''} aria-label={zone ? `${localizeClub(row.team, locale)} · ${zoneLabels[zone][index(locale)]}` : undefined}><td><strong className="team-position" title={zone ? zoneLabels[zone][index(locale)] : undefined}>{row.pos}</strong></td><td><span className="team-board-club"><Crest name={row.team} color={row.color} /><strong>{localizeClub(row.team, locale)}</strong></span></td><td>{row.p}</td><td>{row.w} / {row.d} / {row.l}</td><td>{row.gf ?? '—'}</td><td>{row.ga ?? '—'}</td><td>{row.gd}</td><td><strong className="team-board-points">{row.pts}</strong></td>{showZones && <td className="team-board-zone-cell">{zone && zone !== previousZone && <span className="zone-edge-label">{zoneLabels[zone][index(locale)]}</span>}</td>}</tr>;
        })}</tbody></table></div>
    </div>) : <div className="empty-state">{locale === 'en' ? 'No verified standings are available right now.' : locale === 'zh-TW' ? '目前沒有可核實的積分榜。' : '当前没有可核实的积分榜。'}</div>}
    <p className="data-note">{data ? `Football-Data.org · ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.updatedAt))}` : locale === 'en' ? 'Waiting for data sync' : '等待数据同步'} · {zoneExplanations[league]?.[index(locale)]} <a href={zoneRuleSources[league]} target="_blank" rel="noopener noreferrer">{locale === 'en' ? 'Competition rules ↗' : '查看赛事规则 ↗'}</a></p>
  </div>;
}
