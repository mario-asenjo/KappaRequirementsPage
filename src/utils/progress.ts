import { Goal, Task, UserProgress } from '../types';

export const defaultUserProgress: UserProgress = {
  version: 1,
  playerLevel: 1,
  completedTaskIds: [],
  startedTaskIds: [],
  completedAchievementIds: [],
  manualAchievementProgress: {},
  selectedGoalId: 'kappa',
};

const unique = (values: string[]) => Array.from(new Set(values));

export function normalizeUserProgress(progress: Partial<UserProgress> | undefined): UserProgress {
  return {
    ...defaultUserProgress,
    ...progress,
    version: 1,
    playerLevel: Math.min(79, Math.max(1, Number(progress?.playerLevel) || defaultUserProgress.playerLevel)),
    completedTaskIds: unique(progress?.completedTaskIds ?? []),
    startedTaskIds: unique(progress?.startedTaskIds ?? []),
    completedAchievementIds: unique(progress?.completedAchievementIds ?? []),
    manualAchievementProgress: progress?.manualAchievementProgress ?? {},
    selectedGoalId: progress?.selectedGoalId || defaultUserProgress.selectedGoalId,
    lastImport: progress?.lastImport,
  };
}

export function getGoalTasks(goal: Goal, tasks: Task[]) {
  const taskIds = new Set(goal.taskIds);
  return tasks.filter((task) => taskIds.has(task.id));
}

export function getGoalProgress(goal: Goal, progress: UserProgress, tasks: Task[]) {
  const goalTasks = getGoalTasks(goal, tasks);
  const completedTaskIds = new Set(progress.completedTaskIds);
  const completedTasks = goalTasks.filter((task) => completedTaskIds.has(task.id));
  const completedAchievementIds = new Set(progress.completedAchievementIds);
  const completedAchievements = goal.achievementIds.filter((id) =>
    completedAchievementIds.has(id) || progress.manualAchievementProgress[id]
  );
  const total = goalTasks.length + goal.achievementIds.length;
  const completed = completedTasks.length + completedAchievements.length;

  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    completedTasks: completedTasks.length,
    totalTasks: goalTasks.length,
    completedAchievements: completedAchievements.length,
    totalAchievements: goal.achievementIds.length,
  };
}
