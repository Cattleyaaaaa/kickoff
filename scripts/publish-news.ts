import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { NewsItem, NewsSnapshot } from '../src/news.ts';

type Draft = Pick<NewsItem, 'id' | 'title' | 'summary' | 'body' | 'url' | 'publishedAt' | 'category'>
  & Pick<NewsItem, 'aiGenerated' | 'sourceMatchIds' | 'dataSources'>;
type Translation = { hash: string; title: string; summary: string; body: string };
type Cache = Record<string, Partial<Record<'zh-TW' | 'en', Translation>>>;

const input = resolve('content/news.json');
const output = resolve('public/data/news.json');
const cacheFile = resolve('backend/.cache/news-translations.json');
const parsed = JSON.parse(await readFile(input, 'utf8')) as { articles?: Draft[] };
const generated = await readFile(resolve('content/generated-news.json'), 'utf8')
  .then(value => JSON.parse(value) as { articles?: Draft[] })
  .catch(() => ({ articles: [] as Draft[] }));
if (!Array.isArray(parsed.articles) || !Array.isArray(generated.articles))
  throw new Error('Both content/news.json and content/generated-news.json must contain articles arrays.');
const articleMap = new Map<string, Draft>();
for (const article of [...parsed.articles, ...generated.articles]) articleMap.set(article.id, article);
const articles = [...articleMap.values()];
if (articles.length === 0) {
  console.log('No owned news articles to publish; the BBC RSS fallback remains active.');
  process.exit(0);
}
const ids = new Set<string>();
for (const article of articles) {
  if (!article.id || ids.has(article.id) || !article.title?.trim() || !article.summary?.trim()
    || !article.body?.trim() || article.body.length > 8000
    || !article.category?.trim() || !article.publishedAt || Number.isNaN(Date.parse(article.publishedAt))
    || !/^https:\/\//.test(article.url || ''))
    throw new Error(`Invalid or duplicate owned news article: ${article.id || '(missing id)'}`);
  ids.add(article.id);
}
const cache = await readFile(cacheFile, 'utf8').then(value => JSON.parse(value) as Cache).catch(() => ({} as Cache));
const hashOf = (draft: Draft) => createHash('sha256').update(JSON.stringify([draft.title, draft.summary, draft.body])).digest('hex');
const existingSnapshot = await readFile(output, 'utf8').then(value => JSON.parse(value) as NewsSnapshot).catch(() => null);
for (const prior of existingSnapshot?.source === 'Kickoff' ? existingSnapshot.items : []) {
  const draft = articles.find(article => article.id === prior.id);
  if (!draft) continue;
  const hash = hashOf(draft);
  for (const locale of ['zh-TW', 'en'] as const) {
    const title = prior.localizedTitles?.[locale];
    const summary = prior.localizedSummaries?.[locale];
    const body = prior.localizedBodies?.[locale];
    if (title && summary && body) {
      cache[prior.id] ??= {};
      cache[prior.id]![locale] = { hash, title, summary, body };
    }
  }
}
const key = process.env.DEEPSEEK_API_KEY?.trim();

async function saveCache() {
  await mkdir(dirname(cacheFile), { recursive: true });
  const temp = `${cacheFile}.tmp`;
  await writeFile(temp, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  await rename(temp, cacheFile);
}

for (const article of articles) {
  const hash = hashOf(article);
  for (const locale of ['zh-TW', 'en'] as const) {
    if (cache[article.id]?.[locale]?.hash === hash) continue;
    if (!key) throw new Error(`DEEPSEEK_API_KEY is required to translate ${article.id} into ${locale}.`);
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat', temperature: 0.1, max_tokens: 8000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `Translate this Kickoff-owned football news headline, summary and body from Simplified Chinese into ${locale === 'en' ? 'English' : 'Traditional Chinese'}. Preserve names, scores, dates, paragraphs and factual meaning. Return only JSON with string fields "title", "summary" and "body". Do not add facts.` },
          { role: 'user', content: JSON.stringify({ title: article.title, summary: article.summary, body: article.body }) },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`News translation failed for ${article.id}/${locale}: HTTP ${response.status}`);
    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const translated = JSON.parse(result.choices?.[0]?.message?.content || '{}') as { title?: string; summary?: string; body?: string };
    if (!translated.title?.trim() || !translated.summary?.trim() || !translated.body?.trim())
      throw new Error(`News translation omitted fields for ${article.id}/${locale}.`);
    const scoreTokens = article.body.match(/\b\d+–\d+\b/g) || [];
    if (scoreTokens.some(score => !translated.body!.includes(score)))
      throw new Error(`News translation changed a verified score in ${article.id}/${locale}.`);
    cache[article.id] ??= {};
    cache[article.id][locale] = { hash, title: translated.title.trim(), summary: translated.summary.trim(), body: translated.body.trim() };
    await saveCache();
    console.log(`Translated ${article.id} into ${locale}.`);
  }
}

const items: NewsItem[] = articles.map(article => ({
  id: article.id, title: article.title, summary: article.summary, body: article.body, url: article.url,
  publishedAt: new Date(article.publishedAt).toISOString(), category: article.category,
  aiGenerated: article.aiGenerated || false, sourceMatchIds: article.sourceMatchIds || [],
  dataSources: article.dataSources || [],
  localizedTitles: { 'zh-CN': article.title, 'zh-TW': cache[article.id]?.['zh-TW']?.title, en: cache[article.id]?.en?.title },
  localizedSummaries: { 'zh-CN': article.summary, 'zh-TW': cache[article.id]?.['zh-TW']?.summary, en: cache[article.id]?.en?.summary },
  localizedBodies: { 'zh-CN': article.body, 'zh-TW': cache[article.id]?.['zh-TW']?.body, en: cache[article.id]?.en?.body },
})).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
const snapshot: NewsSnapshot = { source: 'Kickoff', updatedAt: new Date().toISOString(), items };
await mkdir(dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
await rename(temporary, output);
console.log(`Published ${items.length} Kickoff-owned news articles to ${output}.`);
