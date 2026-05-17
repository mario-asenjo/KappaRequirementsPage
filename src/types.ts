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
  /** Map or location associated with the task, if any */
  location?: string;
  /** Minimum player level required to unlock the task */
  levelRequirement?: number;
  /** List of objectives to complete this task */
  objectives: string[];
  /** Task description giving more detail */
  description?: string;
  /** Rewards given upon completion */
  rewards?: string;
  /** Names of tasks that must be completed first */
  prerequisites?: string[];
  /** Whether this task counts toward the Kappa secure container */
  countsForKappa: boolean;
  /** Whether this task counts toward Lightkeeper progression */
  lightkeeperRequired?: boolean;
  /** Achievement rewards granted by finishing this task */
  achievementRewards?: AchievementReference[];
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
