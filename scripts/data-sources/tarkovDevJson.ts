export type TarkovGameMode = 'regular' | 'pve' | 'pvp-season';

export const TARKOV_DEV_JSON_BASE = 'https://json.tarkov.dev';

type Dictionary<T> = Record<string, T>;

export interface SourceProvenance {
  provider: string;
  endpoint: string;
  retrievedAt: string;
  gameMode?: TarkovGameMode;
}

export interface JsonTaskResponse {
  data: {
    tasks: Dictionary<JsonTask>;
  };
}

export interface JsonTranslationResponse {
  data: Record<string, string>;
}

export interface JsonTraderResponse {
  data: Dictionary<JsonTrader>;
}

export interface JsonMapResponse {
  data: {
    maps: Dictionary<JsonMap>;
  };
}

export interface JsonTrader {
  id: string;
  name: string;
  normalizedName?: string;
}

export interface JsonMap {
  id: string;
  name: string;
  normalizedName?: string;
}

export interface JsonTask {
  id: string;
  name: string;
  normalizedName?: string;
  trader?: string;
  map?: string;
  wikiLink?: string;
  minPlayerLevel?: number;
  taskRequirements?: Array<{ task?: string }>;
  traderRequirements?: Array<{ trader?: string; level?: number }>;
  objectives?: JsonObjective[];
  finishRewards?: {
    achievement?: Array<{ id: string; name: string }>;
  };
  kappaRequired?: boolean;
  lightkeeperRequired?: boolean;
}

export interface JsonObjective {
  id: string;
  description?: string;
  maps?: string[];
  zones?: Array<{ map?: string }>;
}

export interface TarkovDevJsonTaskDataset {
  gameMode: TarkovGameMode;
  retrievedAt: string;
  tasks: Dictionary<JsonTask>;
  taskTranslations: Record<string, string>;
  traders: Dictionary<JsonTrader>;
  traderTranslations: Record<string, string>;
  maps: Dictionary<JsonMap>;
  mapTranslations: Record<string, string>;
  sources: SourceProvenance[];
}

const endpoint = (path: string) => `${TARKOV_DEV_JSON_BASE}/${path}`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(endpoint(path), { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} ${res.statusText} while fetching ${endpoint(path)}`);
  }
  return res.json() as Promise<T>;
}

const source = (path: string, gameMode: TarkovGameMode, retrievedAt: string): SourceProvenance => ({
  provider: 'json.tarkov.dev',
  endpoint: endpoint(path),
  retrievedAt,
  gameMode,
});

export async function fetchTarkovDevJsonTaskDataset(
  gameMode: TarkovGameMode = 'pve',
  now: Date = new Date()
): Promise<TarkovDevJsonTaskDataset> {
  const retrievedAt = now.toISOString();
  const paths = {
    tasks: `${gameMode}/tasks`,
    taskTranslations: `${gameMode}/tasks_en`,
    traders: `${gameMode}/traders`,
    traderTranslations: `${gameMode}/traders_en`,
    maps: `${gameMode}/maps`,
    mapTranslations: `${gameMode}/maps_en`,
  };
  const [taskData, taskTranslations, traderData, traderTranslations, mapData, mapTranslations] = await Promise.all([
    fetchJson<JsonTaskResponse>(paths.tasks),
    fetchJson<JsonTranslationResponse>(paths.taskTranslations),
    fetchJson<JsonTraderResponse>(paths.traders),
    fetchJson<JsonTranslationResponse>(paths.traderTranslations),
    fetchJson<JsonMapResponse>(paths.maps),
    fetchJson<JsonTranslationResponse>(paths.mapTranslations),
  ]);

  return {
    gameMode,
    retrievedAt,
    tasks: taskData.data.tasks,
    taskTranslations: taskTranslations.data,
    traders: traderData.data,
    traderTranslations: traderTranslations.data,
    maps: mapData.data.maps,
    mapTranslations: mapTranslations.data,
    sources: Object.values(paths).map((path) => source(path, gameMode, retrievedAt)),
  };
}
