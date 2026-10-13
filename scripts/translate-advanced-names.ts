import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { localizePlayer } from '../src/data.ts';
import type { AdvancedStatsSnapshot } from '../src/advancedSnapshot.ts';
import type { AdvancedNamesSnapshot } from '../src/advancedNames.ts';

const source = resolve('public/data/advanced.json');
const output = resolve('public/data/advanced-names.json');
const advanced = JSON.parse(await readFile(source, 'utf8')) as AdvancedStatsSnapshot;
if (advanced.source !== 'pitchapi.dev' || !advanced.season || !advanced.leagues)
  throw new Error('The local advanced statistics snapshot is missing or invalid.');

const old = await readFile(output, 'utf8').then(JSON.parse).catch(() => null) as AdvancedNamesSnapshot | null;
const snapshot: AdvancedNamesSnapshot = old?.source === 'local-translation-cache' && old.season === advanced.season
  ? old : { schemaVersion: 1, source: 'local-translation-cache', season: advanced.season, names: {} };
const playerNames = [...new Set(Object.values(advanced.leagues).flatMap(league => league.players.map(player => player.name)))];
for (const name of playerNames) {
  if (snapshot.names[name]?.['zh-CN'] && snapshot.names[name]?.['zh-TW']) continue;
  const simplified = localizePlayer(name, 'zh-CN');
  const traditional = localizePlayer(name, 'zh-TW');
  if (simplified !== name && traditional !== name)
    snapshot.names[name] = { 'zh-CN': simplified, 'zh-TW': traditional };
}
async function save() {
  const temporary = `${output}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  await rename(temporary, output);
}
await save();

const missing = playerNames.filter(name => !snapshot.names[name]?.['zh-CN'] || !snapshot.names[name]?.['zh-TW']);
console.log(`Player names: ${playerNames.length}; cached: ${playerNames.length - missing.length}; need translation: ${missing.length}.`);
if (!missing.length) process.exit(0);
const key = process.env.DEEPSEEK_API_KEY?.trim();
if (!key) {
  console.log('DEEPSEEK_API_KEY is not set. Existing translations were saved; no API requests made.');
  process.exit(0);
}

const batchSize = 20;
for (let attempt = 1; attempt <= 3; attempt++) {
  const remaining = playerNames.filter(name => !snapshot.names[name]?.['zh-CN'] || !snapshot.names[name]?.['zh-TW']);
  if (!remaining.length) break;
  console.log(`Translation pass ${attempt}/3: ${remaining.length} names remaining.`);
  for (let start = 0; start < remaining.length; start += batchSize) {
    const batch = remaining.slice(start, start + batchSize);
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat', temperature: 0.1, max_tokens: 3000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Translate every football player name into standard Simplified Chinese and Traditional Chinese sports names. Use an established name only when identity is clear. Otherwise transliterate; preserve initials. Never substitute an unrelated person. Return JSON only: {"translations":[{"source":"exact input","zh-CN":"...","zh-TW":"..."}]}. Include every input exactly once; do not omit any.' },
          { role: 'user', content: JSON.stringify(batch) },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`Translation pass ${attempt}, batch ${Math.floor(start / batchSize) + 1}: HTTP ${response.status}. Completed batches are saved.`);
    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(result.choices?.[0]?.message?.content || '{}') as {
      translations?: Array<{ source?: string; 'zh-CN'?: string; 'zh-TW'?: string }>;
    };
    const allowed = new Set(batch);
    for (const item of parsed.translations || []) {
      const simplified = item['zh-CN']?.trim(), traditional = item['zh-TW']?.trim();
      if (item.source && allowed.has(item.source) && simplified && traditional
        && /[\u3400-\u9fff]/u.test(simplified) && /[\u3400-\u9fff]/u.test(traditional))
        snapshot.names[item.source] = { 'zh-CN': simplified, 'zh-TW': traditional };
    }
    await save();
    console.log(`Pass ${attempt}, batch ${Math.floor(start / batchSize) + 1}: ${batch.filter(name => snapshot.names[name]?.['zh-CN'] && snapshot.names[name]?.['zh-TW']).length}/${batch.length} saved.`);
  }
}
const finalMissing = playerNames.filter(name => !snapshot.names[name]?.['zh-CN'] || !snapshot.names[name]?.['zh-TW']);
console.log(`Done. ${playerNames.length - finalMissing.length}/${playerNames.length} names translated; ${finalMissing.length} still missing.`);
