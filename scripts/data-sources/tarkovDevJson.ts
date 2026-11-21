/**
 * Read-only client for https://json.tarkov.dev, the structured source for task
 * data. One dataset per game mode: `pve` (PvE Zone) and `regular` (PvP Zone).
 * The legacy GraphQL endpoint (api.tarkov.dev/graphql) is not used anymore.
 */

export type TarkovDevGameMode = 'pve' | 'regular';

export const TARKOV_DEV_JSON_BASE = process.env.TARKOV_DEV_JSON_BASE ?? 'https://json.tarkov.dev';

type Dictionary<T> = Record<string, T>;

export interface SourceProvenance {
  provider: string;
  endpoint: string;
  retrievedAt: string;
  gameMode?: string;
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

export interface JsonTaskRequirement {
  task: string;
  status?: string[];
}

export interface JsonTraderRequirement {
  id?: string;
  trader: string;
  requirementType?: string;
  compareMethod?: string;
  value?: number;
}

export interface JsonOtherRequirement {
  id?: string;
  type: 'globalVariable' | 'dialogue' | string;
  variableId?: string;
  compareMethod?: string;
  value?: number;
  traders?: string[];
}

export interface JsonObjective {
  id: string;
  description?: string;
  type: string;
  optional?: boolean;
  count?: number | null;
  maps?: string[];
  zones?: Array<{ id?: string; map?: string }>;
  possibleLocations?: Array<{ map?: string }>;
  items?: string[];
  item?: string;
  markerItem?: string;
  questItem?: { id?: string; name?: string } | string;
  foundInRaid?: boolean;
  requiredKeys?: string[][];
  trader?: string;
  level?: number;
  task?: string;
  status?: string[];
  exitName?: string | null;
}

export interface JsonRewardItem {
  item: string;
  count: number;
}

export interface JsonRewards {
  traderStanding?: Array<{ trader: string; standing: number }>;
  items?: JsonRewardItem[];
  offerUnlock?: Array<{ id: string; trader: string; level: number; item: string }>;
  craftUnlock?: Array<{ id: string; station?: string; level?: number; rewardItems?: JsonRewardItem[] }>;
  traderUnlock?: Array<{ trader?: string } | string>;
  locationUnlock?: Array<{ map?: string } | string>;
  skillLevelReward?: Array<{ skill: string; level: number }>;
  achievement?: Array<{ id: string; name: string }>;
}

export interface JsonTask {
  id: string;
  name: string;
  normalizedName?: string;
  trader?: string;
  map?: string | null;
  wikiLink?: string;
  minPlayerLevel?: number;
  experience?: number;
  factionName?: string;
  restartable?: boolean;
  availableDelaySecondsMin?: number | null;
  availableDelaySecondsMax?: number | null;
  kappaRequired?: boolean;
  lightkeeperRequired?: boolean;
  taskRequirements?: JsonTaskRequirement[];
  traderRequirements?: JsonTraderRequirement[];
  otherRequirements?: JsonOtherRequirement[];
  objectives?: JsonObjective[];
  failConditions?: JsonObjective[];
  failureOutcome?: JsonRewards;
  neededKeys?: Array<{ map?: string; keys: string[] }>;
  startRewards?: JsonRewards;
  finishRewards?: JsonRewards;
}

export interface TarkovDevJsonTaskDataset {
  gameMode: TarkovDevGameMode;
  retrievedAt: string;
  tasks: Dictionary<JsonTask>;
  taskTranslations: Record<string, string>;
  traders: Dictionary<JsonTrader>;
  traderTranslations: Record<string, string>;
  maps: Dictionary<JsonMap>;
  mapTranslations: Record<string, string>;
  itemTranslations: Record<string, string>;
  sources: SourceProvenance[];
}

const endpoint = (path: string) => `${TARKOV_DEV_JSON_BASE}/${path}`;

async function fetchJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(endpoint(path), { headers: { Accept: 'application/json' } });
  } catch (error) {
    throw new Error(`No se pudo conectar con ${endpoint(path)}: ${(error as Error).message}. Revisa la red o define TARKOV_DEV_JSON_BASE.`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} al pedir ${endpoint(path)}. No se ha escrito ningun dato.`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTarkovDevJsonTaskDataset(
  gameMode: TarkovDevGameMode,
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
    itemTranslations: `${gameMode}/items_en`,
  };

  const [taskData, taskTranslations, traderData, traderTranslations, mapData, mapTranslations, itemTranslations] = await Promise.all([
    fetchJson<{ data: { tasks: Dictionary<JsonTask> } }>(paths.tasks),
    fetchJson<{ data: Record<string, string> }>(paths.taskTranslations),
    fetchJson<{ data: Dictionary<JsonTrader> }>(paths.traders),
    fetchJson<{ data: Record<string, string> }>(paths.traderTranslations),
    fetchJson<{ data: { maps: Dictionary<JsonMap> } }>(paths.maps),
    fetchJson<{ data: Record<string, string> }>(paths.mapTranslations),
    fetchJson<{ data: Record<string, string> }>(paths.itemTranslations),
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
    itemTranslations: itemTranslations.data,
    sources: Object.values(paths).map((path) => ({
      provider: 'json.tarkov.dev',
      endpoint: endpoint(path),
      retrievedAt,
      gameMode,
    })),
  };
}
