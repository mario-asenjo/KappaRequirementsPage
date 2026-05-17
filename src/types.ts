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
}
