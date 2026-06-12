import {
  ItemPlannerPreferences,
  ItemRequirementIndexEntry,
  ItemRequirementSummary,
} from '../types/itemPlanner';

const normalize = (value: string | undefined) => value?.trim().toLocaleLowerCase() ?? '';

export const defaultItemPlannerPreferences: ItemPlannerPreferences = {
  version: 1,
  itemSelections: {},
};

export function normalizeItemPlannerPreferences(
  preferences: Partial<ItemPlannerPreferences> | undefined,
): ItemPlannerPreferences {
  const itemSelections: Record<string, Record<string, boolean>> = {};
  if (preferences?.itemSelections && typeof preferences.itemSelections === 'object') {
    for (const [itemId, selections] of Object.entries(preferences.itemSelections)) {
      if (!selections || typeof selections !== 'object' || Array.isArray(selections)) continue;
      const normalizedSelections: Record<string, boolean> = {};
      for (const [requirementId, included] of Object.entries(selections)) {
        if (typeof included === 'boolean') normalizedSelections[requirementId] = included;
      }
      if (Object.keys(normalizedSelections).length > 0) itemSelections[itemId] = normalizedSelections;
    }
  }

  return {
    version: 1,
    itemSelections,
  };
}

export function searchItemRequirements(
  items: ItemRequirementIndexEntry[],
  query: string,
  limit = 20,
): ItemRequirementIndexEntry[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const score = (item: ItemRequirementIndexEntry) => {
    const candidates = [item.name, item.shortName, item.normalizedName].map(normalize).filter(Boolean);
    if (candidates.some((candidate) => candidate === normalizedQuery)) return 0;
    if (candidates.some((candidate) => candidate.startsWith(normalizedQuery))) return 1;
    if (candidates.some((candidate) => candidate.includes(normalizedQuery))) return 2;
    return Number.POSITIVE_INFINITY;
  };

  return items
    .map((item) => ({ item, rank: score(item) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map(({ item }) => item);
}

export function getRequirementInclusion(
  itemId: string,
  requirementId: string,
  preferences: ItemPlannerPreferences,
): boolean {
  return preferences.itemSelections[itemId]?.[requirementId] ?? true;
}

export function setRequirementInclusion(
  itemId: string,
  requirementId: string,
  included: boolean,
  preferences: ItemPlannerPreferences,
): ItemPlannerPreferences {
  const currentSelections = preferences.itemSelections[itemId] ?? {};
  const nextSelections = { ...currentSelections };

  if (included) {
    delete nextSelections[requirementId];
  } else {
    nextSelections[requirementId] = false;
  }

  const nextItemSelections = { ...preferences.itemSelections };
  if (Object.keys(nextSelections).length === 0) {
    delete nextItemSelections[itemId];
  } else {
    nextItemSelections[itemId] = nextSelections;
  }

  return {
    version: 1,
    itemSelections: nextItemSelections,
  };
}

export function setAllRequirementInclusions(
  item: ItemRequirementIndexEntry,
  included: boolean,
  preferences: ItemPlannerPreferences,
): ItemPlannerPreferences {
  if (included) {
    const nextItemSelections = { ...preferences.itemSelections };
    delete nextItemSelections[item.id];
    return { version: 1, itemSelections: nextItemSelections };
  }

  return {
    version: 1,
    itemSelections: {
      ...preferences.itemSelections,
      [item.id]: Object.fromEntries(item.requirements.map((requirement) => [requirement.id, false])),
    },
  };
}

export function calculateItemRequirementSummary(
  item: ItemRequirementIndexEntry,
  preferences: ItemPlannerPreferences,
): ItemRequirementSummary {
  const rows = item.requirements.map((requirement) => ({
    ...requirement,
    included: getRequirementInclusion(item.id, requirement.id, preferences),
  }));

  const includedRows = rows.filter((row) => row.included);
  const excludedRows = rows.filter((row) => !row.included);
  const sum = (kind?: 'quest' | 'hideout') => includedRows
    .filter((row) => row.countsTowardTotal)
    .filter((row) => (kind ? row.kind === kind : true))
    .reduce((total, row) => total + row.quantity, 0);

  return {
    totalRequired: sum(),
    questRequired: sum('quest'),
    hideoutRequired: sum('hideout'),
    excludedQuantity: excludedRows.filter((row) => row.countsTowardTotal).reduce((total, row) => total + row.quantity, 0),
    includedRows,
    excludedRows,
    rows,
  };
}
