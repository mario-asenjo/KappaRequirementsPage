import { useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import useLocalStorage from './useLocalStorage';
import { GameMode, ProfileProgress, UserProgress } from '../types';
import { defaultProfileProgress, defaultUserProgress, normalizeUserProgress, profileKey } from '../utils/progress';

export default function useProgress() {
  const [legacyCompletedTaskIds, setLegacyCompletedTaskIds] = useLocalStorage<string[]>('completedTasks', []);
  const [legacyPlayerLevel, setLegacyPlayerLevel] = useLocalStorage<number>('playerLevel', 1);
  const [storedProgress, setStoredProgress] = useLocalStorage<UserProgress | Partial<ProfileProgress>>('userProgress', defaultUserProgress);
  const hasStoredProgress = typeof window !== 'undefined' && window.localStorage.getItem('userProgress') !== null;
  const state = useMemo(() => normalizeUserProgress((hasStoredProgress ? storedProgress : { completedTaskIds: legacyCompletedTaskIds, playerLevel: legacyPlayerLevel }) as unknown as UserProgress), [hasStoredProgress, legacyCompletedTaskIds, legacyPlayerLevel, storedProgress]);
  const progress = state.profiles[state.activeProfileKey] ?? defaultProfileProgress;

  useEffect(() => { if (JSON.stringify(storedProgress) !== JSON.stringify(state)) setStoredProgress(state); }, [state, setStoredProgress, storedProgress]);
  useEffect(() => { if (legacyCompletedTaskIds.join('|') !== progress.completedTaskIds.join('|')) setLegacyCompletedTaskIds(progress.completedTaskIds); }, [legacyCompletedTaskIds, progress.completedTaskIds, setLegacyCompletedTaskIds]);
  useEffect(() => { if (legacyPlayerLevel !== progress.playerLevel) setLegacyPlayerLevel(progress.playerLevel); }, [legacyPlayerLevel, progress.playerLevel, setLegacyPlayerLevel]);

  const setProgress: Dispatch<SetStateAction<ProfileProgress>> = (value) => setStoredProgress((current) => {
    const normalized = normalizeUserProgress(current as UserProgress); const active = normalized.profiles[normalized.activeProfileKey];
    return { ...normalized, profiles: { ...normalized.profiles, [normalized.activeProfileKey]: value instanceof Function ? value(active) : value } };
  });
  const selectProfile = (mode: GameMode, profileId?: string) => setStoredProgress((current) => {
    const normalized = normalizeUserProgress(current as UserProgress); const key = profileKey(mode, profileId);
    return { ...normalized, activeProfileKey: key, profiles: { ...normalized.profiles, [key]: normalized.profiles[key] ?? { ...defaultProfileProgress, mode, profileId } } };
  });
  const resetProgress = () => { setStoredProgress(defaultUserProgress); setLegacyCompletedTaskIds([]); setLegacyPlayerLevel(1); };
  const update = <T,>(field: keyof ProfileProgress, value: SetStateAction<T>) => setProgress((current) => ({ ...current, [field]: value instanceof Function ? value(current[field] as T) : value }));
  return { progress, state, setProgress, resetProgress, selectProfile, activeProfileKey: state.activeProfileKey, completedTaskIds: progress.completedTaskIds, setCompletedTaskIds: (value: SetStateAction<string[]>) => update('completedTaskIds', value), startedTaskIds: progress.startedTaskIds, setStartedTaskIds: (value: SetStateAction<string[]>) => update('startedTaskIds', value), playerLevel: progress.playerLevel, setPlayerLevel: (value: SetStateAction<number>) => update('playerLevel', value), completedAchievementIds: progress.completedAchievementIds, setCompletedAchievementIds: (value: SetStateAction<string[]>) => update('completedAchievementIds', value), manualAchievementProgress: progress.manualAchievementProgress, setManualAchievementProgress: (id: string, completed: boolean) => setProgress((current) => ({ ...current, manualAchievementProgress: { ...current.manualAchievementProgress, [id]: completed } })) };
}
