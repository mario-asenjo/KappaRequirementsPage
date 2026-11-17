import { writeFile } from 'fs/promises';
import type {
  Task,
  TaskGameMode,
  TaskKeyRequirement,
  TaskObjectiveDetail,
  TaskRewardUnlock,
  SourceProvenance,
} from '../../src/types';
import type { JsonObjective, JsonRewards, JsonTask, TarkovDevJsonTaskDataset } from '../data-sources/tarkovDevJson';

export interface NormalizedTasksPayload {
  metadata: {
    source: string;
    primarySemanticSource: string;
    gameMode: TaskGameMode;
    syncedAt: string;
    taskCount: number;
    kappaTaskCount: number;
    lightkeeperTaskCount: number;
    objectiveMapTaskCount: number;
    traderLoyaltyGateCount: number;
    factionExclusiveCount: number;
    modeExclusiveCount: number;
    sources: SourceProvenance[];
  };
  /** Display names for every item id referenced by objectives, keys or rewards. */
  items: Record<string, string>;
  tasks: Task[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const WIKI_BASE = 'https://escapefromtarkov.fandom.com';
/** Objectives accepting more items than this (e.g. "any weapon") only keep the count. */
const MAX_LISTED_ITEMS = 20;

export const toTaskGameMode = (mode: TarkovDevJsonTaskDataset['gameMode']): TaskGameMode =>
  mode === 'regular' ? 'pvp' : 'pve';

const unique = <T>(values: Array<T | undefined | null>): T[] =>
  Array.from(new Set(values.filter((value): value is T => value !== undefined && value !== null && value !== '')));

const wikiTitle = (wikiLink?: string) => {
  if (!wikiLink) return undefined;
  return decodeURIComponent(wikiLink.split('/').pop() ?? '').replace(/_/g, ' ') || undefined;
};

export function normalizeTasks(dataset: TarkovDevJsonTaskDataset): { tasks: Task[]; items: Record<string, string> } {
  const gameMode = toTaskGameMode(dataset.gameMode);
  const referencedItems = new Map<string, string>();

  const translate = (key?: string) => (key ? dataset.taskTranslations[key] ?? undefined : undefined);
  const traderName = (id?: string) => {
    if (!id) return 'Unknown';
    const raw = dataset.traders[id]?.name;
    return (raw && (dataset.traderTranslations[raw] ?? raw)) || 'Unknown';
  };
  const mapName = (id?: string | null) => {
    if (!id) return undefined;
    const raw = dataset.maps[id]?.name;
    return raw ? dataset.mapTranslations[raw] ?? raw : undefined;
  };
  const itemName = (id?: string) => {
    if (!id) return undefined;
    const name = dataset.itemTranslations[`${id} Name`] ?? id;
    referencedItems.set(id, name);
    return name;
  };
  const taskName = (task?: JsonTask) =>
    translate(task?.name) ?? wikiTitle(task?.wikiLink) ?? task?.normalizedName ?? task?.id ?? 'Unknown';

  const objectiveDetail = (objective: JsonObjective): TaskObjectiveDetail => {
    const maps = unique([
      ...(objective.maps ?? []),
      ...(objective.zones ?? []).map((zone) => zone.map),
      ...(objective.possibleLocations ?? []).map((location) => location.map),
    ].map(mapName));
    const allItemIds = unique([...(objective.items ?? []), objective.item, objective.markerItem]);
    const itemIds = allItemIds.length <= MAX_LISTED_ITEMS ? allItemIds : [];
    itemIds.forEach(itemName);
    return {
      id: objective.id,
      type: objective.type,
      description: translate(objective.description) ?? translate(objective.id) ?? objective.description ?? objective.id,
      maps,
      optional: Boolean(objective.optional),
      ...(typeof objective.count === 'number' ? { count: objective.count } : {}),
      ...(itemIds.length > 0 ? { itemIds } : {}),
      ...(allItemIds.length > MAX_LISTED_ITEMS ? { acceptedItemCount: allItemIds.length } : {}),
      ...(objective.foundInRaid ? { foundInRaid: true } : {}),
    };
  };

  const rewardUnlocks = (rewards?: JsonRewards): TaskRewardUnlock[] => {
    if (!rewards) return [];
    const unlocks: TaskRewardUnlock[] = [];
    (rewards.offerUnlock ?? []).forEach((offer) => unlocks.push({
      kind: 'offer',
      label: `${itemName(offer.item)} (${traderName(offer.trader)} LL${offer.level})`,
    }));
    (rewards.craftUnlock ?? []).forEach((craft) => unlocks.push({
      kind: 'craft',
      label: (craft.rewardItems ?? []).map((reward) => itemName(reward.item)).join(', ') || 'Craft',
    }));
    (rewards.traderUnlock ?? []).forEach((trader) => unlocks.push({
      kind: 'trader',
      label: traderName(typeof trader === 'string' ? trader : trader.trader),
    }));
    (rewards.locationUnlock ?? []).forEach((location) => unlocks.push({
      kind: 'location',
      label: mapName(typeof location === 'string' ? location : location.map) ?? 'Location',
    }));
    (rewards.skillLevelReward ?? []).forEach((skill) => unlocks.push({ kind: 'skill', label: `${skill.skill} ${skill.level}` }));
    return unlocks;
  };

  const tasks = Object.values(dataset.tasks).map((task): Task => {
    const title = taskName(task);
    const objectiveDetails = (task.objectives ?? []).map(objectiveDetail);
    const objectiveMaps = unique(objectiveDetails.flatMap((objective) => objective.maps));
    const traderLevelRequirements = (task.traderRequirements ?? [])
      .filter((requirement) => (requirement.requirementType ?? 'level') === 'level' && typeof requirement.value === 'number')
      .map((requirement) => ({ trader: traderName(requirement.trader), level: requirement.value as number }));
    const traderReputationRequirements = (task.traderRequirements ?? [])
      .filter((requirement) => requirement.requirementType === 'reputation' && typeof requirement.value === 'number')
      .map((requirement) => ({
        trader: traderName(requirement.trader),
        compareMethod: requirement.compareMethod ?? '>=',
        value: requirement.value as number,
      }));
    const ownTraderName = traderName(task.trader);
    const neededKeys: TaskKeyRequirement[] = (task.neededKeys ?? []).map((requirement) => ({
      ...(mapName(requirement.map) ? { map: mapName(requirement.map) } : {}),
      keys: requirement.keys.map((id) => ({ id, name: itemName(id) ?? id })),
    }));
    const faction = task.factionName === 'BEAR' || task.factionName === 'USEC' ? task.factionName : undefined;
    const delayMax = task.availableDelaySecondsMax ?? 0;

    return {
      id: task.id,
      title,
      ...(task.normalizedName ? { normalizedName: task.normalizedName } : {}),
      trader: ownTraderName,
      gameMode,
      ...(/\[(PVE|PVP) ZONE\]/i.test(title) ? { modeExclusive: true } : {}),
      ...(faction ? { faction } : {}),
      location: mapName(task.map) ?? objectiveMaps[0],
      objectiveMaps,
      ...(task.minPlayerLevel ? { levelRequirement: task.minPlayerLevel } : {}),
      objectives: objectiveDetails.map((objective) => objective.description),
      objectiveDetails,
      description: task.wikiLink ? `Guia externa: ${task.wikiLink}` : undefined,
      prerequisites: (task.taskRequirements ?? []).map((requirement) => taskName(dataset.tasks[requirement.task])),
      prerequisiteIds: (task.taskRequirements ?? []).map((requirement) => ({
        id: requirement.task,
        status: requirement.status ?? ['complete'],
      })),
      ...(traderLevelRequirements.length > 0 ? { traderLevelRequirements } : {}),
      ...(traderReputationRequirements.length > 0 ? { traderReputationRequirements } : {}),
      requiredTraderLoyaltyLevel: traderLevelRequirements.find((requirement) => requirement.trader === ownTraderName)?.level,
      unlockPools: (task.otherRequirements ?? [])
        .filter((requirement) => requirement.type === 'globalVariable' && requirement.variableId)
        .map((requirement) => ({ variableId: requirement.variableId as string, minValue: requirement.value ?? 1 })),
      dialogueUnlockTraders: unique((task.otherRequirements ?? [])
        .filter((requirement) => requirement.type === 'dialogue')
        .flatMap((requirement) => (requirement.traders ?? []).map(traderName))),
      neededKeys,
      failConditions: (task.failConditions ?? []).map(objectiveDetail),
      ...(task.restartable ? { restartable: true } : {}),
      ...(delayMax > 0 ? { availableDelaySeconds: { min: task.availableDelaySecondsMin ?? delayMax, max: delayMax } } : {}),
      ...(task.experience ? { experience: task.experience } : {}),
      rewardUnlocks: rewardUnlocks(task.finishRewards),
      kappaRequired: Boolean(task.kappaRequired),
      countsForKappa: Boolean(task.kappaRequired),
      lightkeeperRequired: Boolean(task.lightkeeperRequired),
      achievementRewards: (task.finishRewards?.achievement ?? [])
        .map((achievement) => ({ id: achievement.id, name: translate(achievement.name) ?? achievement.name }))
        .filter((achievement) => achievement.id && achievement.name),
      // Dataset-level sources live in metadata.sources; per-task provenance is
      // reserved for fields verified or overridden by another source (#70).
      dataConfidence: 'structured',
    };
  })
    .map((task) => ({
      ...task,
      // Drop empty optional arrays to keep the bundled JSON small.
      ...(task.unlockPools?.length ? {} : { unlockPools: undefined }),
      ...(task.dialogueUnlockTraders?.length ? {} : { dialogueUnlockTraders: undefined }),
      ...(task.neededKeys?.length ? {} : { neededKeys: undefined }),
      ...(task.failConditions?.length ? {} : { failConditions: undefined }),
      ...(task.rewardUnlocks?.length ? {} : { rewardUnlocks: undefined }),
    }))
    .sort((a, b) => a.trader.localeCompare(b.trader) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

  const items = Object.fromEntries(Array.from(referencedItems.entries()).sort(([a], [b]) => a.localeCompare(b)));
  return { tasks, items };
}

export function buildTasksPayload(dataset: TarkovDevJsonTaskDataset): NormalizedTasksPayload {
  const { tasks, items } = normalizeTasks(dataset);
  return {
    metadata: {
      source: dataset.sources[0]?.endpoint ?? 'https://json.tarkov.dev',
      primarySemanticSource: WIKI_BASE,
      gameMode: toTaskGameMode(dataset.gameMode),
      syncedAt: dataset.retrievedAt,
      taskCount: tasks.length,
      kappaTaskCount: tasks.filter((task) => task.kappaRequired).length,
      lightkeeperTaskCount: tasks.filter((task) => task.lightkeeperRequired).length,
      objectiveMapTaskCount: tasks.filter((task) => (task.objectiveMaps ?? []).length > 0).length,
      traderLoyaltyGateCount: tasks.filter((task) => task.traderLevelRequirements?.length).length,
      factionExclusiveCount: tasks.filter((task) => task.faction).length,
      modeExclusiveCount: tasks.filter((task) => task.modeExclusive).length,
      sources: dataset.sources,
    },
    items,
    tasks,
  };
}

export function validateTasksPayload(payload: NormalizedTasksPayload, previousCount?: number, force = false): ValidationResult {
  const errors: string[] = [];
  const mode = payload.metadata.gameMode;
  if (!Array.isArray(payload.tasks) || payload.tasks.length === 0) {
    errors.push('No se normalizo ninguna task.');
  }
  if (!force && previousCount && payload.tasks.length < previousCount * 0.9) {
    errors.push(`El numero de tasks ${mode} cae de ${previousCount} a ${payload.tasks.length} (>10%). Revisa la fuente o usa --force.`);
  }

  const ids = new Set(payload.tasks.map((task) => task.id));
  const seen = new Set<string>();
  let unknownTraderCount = 0;
  const foreignTag = mode === 'pve' ? '[PVP ZONE]' : '[PVE ZONE]';

  payload.tasks.forEach((task, index) => {
    const label = task.id || `#${index}`;
    if (!task.id) errors.push(`La task ${label} no tiene id.`);
    if (task.id && seen.has(task.id)) errors.push(`Id duplicado: ${task.id}.`);
    seen.add(task.id);
    if (!task.title || task.title === 'Unknown') errors.push(`La task ${label} no tiene titulo.`);
    if (!task.trader || task.trader === 'Unknown') unknownTraderCount += 1;
    if (task.title.toUpperCase().includes(foreignTag)) errors.push(`La task ${label} (${task.title}) es de otro modo.`);
    if (task.gameMode !== mode) errors.push(`La task ${label} tiene gameMode ${task.gameMode} en un dataset ${mode}.`);
    (task.prerequisiteIds ?? []).forEach((requirement) => {
      if (!ids.has(requirement.id)) errors.push(`La task ${label} depende de ${requirement.id}, que no existe en ${mode}.`);
    });
    if (!Array.isArray(task.objectives) || !Array.isArray(task.objectiveDetails)) {
      errors.push(`La task ${label} tiene objetivos invalidos.`);
    }
    if (!task.dataConfidence) errors.push(`La task ${label} no tiene dataConfidence.`);
  });

  if (payload.tasks.length > 0 && unknownTraderCount / payload.tasks.length > 0.02) {
    errors.push(`Resolucion de traders sospechosa: ${unknownTraderCount}/${payload.tasks.length} en Unknown.`);
  }
  return { ok: errors.length === 0, errors };
}

export async function writeValidatedTasksPayload(
  filePath: string,
  payload: NormalizedTasksPayload,
  previousCount?: number,
  force = false
) {
  const validation = validateTasksPayload(payload, previousCount, force);
  if (!validation.ok) {
    throw new Error(`No se sobrescribe ${filePath}:\n${validation.errors.map((error) => `- ${error}`).join('\n')}`);
  }
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
