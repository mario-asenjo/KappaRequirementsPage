/**
 * Type definitions for tasks (quests) in Escape from Tarkov. These
 * definitions are used throughout the app to provide type safety. A task
 * represents a single quest given by a trader. Each task may have
 * prerequisites, objectives and rewards.
 */

export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Human‑readable name of the task */
  title: string;
  /** Name of the trader who gives the task */
  trader: string;
  /** Machine-friendly task slug when provided by the structured source */
  normalizedName?: string;
  /** Map or location associated with the task, if any */
  location?: string;
  /** Maps referenced by specific objectives, used when task-level location is generic */
  objectiveMaps?: string[];
  /** Minimum player level required to unlock the task */
  levelRequirement?: number;
  /** List of objectives to complete this task */
  objectives: string[];
  /** Objective descriptions with per-objective maps from structured data */
  objectiveDetails?: TaskObjectiveDetail[];
  /** Task description giving more detail */
  description?: string;
  /** Rewards given upon completion */
  rewards?: string;
  /** Names of tasks that must be completed first */
  prerequisites?: string[];
  /** First known trader loyalty level gate from structured data */
  traderLoyaltyLevel?: number;
  /** Source provenance for normalized task data */
  dataSources?: TaskDataSources;
  /** Whether this task counts toward the legacy Kappa secure container data flag */
  countsForKappa: boolean;
  /** Whether this task counts toward Lightkeeper progression */
  lightkeeperRequired?: boolean;
  /** Achievement rewards granted by finishing this task */
  achievementRewards?: AchievementReference[];
}


export interface TaskObjectiveDetail {
  description: string;
  maps: string[];
}

export interface TaskDataSources {
  structured: string;
  semantic: string;
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
