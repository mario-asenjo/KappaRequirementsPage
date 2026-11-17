/**
 * Type definitions for tasks (quests) in Escape from Tarkov. These
 * definitions are used throughout the app to provide type safety. A task
 * represents a single quest given by a trader. Each task may have
 * prerequisites, objectives and rewards.
 */

export type TaskGameMode = 'pve' | 'pvp';

export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Human-readable name of the task */
  title: string;
  /** Machine-friendly slug from the structured source */
  normalizedName?: string;
  /** Name of the trader who gives the task */
  trader: string;
  /** Dataset the task comes from (json.tarkov.dev /pve or /regular) */
  gameMode?: TaskGameMode;
  /** True for [PVE ZONE] / [PVP ZONE] variants that only exist in one mode */
  modeExclusive?: boolean;
  /** Only available to this faction; absent means both */
  faction?: 'BEAR' | 'USEC';
  /** Task-level map, or the first objective map when the task is generic */
  location?: string;
  /** Maps referenced by any objective */
  objectiveMaps?: string[];
  /** Minimum player level required to unlock the task */
  levelRequirement?: number;
  /** Objective descriptions (kept for older views) */
  objectives: string[];
  /** Typed objectives with maps, items and FiR flags */
  objectiveDetails?: TaskObjectiveDetail[];
  /** Task description giving more detail */
  description?: string;
  /** Rewards given upon completion */
  rewards?: string;
  /** Names of tasks that must be completed first (kept for older views) */
  prerequisites?: string[];
  /** Prerequisite task ids with the status they need (complete, failed, active) */
  prerequisiteIds?: TaskPrerequisite[];
  /** Every trader loyalty level gate of the task */
  traderLevelRequirements?: TraderLevelRequirement[];
  /** Minimum trader reputation (e.g. Fence reputation = Scav karma) */
  traderReputationRequirements?: TraderReputationRequirement[];
  /** Loyalty level required with the task's own trader */
  requiredTraderLoyaltyLevel?: number;
  /** Shared unlock counters (1.1+ loyalty pools); semantics resolved in #70 */
  unlockPools?: TaskUnlockPool[];
  /** Traders whose dialogue unlocks the task */
  dialogueUnlockTraders?: string[];
  /** Keys needed during the task, per map */
  neededKeys?: TaskKeyRequirement[];
  /** Conditions that fail the task */
  failConditions?: TaskObjectiveDetail[];
  /** Whether the task can be restarted after failing */
  restartable?: boolean;
  /** Delay before the task becomes available after unlocking */
  availableDelaySeconds?: { min: number; max: number };
  /** Experience reward */
  experience?: number;
  /** Offers, crafts, traders, locations or skills unlocked on completion */
  rewardUnlocks?: TaskRewardUnlock[];
  /** Current kappaRequired flag from the structured source */
  kappaRequired?: boolean;
  /** Same as kappaRequired; legacy name used by older views */
  countsForKappa: boolean;
  /** Whether this task counts toward Lightkeeper progression */
  lightkeeperRequired?: boolean;
  /** Achievement rewards granted by finishing this task */
  achievementRewards?: AchievementReference[];
  /** Field-level provenance when another source verified or overrode data (#70) */
  provenance?: SourceProvenance[];
  /** Structured-vs-semantic source conflicts (#70) */
  sourceConflicts?: SourceConflict[];
  /** How the data was obtained */
  dataConfidence?: 'verified' | 'structured' | 'fallback-wiki' | 'unknown';
}

export interface TaskObjectiveDetail {
  id?: string;
  type?: string;
  description: string;
  maps: string[];
  optional?: boolean;
  count?: number;
  itemIds?: string[];
  /** Set instead of itemIds when the objective accepts a large item category */
  acceptedItemCount?: number;
  foundInRaid?: boolean;
}

export interface TaskPrerequisite {
  id: string;
  status: string[];
}

export interface TraderLevelRequirement {
  trader: string;
  level: number;
}

export interface TraderReputationRequirement {
  trader: string;
  /** '>=' (at least) or '<=' (at most), as given by the source */
  compareMethod: string;
  value: number;
}

export interface TaskUnlockPool {
  variableId: string;
  minValue: number;
}

export interface TaskKeyRequirement {
  map?: string;
  keys: Array<{ id: string; name: string }>;
}

export interface TaskRewardUnlock {
  kind: 'offer' | 'craft' | 'trader' | 'location' | 'skill';
  label: string;
}

export interface SourceProvenance {
  provider: string;
  endpoint: string;
  retrievedAt: string;
  gameMode?: string;
}

export interface SourceConflict {
  field: string;
  structuredValue: unknown;
  semanticValue?: unknown;
  sources: SourceProvenance[];
  conflict: boolean;
}

export interface AchievementReference {
  id: string;
  name: string;
}

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  hidden: boolean;
  rarity?: string;
  imageLink?: string;
  playersCompletedPercent?: number;
  wiki?: {
    section?: string;
    reward?: string;
    rawDescription?: string;
    links: string[];
  };
}

export type GoalType = 'task-set' | 'achievement' | 'manual-achievement';

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  description: string;
  taskIds: string[];
  achievementIds: string[];
  source: 'tarkov.dev' | 'wiki' | 'derived';
}

export interface UserProgress {
  version: 1;
  playerLevel: number;
  completedTaskIds: string[];
  startedTaskIds: string[];
  completedAchievementIds: string[];
  manualAchievementProgress: Record<string, boolean>;
  selectedGoalId: string;
  lastImport?: ProgressImportSummary;
}

export interface ProgressImportSummary {
  source: string;
  importedAt: string;
  generatedAt: string;
  addedCompletedCount: number;
  detectedStartedCount: number;
  unknownTaskCount: number;
  warningCount: number;
  failedMarkedCompletedCount?: number;
}

export type ProgressImportEvent = 'completed' | 'started' | 'failed' | 'unknown';
export type ProgressImportConfidence = 'high' | 'medium' | 'low';

export interface ProgressImportRawMatch {
  taskId?: string;
  event: ProgressImportEvent;
  file?: string;
  line?: number;
  templateId?: string;
  confidence?: ProgressImportConfidence;
}

export interface ProgressImportUnmatchedTemplate {
  templateId: string;
  event: ProgressImportEvent;
}

export interface ProgressImportFile {
  schemaVersion: 1;
  source: 'eft-local-logs' | string;
  generatedAt: string;
  profile?: {
    profileId?: string;
    mode?: string;
  };
  completedTaskIds: string[];
  startedTaskIds?: string[];
  failedTaskIds?: string[];
  rawMatches?: ProgressImportRawMatch[];
  unmatchedTemplateIds?: ProgressImportUnmatchedTemplate[];
  warnings?: string[];
}
