import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';

/**
 * Fetches current quest data from tarkov.dev's JSON API. GraphQL is legacy and
 * has been unavailable since mid-2026; JSON is the maintained structured source.
 *
 * Fandom/wiki remains the semantic source for rules and exceptions. This script
 * only normalizes structured IDs, traders, maps, objectives and rewards.
 */

const GAME_MODE = 'pve';
const API_BASE = 'https://json.tarkov.dev';

type Dictionary<T> = Record<string, T>;

interface JsonTaskResponse {
  data: {
    tasks: Dictionary<JsonTask>;
  };
}

interface JsonTranslationResponse {
  data: Record<string, string>;
}

interface JsonTraderResponse {
  data: Dictionary<{
    id: string;
    name: string;
    normalizedName?: string;
  }>;
}

interface JsonMapResponse {
  data: {
    maps: Dictionary<{
      id: string;
      name: string;
      normalizedName?: string;
    }>;
  };
}

interface JsonTask {
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

interface JsonObjective {
  id: string;
  description?: string;
  maps?: string[];
  zones?: Array<{ map?: string }>;
}

const endpoint = (path: string) => `${API_BASE}/${path}`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(endpoint(path), { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} ${res.statusText} while fetching ${endpoint(path)}`);
  }
  return res.json() as Promise<T>;
}

const translate = (translations: Record<string, string>, value?: string) => {
  if (!value) return undefined;
  return translations[value] || value;
};

const unique = (values: Array<string | undefined>) => Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const wikiTitle = (wikiLink?: string) => {
  if (!wikiLink) return undefined;
  return decodeURIComponent(wikiLink.split('/').pop() ?? '').replace(/_/g, ' ') || undefined;
};

async function fetchTasks() {
  const [taskData, taskTranslations, traderData, traderTranslations, mapData, mapTranslations] = await Promise.all([
    fetchJson<JsonTaskResponse>(`${GAME_MODE}/tasks`),
    fetchJson<JsonTranslationResponse>(`${GAME_MODE}/tasks_en`),
    fetchJson<JsonTraderResponse>(`${GAME_MODE}/traders`),
    fetchJson<JsonTranslationResponse>(`${GAME_MODE}/traders_en`),
    fetchJson<JsonMapResponse>(`${GAME_MODE}/maps`),
    fetchJson<JsonTranslationResponse>(`${GAME_MODE}/maps_en`),
  ]);

  const tasksById = taskData.data.tasks;
  const tradersById = traderData.data;
  const mapsById = mapData.data.maps;

  const traderName = (id?: string) => translate(traderTranslations.data, id ? tradersById[id]?.name : undefined) ?? 'Unknown';
  const mapName = (id?: string) => translate(mapTranslations.data, id ? mapsById[id]?.name : undefined);
  const taskName = (task?: JsonTask) => translate(taskTranslations.data, task?.name) ?? wikiTitle(task?.wikiLink) ?? task?.normalizedName ?? task?.id ?? 'Unknown';

  const mapped = Object.values(tasksById)
    .map((task) => {
      const objectiveDetails = (task.objectives ?? []).map((objective) => {
        const objectiveMapIds = unique([
          ...(objective.maps ?? []),
          ...(objective.zones ?? []).map((zone) => zone.map),
        ]);
        return {
          description: translate(taskTranslations.data, objective.description) ?? objective.description ?? objective.id,
          maps: unique(objectiveMapIds.map(mapName)),
        };
      });
      const objectiveMaps = unique(objectiveDetails.flatMap((objective) => objective.maps));
      const traderLoyaltyLevels = unique((task.traderRequirements ?? [])
        .filter((requirement) => requirement.trader === task.trader && requirement.level)
        .map((requirement) => String(requirement.level)))
        .map(Number);

      return {
        id: task.id,
        title: taskName(task),
        normalizedName: task.normalizedName,
        trader: traderName(task.trader),
        location: mapName(task.map) || objectiveMaps[0],
        objectiveMaps,
        levelRequirement: task.minPlayerLevel || undefined,
        objectives: objectiveDetails.map((objective) => objective.description).filter(Boolean),
        objectiveDetails,
        description: task.wikiLink ? `Guia externa: ${task.wikiLink}` : undefined,
        rewards: undefined,
        prerequisites: (task.taskRequirements ?? [])
          .map((requirement) => taskName(tasksById[requirement.task ?? '']))
          .filter(Boolean),
        countsForKappa: Boolean(task.kappaRequired),
        lightkeeperRequired: Boolean(task.lightkeeperRequired),
        traderLoyaltyLevel: traderLoyaltyLevels[0],
        dataSources: {
          structured: 'https://json.tarkov.dev',
          semantic: 'https://escapefromtarkov.fandom.com',
        },
        achievementRewards: Array.isArray(task.finishRewards?.achievement)
          ? task.finishRewards.achievement.map((achievement) => ({
            id: achievement.id,
            name: translate(taskTranslations.data, achievement.name) ?? achievement.name,
          })).filter((achievement) => achievement.id && achievement.name)
          : [],
      };
    })
    .sort((a, b) => a.trader.localeCompare(b.trader) || a.title.localeCompare(b.title));

  const filePath = fileURLToPath(new URL('../src/data/tasks.json', import.meta.url));
  const payload = {
    metadata: {
      source: 'https://json.tarkov.dev/pve/tasks',
      semanticSource: 'https://escapefromtarkov.fandom.com',
      gameMode: GAME_MODE,
      syncedAt: new Date().toISOString(),
      taskCount: mapped.length,
      kappaTaskCount: mapped.filter((task) => task.countsForKappa).length,
      lightkeeperTaskCount: mapped.filter((task) => task.lightkeeperRequired).length,
      objectiveMapTaskCount: mapped.filter((task) => task.objectiveMaps.length > 0).length,
    },
    tasks: mapped,
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Fetched ${mapped.length} ${GAME_MODE} tasks from json.tarkov.dev and wrote to ${filePath}`);
}

fetchTasks().catch((err) => {
  console.error(err);
  process.exit(1);
});
