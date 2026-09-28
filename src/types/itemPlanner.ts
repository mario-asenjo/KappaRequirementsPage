export interface ItemRequirementIndexFile {
  schemaVersion: 2;
  metadata: {
    source: string;
    syncedAt: string;
    itemCount: number;
    requirementCount: number;
    questRequirementCount: number;
    hideoutRequirementCount: number;
    barterCount: number;
    barterItemLinkCount: number;
    barterTraderCount: number;
    bartersWithLoyaltyLevel: number;
    bartersWithoutLoyaltyLevel: number;
    sources: string[];
    fandomPageCount?: number;
    fandomRequirementCount?: number;
    fandomMergedRequirementCount?: number;
    fandomError?: string;
  };
  items: ItemRequirementIndexEntry[];
}

export interface ItemRequirementIndexEntry {
  id: string;
  name: string;
  shortName?: string;
  normalizedName?: string;
  iconLink?: string;
  wikiLink?: string;
  requirements: ItemRequirementEntry[];
  barters: ItemBarterEntry[];
}

export type ItemBarterDirection = 'input' | 'output';

export interface ItemBarterItem {
  itemId: string;
  name: string;
  quantity: number;
}

export interface ItemBarterEntry {
  id: string;
  direction: ItemBarterDirection;
  traderId: string;
  traderName: string;
  loyaltyLevel?: number;
  requiredItems: ItemBarterItem[];
  receivedItems: ItemBarterItem[];
}

export type ItemRequirementKind = 'quest' | 'hideout';

export interface HideoutStationLevelRequirement {
  stationId: string;
  stationName: string;
  level: number;
}

export interface ItemRequirementEntry {
  id: string;
  kind: ItemRequirementKind;
  quantity: number;
  countsTowardTotal: boolean;
  label: string;
  description?: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  trader?: string;
  taskId?: string;
  objectiveId?: string;
  objectiveType?: string;
  kappaRequired?: boolean;
  lightkeeperRequired?: boolean;
  foundInRaid?: boolean;
  optional?: boolean;
  stationId?: string;
  stationName?: string;
  level?: number;
  stationLevelId?: string;
  prerequisites?: HideoutStationLevelRequirement[];
}

export interface ItemPlannerPreferences {
  version: 1;
  itemSelections: Record<string, Record<string, boolean>>;
}

export interface ItemRequirementSummaryRow extends ItemRequirementEntry {
  included: boolean;
}

export interface ItemRequirementSummary {
  totalRequired: number;
  questRequired: number;
  hideoutRequired: number;
  excludedQuantity: number;
  includedRows: ItemRequirementEntry[];
  excludedRows: ItemRequirementEntry[];
  rows: ItemRequirementSummaryRow[];
}
