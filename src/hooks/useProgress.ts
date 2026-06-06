import { useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import useLocalStorage from './useLocalStorage';
import { UserProgress } from '../types';
import { defaultUserProgress, normalizeUserProgress } from '../utils/progress';

export default function useProgress() {
  const [legacyCompletedTaskIds, setLegacyCompletedTaskIds] = useLocalStorage<string[]>('completedTasks', []);
  const [legacyPlayerLevel, setLegacyPlayerLevel] = useLocalStorage<number>('playerLevel', 1);
  const [storedProgress, setStoredProgress] = useLocalStorage<UserProgress>('userProgress', defaultUserProgress);
  const hasStoredProgress = typeof window !== 'undefined' && window.localStorage.getItem('userProgress') !== null;
  const progress = useMemo(() => normalizeUserProgress({
    ...storedProgress,
    completedTaskIds: hasStoredProgress ? storedProgress.completedTaskIds : legacyCompletedTaskIds,
    playerLevel: hasStoredProgress ? storedProgress.playerLevel : storedProgress.playerLevel || legacyPlayerLevel,
  }), [hasStoredProgress, legacyCompletedTaskIds, legacyPlayerLevel, storedProgress]);

  useEffect(() => {
    const normalizedStoredProgress = normalizeUserProgress(storedProgress);
    if (JSON.stringify(normalizedStoredProgress) !== JSON.stringify(progress)) {
      setStoredProgress(progress);
    }
  }, [progress, setStoredProgress, storedProgress]);

  useEffect(() => {
    if (legacyCompletedTaskIds.join('|') !== progress.completedTaskIds.join('|')) {
      setLegacyCompletedTaskIds(progress.completedTaskIds);
    }
  }, [legacyCompletedTaskIds, progress.completedTaskIds, setLegacyCompletedTaskIds]);

  useEffect(() => {
    if (legacyPlayerLevel !== progress.playerLevel) {
      setLegacyPlayerLevel(progress.playerLevel);
    }
  }, [legacyPlayerLevel, progress.playerLevel, setLegacyPlayerLevel]);

  const setProgress: Dispatch<SetStateAction<UserProgress>> = (value) => {
    setStoredProgress((current) => normalizeUserProgress(
      value instanceof Function ? value(normalizeUserProgress(current)) : value
    ));
  };

  const setCompletedTaskIds: Dispatch<SetStateAction<string[]>> = (value) => {
    setProgress((current) => ({
      ...current,
      completedTaskIds: value instanceof Function ? value(current.completedTaskIds) : value,
    }));
  };

  const setPlayerLevel: Dispatch<SetStateAction<number>> = (value) => {
    setProgress((current) => ({
      ...current,
      playerLevel: value instanceof Function ? value(current.playerLevel) : value,
    }));
  };

  const setCompletedAchievementIds: Dispatch<SetStateAction<string[]>> = (value) => {
    setProgress((current) => ({
      ...current,
      completedAchievementIds: value instanceof Function ? value(current.completedAchievementIds) : value,
    }));
  };

  const setManualAchievementProgress = (achievementId: string, completed: boolean) => {
    setProgress((current) => ({
      ...current,
      manualAchievementProgress: {
        ...current.manualAchievementProgress,
        [achievementId]: completed,
      },
    }));
  };

  const resetProgress = () => {
    const resetValue = normalizeUserProgress(defaultUserProgress);
    setStoredProgress(resetValue);
    setLegacyCompletedTaskIds([]);
    setLegacyPlayerLevel(resetValue.playerLevel);
  };

  return {
    progress,
    setProgress,
    resetProgress,
    completedTaskIds: progress.completedTaskIds,
    setCompletedTaskIds,
    playerLevel: progress.playerLevel,
    setPlayerLevel,
    completedAchievementIds: progress.completedAchievementIds,
    setCompletedAchievementIds,
    manualAchievementProgress: progress.manualAchievementProgress,
    setManualAchievementProgress,
  };
}
