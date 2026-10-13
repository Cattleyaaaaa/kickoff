import { useState } from 'react';
import { metricCategories, metricLabels, metricValue, percentageMetrics } from './metricCatalog';
import type { MetricCategory, MetricKey, MetricValues } from './metricCatalog';
import './stats-board.css';

type Locale = 'zh-CN' | 'zh-TW' | 'en';
type Entry = { id: string; name: string; sub?: string; position?: number; values: MetricValues; crest?: React.ReactNode };
const index = (locale: Locale) => locale === 'en' ? 2 : locale === 'zh-TW' ? 1 : 0;

export default function StatsBoard({ locale, entries, groups, source, alwaysVisible = [], initialCategory = 'attack' }: {
  locale: Locale; entries: Entry[]; groups: Record<MetricCategory, MetricKey[]>; source: string; alwaysVisible?: MetricKey[]; initialCategory?: MetricCategory;
}) {
  const [category, setCategory] = useState<MetricCategory>(initialCategory);
  const [sortKey, setSortKey] = useState<MetricKey>('goals');
  const supportedCategories = (Object.keys(groups) as MetricCategory[]).filter(key =>
    entries.length === 0 || key === 'discipline' && alwaysVisible.some(metric => groups[key].includes(metric))
      || groups[key].some(metric => entries.some(entry => metricValue(entry.values, metric) !== null)));
  const categories = supportedCategories.length ? supportedCategories : Object.keys(groups) as MetricCategory[];
  const activeCategory = categories.includes(category) ? category : categories[0] || category;
  const supportedKeys = groups[activeCategory].filter(key => entries.length === 0
    || entries.some(entry => metricValue(entry.values, key) !== null));
  const keys = groups[activeCategory].filter(key => supportedKeys.includes(key) || alwaysVisible.includes(key));
  if (!keys.length) keys.push(...groups[activeCategory]);
  const missingKeys = entries.length ? groups[activeCategory].filter(key => !supportedKeys.includes(key)) : [];
  const activeKey = keys.includes(sortKey) ? sortKey : keys[0];
  const ordered = activeKey ? entries.filter(entry => metricValue(entry.values, activeKey) !== null)
    .sort((a, b) => (metricValue(b.values, activeKey) ?? 0) - (metricValue(a.values, activeKey) ?? 0)) : [];
  const format = (entry: Entry, key: MetricKey) => {
    const value = metricValue(entry.values, key);
    return value === null ? '—' : `${value}${percentageMetrics.has(key) ? '%' : ''}`;
  };
  return <div className="stats-board data-card">
    <div className="stats-categories tabs scroll-tabs" aria-label={locale === 'en' ? 'Statistic category' : '统计分类'}>
      {categories.map(key => <button key={key} className={activeCategory === key ? 'selected' : ''} onClick={() => { setCategory(key); setSortKey(groups[key].find(metric => entries.some(entry => metricValue(entry.values, metric) !== null)) || groups[key][0]); }}>{metricCategories[key][index(locale)]}</button>)}
    </div>
    <div className="stats-metrics tabs scroll-tabs" aria-label={locale === 'en' ? 'Sort statistic' : '选择统计指标'}>
      {keys.map(key => <button key={key} className={activeKey === key ? 'selected' : ''} onClick={() => setSortKey(key)}>{metricLabels[key][index(locale)]}</button>)}
    </div>
    {entries.length > 0 && <p className="stats-coverage">{locale === 'en' ? `${ordered.length} of ${entries.length} entries have ${metricLabels[activeKey][2]} data` : locale === 'zh-TW' ? `${entries.length} 個條目中，${ordered.length} 個有「${metricLabels[activeKey][1]}」數據` : `${entries.length} 个条目中，${ordered.length} 个有“${metricLabels[activeKey][0]}”数据`}</p>}
    {missingKeys.length > 0 && <p className="stats-missing">{locale === 'en' ? 'Not in this snapshot: ' : locale === 'zh-TW' ? '目前快照缺少：' : '当前快照缺少：'}{missingKeys.map(key => metricLabels[key][index(locale)]).join(locale === 'en' ? ', ' : '、')}</p>}
    {ordered.length ? <div className="table-scroll"><table className="stats-table"><thead><tr><th>#</th><th>{locale === 'en' ? 'Name' : '名称'}</th>{keys.map(key => <th key={key} className={key === activeKey ? 'stats-selected-column' : 'stats-extra-column'}>{metricLabels[key][index(locale)]}</th>)}</tr></thead>
      <tbody>{ordered.map((entry, i) => <tr key={entry.id}><td>{i + 1}</td><td className="stats-name"><div className="stats-club-line">{entry.crest}<span className="stats-club-copy"><strong>{entry.name}</strong>{entry.sub && <small>{entry.sub}</small>}</span></div></td>{keys.map(key => <td key={key} className={`${key === activeKey ? 'stats-active-cell stats-selected-column' : 'stats-extra-column'}`}>{format(entry, key)}</td>)}</tr>)}</tbody></table></div>
      : <div className="empty-state">{entries.length ? locale === 'en' ? 'This metric is not recorded in the current snapshot.' : locale === 'zh-TW' ? '目前快照尚未記錄這項指標。' : '当前快照尚未记录这项指标。' : locale === 'en' ? 'No verified season rows are available.' : locale === 'zh-TW' ? '暫無可核實的賽季資料。' : '暂无可核实的赛季数据。'}</div>}
    <p className="data-note">{source} · {locale === 'en' ? 'Missing metrics are marked. — means unavailable, not zero. Rates come from the provider or recorded totals.' : locale === 'zh-TW' ? '缺失指標會明確標註；「—」表示資料缺失，並非 0。比率由來源提供或根據總量計算。' : '缺失指标会明确标注；“—”表示数据缺失，不是 0。比率由来源提供或根据总量计算。'}</p>
  </div>;
}
