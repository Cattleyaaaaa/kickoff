import { useState } from 'react';
import { metricCategories, metricLabels, metricValue, percentageMetrics } from './metricCatalog';
import type { MetricCategory, MetricKey, MetricValues } from './metricCatalog';
import './stats-board.css';

type Locale = 'zh-CN' | 'zh-TW' | 'en';
type Entry = { id: string; name: string; sub?: string; position?: number; values: MetricValues; crest?: React.ReactNode };
const index = (locale: Locale) => locale === 'en' ? 2 : locale === 'zh-TW' ? 1 : 0;

export default function StatsBoard({ locale, entries, groups, source }: {
  locale: Locale; entries: Entry[]; groups: Record<MetricCategory, MetricKey[]>; source: string;
}) {
  const [category, setCategory] = useState<MetricCategory>('attack');
  const [sortKey, setSortKey] = useState<MetricKey>('goals');
  const keys = groups[category];
  const activeKey = keys.includes(sortKey) ? sortKey : keys[0];
  const available = entries.some(entry => metricValue(entry.values, activeKey) !== null);
  const ordered = [...entries].sort((a, b) =>
    (metricValue(b.values, activeKey) ?? -1) - (metricValue(a.values, activeKey) ?? -1));
  const format = (entry: Entry, key: MetricKey) => {
    const value = metricValue(entry.values, key);
    return value === null ? '—' : `${value}${percentageMetrics.has(key) ? '%' : ''}`;
  };
  return <div className="stats-board data-card">
    <div className="stats-categories tabs scroll-tabs" aria-label={locale === 'en' ? 'Statistic category' : '统计分类'}>
      {(Object.keys(groups) as MetricCategory[]).map(key => <button key={key} className={category === key ? 'selected' : ''} onClick={() => { setCategory(key); setSortKey(groups[key][0]); }}>{metricCategories[key][index(locale)]}</button>)}
    </div>
    <div className="stats-metrics tabs scroll-tabs" aria-label={locale === 'en' ? 'Sort statistic' : '选择统计指标'}>
      {keys.map(key => <button key={key} className={activeKey === key ? 'selected' : ''} onClick={() => setSortKey(key)}>{metricLabels[key][index(locale)]}</button>)}
    </div>
    {!available && <p className="stats-unavailable">{locale === 'en' ? 'This metric has no verified season data yet.' : locale === 'zh-TW' ? '這項指標暫無可核實的賽季數據。' : '这项指标暂无可核实的赛季数据。'}</p>}
    {ordered.length ? <div className="table-scroll"><table className="stats-table"><thead><tr><th>#</th><th>{locale === 'en' ? 'Name' : '名称'}</th>{keys.map(key => <th key={key} className={key === activeKey ? 'stats-selected-column' : 'stats-extra-column'}>{metricLabels[key][index(locale)]}</th>)}</tr></thead>
      <tbody>{ordered.map((entry, i) => <tr key={entry.id}><td>{available && metricValue(entry.values, activeKey) !== null ? i + 1 : entry.position ?? '—'}</td><td className="stats-name"><div className="stats-club-line">{entry.crest}<span className="stats-club-copy"><strong>{entry.name}</strong>{entry.sub && <small>{entry.sub}</small>}</span></div></td>{keys.map(key => <td key={key} className={`${key === activeKey ? 'stats-active-cell stats-selected-column' : 'stats-extra-column'}`}>{format(entry, key)}</td>)}</tr>)}</tbody></table></div>
      : <div className="empty-state">{locale === 'en' ? 'No verified season rows are available.' : locale === 'zh-TW' ? '暫無可核實的賽季資料。' : '暂无可核实的赛季数据。'}</div>}
    <p className="data-note">{source} · {locale === 'en' ? '— means unavailable, not zero. Rates come from the provider or recorded totals.' : locale === 'zh-TW' ? '「—」表示資料缺失，並非 0；比率由資料來源提供或根據已記錄總量計算。' : '“—”表示数据缺失，不是 0；比率由数据来源提供或根据已记录总量计算。'}</p>
  </div>;
}
