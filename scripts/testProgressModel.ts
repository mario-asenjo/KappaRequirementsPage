import assert from 'node:assert/strict';
import { Goal, Task } from '../src/types';
import { getGoalProgress, normalizeUserProgress } from '../src/utils/progress';
import { getCompletionIdsWithPrerequisites, getTaskPrerequisiteChain } from '../src/utils/taskPrerequisites';

const tasks: Task[] = [
  { id: 'a', title: 'A', trader: 'Prapor', objectives: [], countsForKappa: true },
  { id: 'b', title: 'B', trader: 'Prapor', objectives: [], countsForKappa: true },
];
const goal: Goal = {
  id: 'kappa',
  name: 'Kappa',
  type: 'task-set',
  description: 'Test goal',
  taskIds: ['a', 'b'],
  achievementIds: ['achievement-a'],
  source: 'derived',
};
const progress = normalizeUserProgress({
  playerLevel: 120,
  completedTaskIds: ['a', 'a'],
  completedAchievementIds: ['achievement-a'],
});

assert.equal(progress.playerLevel, 79, 'player level should be clamped to max level');
assert.deepEqual(progress.completedTaskIds, ['a'], 'completed task ids should be unique');

const goalProgress = getGoalProgress(goal, progress, tasks);
assert.equal(goalProgress.completed, 2, 'goal should count completed task and achievement');
assert.equal(goalProgress.total, 3, 'goal should include tasks and achievements');
assert.equal(goalProgress.percent, 67, 'goal percent should be rounded');

const crossTraderTasks: Task[] = [
  { id: 'intro', title: 'Intro', trader: 'Prapor', objectives: [], countsForKappa: true },
  { id: 'medical', title: 'Medical', trader: 'Therapist', prerequisites: ['Intro'], objectives: [], countsForKappa: true },
  { id: 'final', title: 'Final', trader: 'Skier', prerequisites: ['Medical'], objectives: [], countsForKappa: true },
  { id: 'unrelated', title: 'Unrelated', trader: 'Skier', objectives: [], countsForKappa: true },
];

assert.deepEqual(
  getTaskPrerequisiteChain(crossTraderTasks[2], crossTraderTasks).map((task) => task.id),
  ['intro', 'medical'],
  'prerequisite chain should follow real cross-trader dependencies in order'
);
assert.deepEqual(
  getCompletionIdsWithPrerequisites(crossTraderTasks[2], crossTraderTasks, []).sort(),
  ['final', 'intro', 'medical'],
  'marking a final task should complete only its real prerequisite chain'
);

console.log('Progress model tests passed');
