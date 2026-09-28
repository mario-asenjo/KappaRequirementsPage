import { GameMode, Goal, ProfileProgress, Task, UserProgress } from '../types';

export const defaultProfileKey = 'pve:default';
export const gameModes: Array<{ id: GameMode; label: string }> = [
  { id: 'pve', label: 'PvE Zone' },
  { id: 'pvp', label: 'PvP Zone' },
  { id: 'seasonal-pvp', label: 'PvP Seasonal' },
];

export const defaultProfileProgress: ProfileProgress = {
  mode: 'pve', playerLevel: 1, completedTaskIds: [], startedTaskIds: [], completedAchievementIds: [], manualAchievementProgress: {}, selectedGoalId: 'kappa',
};

export const defaultUserProgress: UserProgress = { version: 2, activeProfileKey: defaultProfileKey, profiles: { [defaultProfileKey]: defaultProfileProgress } };
const unique = (values: unknown) => Array.from(new Set(Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0) : []));

export function profileKey(mode: GameMode, profileId?: string) { return `${mode}:${profileId || 'default'}`; }

function normalizeProfile(progress: Partial<ProfileProgress> | undefined, mode: GameMode = 'pve'): ProfileProgress {
  return {
    ...defaultProfileProgress, ...progress, mode,
    playerLevel: Math.min(79, Math.max(1, Number(progress?.playerLevel) || 1)),
    completedTaskIds: unique(progress?.completedTaskIds), startedTaskIds: unique(progress?.startedTaskIds), completedAchievementIds: unique(progress?.completedAchievementIds),
    manualAchievementProgress: progress?.manualAchievementProgress ?? {}, selectedGoalId: progress?.selectedGoalId || 'kappa', lastImport: progress?.lastImport,
  };
}

export function normalizeUserProgress(progress: Partial<UserProgress> | Partial<ProfileProgress> | undefined): UserProgress {
  const versioned = progress as Partial<UserProgress>;
  const legacy = progress as Partial<ProfileProgress>;
  const rawProfiles = versioned.profiles;
  const profiles = rawProfiles && typeof rawProfiles === 'object'
    ? Object.fromEntries(Object.entries(rawProfiles).map(([key, value]) => {
      const candidate = value as Partial<ProfileProgress>;
      return [key, normalizeProfile(candidate, candidate.mode ?? (key.split(':')[0] as GameMode) ?? 'pve')];
    }))
    : { [defaultProfileKey]: normalizeProfile(legacy, 'pve') };
  const requestedProfileKey = versioned.activeProfileKey;
  const activeProfileKey = requestedProfileKey && profiles[requestedProfileKey] ? requestedProfileKey : Object.keys(profiles)[0] ?? defaultProfileKey;
  return { version: 2, activeProfileKey, profiles };
}

export function getGoalTasks(goal: Goal, tasks: Task[]) { return tasks.filter((task) => new Set(goal.taskIds).has(task.id)); }
export function getGoalProgress(goal: Goal, progress: ProfileProgress, tasks: Task[]) {
  const goalTasks = getGoalTasks(goal, tasks); const completedTaskIds = new Set(progress.completedTaskIds); const completedTasks = goalTasks.filter((task) => completedTaskIds.has(task.id));
  const completedAchievementIds = new Set(progress.completedAchievementIds); const completedAchievements = goal.achievementIds.filter((id) => completedAchievementIds.has(id) || progress.manualAchievementProgress[id]); const total = goalTasks.length + goal.achievementIds.length; const completed = completedTasks.length + completedAchievements.length;
  return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0, completedTasks: completedTasks.length, totalTasks: goalTasks.length, completedAchievements: completedAchievements.length, totalAchievements: goal.achievementIds.length };
}
