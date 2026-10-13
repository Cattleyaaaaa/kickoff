export type AdvancedNamesSnapshot = {
  schemaVersion: 1;
  source: 'local-translation-cache';
  season: string;
  names: Record<string, { 'zh-CN': string; 'zh-TW': string }>;
};

export function isAdvancedNamesSnapshot(value: unknown): value is AdvancedNamesSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AdvancedNamesSnapshot>;
  return data.schemaVersion === 1 && data.source === 'local-translation-cache'
    && typeof data.season === 'string' && !!data.names && typeof data.names === 'object';
}
