export type NewsItem = {
  id: string;
  title: string;
  // Only populate these for Kickoff-owned stories or content licensed for translation.
  localizedTitles?: Partial<Record<'zh-CN' | 'zh-TW' | 'en', string>>;
  summary?: string;
  localizedSummaries?: Partial<Record<'zh-CN' | 'zh-TW' | 'en', string>>;
  body?: string;
  localizedBodies?: Partial<Record<'zh-CN' | 'zh-TW' | 'en', string>>;
  aiGenerated?: boolean;
  sourceMatchIds?: string[];
  dataSources?: Array<{ label: string; updatedAt?: string; url?: string; recordId?: string }>;
  url: string;
  publishedAt: string;
  category: string;
};

export function newsTitle(item: NewsItem, locale: 'zh-CN' | 'zh-TW' | 'en'): string {
  return item.localizedTitles?.[locale]?.trim() || item.title;
}

export function newsSummary(item: NewsItem, locale: 'zh-CN' | 'zh-TW' | 'en'): string {
  return item.localizedSummaries?.[locale]?.trim() || item.summary || '';
}

export function newsBody(item: NewsItem, locale: 'zh-CN' | 'zh-TW' | 'en'): string {
  return item.localizedBodies?.[locale]?.trim() || item.body || '';
}

export function newsCategory(item: NewsItem, locale: 'zh-CN' | 'zh-TW' | 'en'): string {
  if (item.category === '赛果速递') {
    return locale === 'en' ? 'Match results' : locale === 'zh-TW' ? '賽果速遞' : '赛果速递';
  }
  return item.category;
}

export function newsHref(item: NewsItem, source: NewsSnapshot['source']): string {
  return source === 'Kickoff' ? `/news?story=${encodeURIComponent(item.id)}` : item.url;
}

export type NewsSnapshot = {
  source: 'BBC Sport' | 'Kickoff';
  updatedAt: string;
  items: NewsItem[];
};

export function isNewsSnapshot(value: unknown): value is NewsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<NewsSnapshot>;
  return (data.source === 'BBC Sport' || data.source === 'Kickoff') && typeof data.updatedAt === 'string' && Array.isArray(data.items)
    && data.items.every(item => typeof item?.title === 'string' && typeof item?.url === 'string');
}
