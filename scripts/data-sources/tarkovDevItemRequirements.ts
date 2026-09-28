export const TARKOV_DEV_JSON_BASE = process.env.TARKOV_DEV_JSON_BASE ?? 'https://json.tarkov.dev';

export interface JsonItem {
  id: string;
  name: string;
  shortName?: string;
  normalizedName?: string;
  iconLink?: string;
  wikiLink?: string;
}

export interface JsonTaskObjective {
  id: string;
  type: string;
  description?: string;
  optional?: boolean;
  count?: number;
  foundInRaid?: boolean;
  items?: string[];
}

export interface JsonTask {
  id: string;
  name: string;
  trader?: string;
  wikiLink?: string;
  objectives?: JsonTaskObjective[];
  kappaRequired?: boolean;
  lightkeeperRequired?: boolean;
}

export interface JsonHideoutLevel {
  id: string;
  level: number;
  itemRequirements?: Array<{ item: string; count: number }>;
  stationLevelRequirements?: Array<{ station: string; level: number }>;
}

export interface JsonHideoutStation {
  id: string;
  name: string;
  levels?: JsonHideoutLevel[];
}

export interface JsonBarter {
  id: string;
  trader: string;
  minTraderLevel?: number;
  requiredItems?: Array<{ item: string; count: number }>;
  offeredItem?: { item: string; count: number };
}

export interface TarkovDevItemRequirementsDataset {
  retrievedAt: string;
  items: Record<string, JsonItem>;
  itemTranslations: Record<string, string>;
  tasks: Record<string, JsonTask>;
  taskTranslations: Record<string, string>;
  traders: Record<string, { id: string; name: string }>;
  traderTranslations: Record<string, string>;
  hideout: Record<string, JsonHideoutStation>;
  hideoutTranslations: Record<string, string>;
  barters: JsonBarter[];
  sources: string[];
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${TARKOV_DEV_JSON_BASE}/pve/${path}`;
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'KappaTracker/item-requirements' } });
  if (!response.ok) throw new Error(`HTTP error ${response.status} ${response.statusText} while fetching ${url}`);
  return response.json() as Promise<T>;
}

export async function fetchTarkovDevItemRequirementsDataset(now = new Date()): Promise<TarkovDevItemRequirementsDataset> {
  const paths = ['items', 'items_en', 'tasks', 'tasks_en', 'traders', 'traders_en', 'hideout', 'hideout_en', 'barters'] as const;
  const [items, itemTranslations, tasks, taskTranslations, traders, traderTranslations, hideout, hideoutTranslations, barters] = await Promise.all(
    paths.map((path) => fetchJson<{ data: unknown }>(path)),
  );
  const itemData = items.data as { items?: Record<string, JsonItem> };
  const taskData = tasks.data as { tasks?: Record<string, JsonTask> };
  if (!itemData.items || !taskData.tasks || !Array.isArray(barters.data)) throw new Error('Unexpected json.tarkov.dev item requirements response structure');

  return {
    retrievedAt: now.toISOString(),
    items: itemData.items,
    itemTranslations: itemTranslations.data as Record<string, string>,
    tasks: taskData.tasks,
    taskTranslations: taskTranslations.data as Record<string, string>,
    traders: traders.data as Record<string, { id: string; name: string }>,
    traderTranslations: traderTranslations.data as Record<string, string>,
    hideout: hideout.data as Record<string, JsonHideoutStation>,
    hideoutTranslations: hideoutTranslations.data as Record<string, string>,
    barters: barters.data as JsonBarter[],
    sources: paths.map((path) => `${TARKOV_DEV_JSON_BASE}/pve/${path}`),
  };
}
