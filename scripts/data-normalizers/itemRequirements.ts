import {
  HideoutStationLevelRequirement,
  ItemBarterItem,
  ItemRequirementEntry,
  ItemRequirementIndexEntry,
  ItemRequirementIndexFile,
} from '../../src/types/itemPlanner';
import { FandomRequirementParseResult, mergeFandomRequirements } from '../fandomItemRequirements';
import {
  JsonBarter,
  JsonItem,
  TarkovDevItemRequirementsDataset,
} from '../data-sources/tarkovDevItemRequirements';

const consumptiveObjectiveTypes = new Set(['giveItem', 'plantItem']);

function translated(value: string | undefined, translations: Record<string, string>) {
  return translations[value ?? ''] || value || 'Unknown';
}

function itemName(item: JsonItem, translations: Record<string, string>) {
  return translated(item.name, translations);
}

function ensureItem(index: Map<string, ItemRequirementIndexEntry>, item: JsonItem, translations: Record<string, string>) {
  const existing = index.get(item.id);
  if (existing) return existing;
  const entry: ItemRequirementIndexEntry = {
    id: item.id,
    name: itemName(item, translations),
    shortName: translated(item.shortName, translations),
    normalizedName: item.normalizedName,
    iconLink: item.iconLink,
    wikiLink: item.wikiLink,
    requirements: [],
    barters: [],
  };
  index.set(entry.id, entry);
  return entry;
}

function addRequirement(entry: ItemRequirementIndexEntry, requirement: ItemRequirementEntry) {
  if (requirement.quantity <= 0 || entry.requirements.some((row) => row.id === requirement.id)) return;
  entry.requirements.push(requirement);
}

function addBarter(entry: ItemRequirementIndexEntry, barter: ItemRequirementIndexEntry['barters'][number]) {
  if (!entry.barters.some((row) => row.id === barter.id && row.direction === barter.direction)) entry.barters.push(barter);
}

function toBarterItem(itemId: string, quantity: number, items: Record<string, JsonItem>, translations: Record<string, string>): ItemBarterItem | undefined {
  const item = items[itemId];
  if (!item || !Number.isFinite(quantity) || quantity <= 0) return undefined;
  return { itemId, name: itemName(item, translations), quantity };
}

function normalizeBarter(
  barter: JsonBarter,
  dataset: TarkovDevItemRequirementsDataset,
): { requiredItems: ItemBarterItem[]; receivedItem: ItemBarterItem; traderId: string; traderName: string; loyaltyLevel?: number } | undefined {
  const trader = dataset.traders[barter.trader];
  const requiredItems = (barter.requiredItems ?? []).map((row) => toBarterItem(row.item, row.count, dataset.items, dataset.itemTranslations));
  const receivedItem = barter.offeredItem && toBarterItem(barter.offeredItem.item, barter.offeredItem.count, dataset.items, dataset.itemTranslations);
  const loyaltyLevel = barter.minTraderLevel;
  if (!trader || requiredItems.some((item) => !item) || !receivedItem || (loyaltyLevel !== undefined && (!Number.isInteger(loyaltyLevel) || loyaltyLevel < 1 || loyaltyLevel > 4))) return undefined;
  return {
    requiredItems: requiredItems as ItemBarterItem[],
    receivedItem,
    traderId: trader.id,
    traderName: translated(trader.name, dataset.traderTranslations),
    loyaltyLevel,
  };
}

export function buildItemRequirementIndex(
  dataset: TarkovDevItemRequirementsDataset,
  fandomItems: FandomRequirementParseResult[] = [],
  fandomError?: string,
): ItemRequirementIndexFile {
  const index = new Map<string, ItemRequirementIndexEntry>();
  for (const item of Object.values(dataset.items)) ensureItem(index, item, dataset.itemTranslations);

  for (const task of Object.values(dataset.tasks)) {
    const taskName = translated(task.name, dataset.taskTranslations);
    const traderName = translated(dataset.traders[task.trader ?? '']?.name, dataset.traderTranslations);
    for (const objective of task.objectives ?? []) {
      for (const itemId of objective.items ?? []) {
        const item = dataset.items[itemId];
        if (!item) continue;
        const entry = ensureItem(index, item, dataset.itemTranslations);
        addRequirement(entry, {
          id: `quest:${task.id}:${objective.id}:${itemId}`,
          kind: 'quest',
          quantity: objective.count ?? 1,
          countsTowardTotal: consumptiveObjectiveTypes.has(objective.type),
          label: taskName,
          description: translated(objective.description, dataset.taskTranslations),
          sourceId: task.id,
          sourceName: taskName,
          sourceUrl: task.wikiLink,
          trader: traderName,
          taskId: task.id,
          objectiveId: objective.id,
          objectiveType: objective.type,
          kappaRequired: Boolean(task.kappaRequired),
          lightkeeperRequired: Boolean(task.lightkeeperRequired),
          foundInRaid: Boolean(objective.foundInRaid),
          optional: Boolean(objective.optional),
        });
      }
    }
  }

  for (const station of Object.values(dataset.hideout)) {
    const stationName = translated(station.name, dataset.hideoutTranslations);
    for (const level of station.levels ?? []) {
      const prerequisites: HideoutStationLevelRequirement[] = (level.stationLevelRequirements ?? []).map((requirement) => ({
        stationId: requirement.station,
        stationName: translated(dataset.hideout[requirement.station]?.name, dataset.hideoutTranslations),
        level: requirement.level,
      }));
      for (const requirement of level.itemRequirements ?? []) {
        const item = dataset.items[requirement.item];
        if (!item || !Number.isFinite(requirement.count) || requirement.count <= 0) continue;
        const entry = ensureItem(index, item, dataset.itemTranslations);
        addRequirement(entry, {
          id: `hideout:${station.id}:${level.level}:${item.id}`,
          kind: 'hideout',
          quantity: requirement.count,
          countsTowardTotal: true,
          label: `${stationName} level ${level.level}`,
          description: `Upgrade ${stationName} to level ${level.level}`,
          sourceId: `${station.id}:${level.level}`,
          sourceName: stationName,
          stationId: station.id,
          stationName,
          level: level.level,
          stationLevelId: level.id,
          prerequisites,
        });
      }
    }
  }

  let barterCount = 0;
  let bartersWithLoyaltyLevel = 0;
  const barterTraderIds = new Set<string>();
  const seenBarterIds = new Set<string>();
  for (const rawBarter of dataset.barters) {
    const barter = normalizeBarter(rawBarter, dataset);
    if (!barter || seenBarterIds.has(rawBarter.id)) continue;
    seenBarterIds.add(rawBarter.id);
    barterCount += 1;
    barterTraderIds.add(barter.traderId);
    if (barter.loyaltyLevel !== undefined) bartersWithLoyaltyLevel += 1;
    const receivedItems = [barter.receivedItem];
    for (const item of barter.requiredItems) {
      addBarter(ensureItem(index, dataset.items[item.itemId], dataset.itemTranslations), {
        id: rawBarter.id,
        direction: 'input',
        traderId: barter.traderId,
        traderName: barter.traderName,
        loyaltyLevel: barter.loyaltyLevel,
        requiredItems: barter.requiredItems,
        receivedItems,
      });
    }
    addBarter(ensureItem(index, dataset.items[barter.receivedItem.itemId], dataset.itemTranslations), {
      id: rawBarter.id,
      direction: 'output',
      traderId: barter.traderId,
      traderName: barter.traderName,
      loyaltyLevel: barter.loyaltyLevel,
      requiredItems: barter.requiredItems,
      receivedItems,
    });
  }

  const fandomStats = mergeFandomRequirements(index, fandomItems);
  const items = [...index.values()]
    .map((item) => ({
      ...item,
      requirements: item.requirements.sort((a, b) => a.kind.localeCompare(b.kind) || a.sourceName.localeCompare(b.sourceName) || a.id.localeCompare(b.id)),
      barters: (item.barters ?? []).sort((a, b) => a.traderName.localeCompare(b.traderName) || a.id.localeCompare(b.id) || a.direction.localeCompare(b.direction)),
    }))
    .filter((item) => item.requirements.length > 0 || item.barters.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const requirements = items.flatMap((item) => item.requirements);

  return {
    schemaVersion: 2,
    metadata: {
      source: 'json.tarkov.dev/pve + escapefromtarkov.fandom.com/wiki',
      syncedAt: dataset.retrievedAt,
      itemCount: items.length,
      requirementCount: requirements.length,
      questRequirementCount: requirements.filter((row) => row.kind === 'quest').length,
      hideoutRequirementCount: requirements.filter((row) => row.kind === 'hideout').length,
      barterCount,
      barterItemLinkCount: items.reduce((total, item) => total + item.barters.length, 0),
      barterTraderCount: barterTraderIds.size,
      bartersWithLoyaltyLevel,
      bartersWithoutLoyaltyLevel: barterCount - bartersWithLoyaltyLevel,
      sources: dataset.sources,
      fandomPageCount: fandomStats.pagesWithRequirements,
      fandomRequirementCount: fandomStats.parsedRequirementCount,
      fandomMergedRequirementCount: fandomStats.mergedRequirementCount,
      ...(fandomError ? { fandomError } : {}),
    },
    items,
  };
}

export function validateItemRequirementIndex(index: ItemRequirementIndexFile) {
  if (index.items.length === 0 || index.metadata.itemCount !== index.items.length) throw new Error('Invalid item requirements: item count mismatch');
  const barterIds = new Set<string>();
  for (const item of index.items) {
    if (!item.id || !item.name || (item.requirements.length === 0 && item.barters.length === 0)) throw new Error(`Invalid item requirement entry ${item.id}`);
    for (const barter of item.barters) {
      if (!barter.id || !barter.traderId || !barter.traderName || barter.requiredItems.length === 0 || barter.receivedItems.length === 0) throw new Error(`Invalid barter ${barter.id}`);
      if (barter.loyaltyLevel !== undefined && (!Number.isInteger(barter.loyaltyLevel) || barter.loyaltyLevel < 1 || barter.loyaltyLevel > 4)) throw new Error(`Invalid barter loyalty level ${barter.id}`);
      if ([...barter.requiredItems, ...barter.receivedItems].some((tradeItem) => !tradeItem.itemId || !tradeItem.name || !Number.isFinite(tradeItem.quantity) || tradeItem.quantity <= 0)) throw new Error(`Invalid barter item ${barter.id}`);
      barterIds.add(barter.id);
    }
  }
  if (barterIds.size !== index.metadata.barterCount) throw new Error('Invalid item requirements: barter count mismatch');
}
