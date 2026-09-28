import { writeFile } from 'fs/promises';
import { JsonTask, SourceProvenance, TarkovDevJsonTaskDataset } from '../data-sources/tarkovDevJson';

export interface NormalizedTaskObjectiveDetail {
  description: string;
  maps: string[];
}

export interface FieldSourceConflict {
  field: string;
  structuredValue: unknown;
  semanticValue?: unknown;
  sources: SourceProvenance[];
  conflict: boolean;
}

export interface NormalizedTask {
  id: string;
  title: string;
  normalizedName?: string;
  trader: string;
  location?: string;
  objectiveMaps: string[];
  levelRequirement?: number;
  objectives: string[];
  objectiveDetails: NormalizedTaskObjectiveDetail[];
  description?: string;
  rewards?: string;
  prerequisites: string[];
  countsForKappa: boolean;
  lightkeeperRequired: boolean;
  requiredTraderLoyaltyLevel?: number;
  provenance: SourceProvenance[];
  sourceConflicts?: FieldSourceConflict[];
  achievementRewards: Array<{ id: string; name: string }>;
}

export interface NormalizedTasksPayload {
  metadata: {
    source: string;
    primarySemanticSource: string;
    gameMode: string;
    syncedAt: string;
    taskCount: number;
    kappaTaskCount: number;
    lightkeeperTaskCount: number;
    objectiveMapTaskCount: number;
    sources: SourceProvenance[];
  };
  tasks: NormalizedTask[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const WIKI_BASE = 'https://escapefromtarkov.fandom.com';

const unique = (values: Array<string | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const translate = (translations: Record<string, string>, value?: string) => {
  if (!value) return undefined;
  return translations[value] || value;
};

const wikiTitle = (wikiLink?: string) => {
  if (!wikiLink) return undefined;
  return decodeURIComponent(wikiLink.split('/').pop() ?? '').replace(/_/g, ' ') || undefined;
};

export function normalizeTasks(dataset: TarkovDevJsonTaskDataset): NormalizedTask[] {
  const traderName = (id?: string) => translate(dataset.traderTranslations, id ? dataset.traders[id]?.name : undefined) ?? 'Unknown';
  const mapName = (id?: string) => translate(dataset.mapTranslations, id ? dataset.maps[id]?.name : undefined);
  const taskName = (task?: JsonTask) =>
    translate(dataset.taskTranslations, task?.name) ?? wikiTitle(task?.wikiLink) ?? task?.normalizedName ?? task?.id ?? 'Unknown';
  const structuredSource = dataset.sources.filter((source) => source.endpoint.includes('/tasks'));

  return Object.values(dataset.tasks)
    .map((task) => {
      const objectiveDetails = (task.objectives ?? []).map((objective) => {
        const objectiveMapIds = unique([
          ...(objective.maps ?? []),
          ...(objective.zones ?? []).map((zone) => zone.map),
        ]);
        return {
          description: translate(dataset.taskTranslations, objective.description) ?? objective.description ?? objective.id,
          maps: unique(objectiveMapIds.map(mapName)),
        };
      });
      const objectiveMaps = unique(objectiveDetails.flatMap((objective) => objective.maps));
      const requiredTraderLoyaltyLevels = unique((task.traderRequirements ?? [])
        .filter((requirement) => requirement.trader === task.trader && requirement.level)
        .map((requirement) => String(requirement.level)))
        .map(Number)
        .filter((level) => Number.isFinite(level));

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
          .map((requirement) => taskName(dataset.tasks[requirement.task ?? '']))
          .filter(Boolean),
        countsForKappa: Boolean(task.kappaRequired),
        lightkeeperRequired: Boolean(task.lightkeeperRequired),
        requiredTraderLoyaltyLevel: requiredTraderLoyaltyLevels[0],
        provenance: structuredSource,
        achievementRewards: Array.isArray(task.finishRewards?.achievement)
          ? task.finishRewards.achievement.map((achievement) => ({
            id: achievement.id,
            name: translate(dataset.taskTranslations, achievement.name) ?? achievement.name,
          })).filter((achievement) => achievement.id && achievement.name)
          : [],
      };
    })
    .sort((a, b) => a.trader.localeCompare(b.trader) || a.title.localeCompare(b.title));
}

export function buildTasksPayload(dataset: TarkovDevJsonTaskDataset): NormalizedTasksPayload {
  const tasks = normalizeTasks(dataset);
  return {
    metadata: {
      source: `${dataset.sources[0]?.endpoint ?? 'https://json.tarkov.dev'}`,
      primarySemanticSource: WIKI_BASE,
      gameMode: dataset.gameMode,
      syncedAt: dataset.retrievedAt,
      taskCount: tasks.length,
      kappaTaskCount: tasks.filter((task) => task.countsForKappa).length,
      lightkeeperTaskCount: tasks.filter((task) => task.lightkeeperRequired).length,
      objectiveMapTaskCount: tasks.filter((task) => task.objectiveMaps.length > 0).length,
      sources: dataset.sources,
    },
    tasks,
  };
}

export function validateTasksPayload(payload: NormalizedTasksPayload): ValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(payload.tasks) || payload.tasks.length === 0) {
    errors.push('No tasks were normalized. Refusing to overwrite src/data/tasks.json.');
  }
  const ids = new Set<string>();
  let unknownTraderCount = 0;
  payload.tasks.forEach((task, index) => {
    if (!task.id) errors.push(`Task at index ${index} has no id.`);
    if (task.id && ids.has(task.id)) errors.push(`Duplicate task id: ${task.id}.`);
    if (task.id) ids.add(task.id);
    if (!task.title || task.title.trim().length === 0 || task.title === 'Unknown') {
      errors.push(`Task ${task.id || index} has an empty title.`);
    }
    if (!task.trader || task.trader === 'Unknown') unknownTraderCount += 1;
    if (!Array.isArray(task.objectives) || !Array.isArray(task.objectiveDetails)) {
      errors.push(`Task ${task.id || index} has invalid objective arrays.`);
    }
    if (task.objectiveDetails?.some((objective) => !objective.description || !Array.isArray(objective.maps))) {
      errors.push(`Task ${task.id || index} has an invalid objective detail.`);
    }
    if (!Array.isArray(task.provenance) || task.provenance.length === 0) {
      errors.push(`Task ${task.id || index} has no provenance.`);
    }
  });
  if (payload.tasks.length > 0 && unknownTraderCount / payload.tasks.length > 0.02) {
    errors.push(`Trader resolution looks wrong: ${unknownTraderCount}/${payload.tasks.length} tasks resolved to Unknown.`);
  }
  return { ok: errors.length === 0, errors };
}

export async function writeValidatedTasksPayload(filePath: string, payload: NormalizedTasksPayload) {
  const validation = validateTasksPayload(payload);
  if (!validation.ok) {
    throw new Error(`Refusing to overwrite tasks.json:\n${validation.errors.map((error) => `- ${error}`).join('\n')}`);
  }
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
