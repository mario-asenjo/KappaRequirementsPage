export interface ItemRequirementIndexFile {
  schemaVersion: 1;
  metadata: {
    source: string;
    syncedAt: string;
    itemCount: number;
    requirementCount: number;
    questRequirementCount: number;
    hideoutRequirementCount: number;
    fandomPageCount?: number;
    fandomRequirementCount?: number;
    fandomMergedRequirementCount?: number;
    fandomBarterCount?: number;
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
  barters?: ItemBarterEntry[];
}

export type ItemBarterDirection = 'required' | 'received';

export interface ItemBarterItem {
  name: string;
  quantity: number;
  wikiLink?: string;
}

export interface ItemBarterEntry {
  id: string;
  direction: ItemBarterDirection;
  traderName: string;
  traderLevel?: number;
  traderRequirement?: string;
  requiredItems: ItemBarterItem[];
  receivedItems: ItemBarterItem[];
  sourceUrl?: string;
  description?: string;
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
