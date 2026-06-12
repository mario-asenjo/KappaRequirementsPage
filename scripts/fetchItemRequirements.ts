import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import {
  HideoutStationLevelRequirement,
  ItemRequirementEntry,
  ItemRequirementIndexEntry,
  ItemRequirementIndexFile,
} from '../src/types/itemPlanner';

const query = `query ItemRequirements {
  items {
    id
    name
    normalizedName
    shortName
    iconLink
    wikiLink
    usedInTasks {
      id
      name
      wikiLink
      kappaRequired
      lightkeeperRequired
      trader { name }
      objectives {
        id
        type
        description
        optional
        ... on TaskObjectiveItem {
          count
          foundInRaid
          items { id name shortName }
        }
      }
    }
  }
  hideoutStations {
    id
    name
    levels {
      id
      level
      itemRequirements {
        item { id name normalizedName shortName iconLink wikiLink }
        count
        quantity
      }
      stationLevelRequirements {
        station { id name }
        level
      }
    }
  }
}`;

interface ApiItem {
  id: string;
  name?: string;
  normalizedName?: string;
  shortName?: string;
  iconLink?: string;
  wikiLink?: string;
  usedInTasks?: ApiTask[];
}

interface ApiTask {
  id: string;
  name: string;
  wikiLink?: string;
  kappaRequired?: boolean;
  lightkeeperRequired?: boolean;
  trader?: { name?: string };
  objectives?: ApiObjective[];
}

interface ApiObjective {
  id?: string;
  type: string;
  description: string;
  optional: boolean;
  count?: number;
  foundInRaid?: boolean;
  items?: Array<{ id: string; name?: string; shortName?: string }>;
}

interface ApiHideoutStation {
  id: string;
  name: string;
  levels?: ApiHideoutLevel[];
}

interface ApiHideoutLevel {
  id: string;
  level: number;
  itemRequirements?: ApiHideoutItemRequirement[];
  stationLevelRequirements?: Array<{ station: { id: string; name: string }; level: number }>;
}

interface ApiHideoutItemRequirement {
  item: ApiItem;
  count: number;
  quantity: number;
}

function ensureItem(index: Map<string, ItemRequirementIndexEntry>, item: ApiItem): ItemRequirementIndexEntry {
  const existing = index.get(item.id);
  if (existing) {
    existing.name = existing.name || item.name || item.shortName || item.id;
    existing.shortName = existing.shortName || item.shortName;
    existing.normalizedName = existing.normalizedName || item.normalizedName;
    existing.iconLink = existing.iconLink || item.iconLink;
    existing.wikiLink = existing.wikiLink || item.wikiLink;
    return existing;
  }

  const entry: ItemRequirementIndexEntry = {
    id: item.id,
    name: item.name || item.shortName || item.id,
    shortName: item.shortName || undefined,
    normalizedName: item.normalizedName || undefined,
    iconLink: item.iconLink || undefined,
    wikiLink: item.wikiLink || undefined,
    requirements: [],
  };
  index.set(item.id, entry);
  return entry;
}

function addRequirement(entry: ItemRequirementIndexEntry, requirement: ItemRequirementEntry) {
  if (requirement.quantity <= 0) return;
  if (entry.requirements.some((existing) => existing.id === requirement.id)) return;
  entry.requirements.push(requirement);
}

const questObjectiveTypesThatConsumeItems = new Set(['giveItem', 'plantItem']);

function doesQuestObjectiveCountTowardKeepTotal(objective: ApiObjective) {
  return questObjectiveTypesThatConsumeItems.has(objective.type);
}

function buildIndex(items: ApiItem[], hideoutStations: ApiHideoutStation[]): ItemRequirementIndexFile {
  const index = new Map<string, ItemRequirementIndexEntry>();

  for (const item of items) {
    ensureItem(index, item);
  }

  for (const item of items) {
    const indexedItem = ensureItem(index, item);
    for (const task of item.usedInTasks ?? []) {
      for (const objective of task.objectives ?? []) {
        const objectiveItems = objective.items ?? [];
        if (!objectiveItems.some((objectiveItem) => objectiveItem.id === item.id)) continue;
        const objectiveId = objective.id || `${task.id}-${objective.description}`;
        addRequirement(indexedItem, {
          id: `quest:${task.id}:${objectiveId}:${item.id}`,
          kind: 'quest',
          quantity: objective.count ?? 1,
          countsTowardTotal: doesQuestObjectiveCountTowardKeepTotal(objective),
          label: task.name,
          description: objective.description,
          sourceId: task.id,
          sourceName: task.name,
          sourceUrl: task.wikiLink || item.wikiLink,
          trader: task.trader?.name || 'Unknown',
          taskId: task.id,
          objectiveId,
          objectiveType: objective.type,
          kappaRequired: Boolean(task.kappaRequired),
          lightkeeperRequired: Boolean(task.lightkeeperRequired),
          foundInRaid: Boolean(objective.foundInRaid),
          optional: Boolean(objective.optional),
        });
      }
    }
  }

  for (const station of hideoutStations) {
    for (const level of station.levels ?? []) {
      const prerequisites: HideoutStationLevelRequirement[] = (level.stationLevelRequirements ?? []).map((requirement) => ({
        stationId: requirement.station.id,
        stationName: requirement.station.name,
        level: requirement.level,
      }));

      for (const itemRequirement of level.itemRequirements ?? []) {
        const item = itemRequirement.item;
        const indexedItem = ensureItem(index, item);
        const quantity = itemRequirement.quantity ?? itemRequirement.count;
        addRequirement(indexedItem, {
          id: `hideout:${station.id}:${level.level}:${item.id}`,
          kind: 'hideout',
          quantity,
          countsTowardTotal: true,
          label: `${station.name} level ${level.level}`,
          description: `Upgrade ${station.name} to level ${level.level}`,
          sourceId: `${station.id}:${level.level}`,
          sourceName: station.name,
          stationId: station.id,
          stationName: station.name,
          level: level.level,
          stationLevelId: level.id,
          prerequisites,
        });
      }
    }
  }

  const itemsWithRequirements = [...index.values()]
    .map((item) => ({
      ...item,
      requirements: item.requirements.sort((a, b) => {
        const kindOrder = a.kind.localeCompare(b.kind);
        if (kindOrder !== 0) return kindOrder;
        return a.sourceName.localeCompare(b.sourceName) || (a.level ?? 0) - (b.level ?? 0) || a.id.localeCompare(b.id);
      }),
    }))
    .filter((item) => item.requirements.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const requirementCount = itemsWithRequirements.reduce((total, item) => total + item.requirements.length, 0);
  const questRequirementCount = itemsWithRequirements.reduce(
    (total, item) => total + item.requirements.filter((requirement) => requirement.kind === 'quest').length,
    0,
  );
  const hideoutRequirementCount = requirementCount - questRequirementCount;

  return {
    schemaVersion: 1,
    metadata: {
      source: 'https://api.tarkov.dev/graphql',
      syncedAt: new Date().toISOString(),
      itemCount: itemsWithRequirements.length,
      requirementCount,
      questRequirementCount,
      hideoutRequirementCount,
    },
    items: itemsWithRequirements,
  };
}

async function fetchItemRequirements() {
  const response = await fetch('https://api.tarkov.dev/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'KappaTracker/item-requirements',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as {
    data?: { items?: ApiItem[]; hideoutStations?: ApiHideoutStation[] };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(`GraphQL error: ${payload.errors.map((error) => error.message).join('; ')}`);
  }

  const items = payload.data?.items;
  const hideoutStations = payload.data?.hideoutStations;
  if (!Array.isArray(items) || !Array.isArray(hideoutStations)) {
    throw new Error('Unexpected item requirement response structure');
  }

  const index = buildIndex(items, hideoutStations);
  const filePath = fileURLToPath(new URL('../src/data/itemRequirements.json', import.meta.url));
  await writeFile(filePath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  console.log(
    `Built ${index.metadata.itemCount} item entries with ${index.metadata.requirementCount} requirements `
    + `(${index.metadata.questRequirementCount} quest, ${index.metadata.hideoutRequirementCount} hideout)`,
  );
}

fetchItemRequirements().catch((error) => {
  console.error(error);
  process.exit(1);
});
