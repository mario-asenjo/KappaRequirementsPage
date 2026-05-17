import { Goal, Task } from '../types';
import goalData from '../data/goals.json';
import useProgress from './useProgress';
import { getGoalProgress, getGoalTasks } from '../utils/progress';
import { sortTasksByGameOrder } from '../utils/taskOrder';

const goals = goalData.goals as Goal[];

const preferredGoalIds = ['kappa', 'lightkeeper', 'all-quests'];

export default function useGoals(tasks: Task[]) {
  const { progress, setProgress } = useProgress();
  const visibleGoals = goals.filter((goal) => preferredGoalIds.includes(goal.id) || goal.taskIds.length > 0);
  const activeGoal = visibleGoals.find((goal) => goal.id === progress.selectedGoalId)
    ?? visibleGoals.find((goal) => goal.id === 'kappa')
    ?? visibleGoals[0];
  const activeTasks = activeGoal ? sortTasksByGameOrder(getGoalTasks(activeGoal, tasks)) : [];
  const goalProgress = activeGoal
    ? getGoalProgress(activeGoal, progress, tasks)
    : { completed: 0, total: 0, percent: 0, completedTasks: 0, totalTasks: 0, completedAchievements: 0, totalAchievements: 0 };

  const setActiveGoalId = (selectedGoalId: string) => {
    setProgress((current) => ({ ...current, selectedGoalId }));
  };

  return {
    goals: visibleGoals,
    activeGoal,
    activeTasks,
    goalProgress,
    setActiveGoalId,
  };
}
