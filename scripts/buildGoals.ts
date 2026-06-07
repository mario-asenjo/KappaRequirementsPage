import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import taskData from '../src/data/tasks.json';
import achievementData from '../src/data/achievements.json';
import { Achievement, Goal, Task } from '../src/types';

const tasks = taskData.tasks as Task[];
const achievements = achievementData.achievements as Achievement[];

const createTaskGoal = (goal: Omit<Goal, 'type' | 'source'>): Goal => ({
  ...goal,
  type: 'task-set',
  source: 'derived',
});

async function buildGoals() {
  const goals: Goal[] = [
    createTaskGoal({
      id: 'kappa',
      name: 'Kappa',
      description: 'Misiones necesarias para desbloquear el contenedor Kappa.',
      taskIds: tasks.filter((task) => task.countsForKappa).map((task) => task.id),
      achievementIds: achievements.filter((achievement) => achievement.name === 'The Kappa Path').map((achievement) => achievement.id),
    }),
    createTaskGoal({
      id: 'lightkeeper',
      name: 'Lightkeeper',
      description: 'Misiones marcadas por tarkov.dev como requeridas para la progresion de Lightkeeper.',
      taskIds: tasks.filter((task) => task.lightkeeperRequired).map((task) => task.id),
      achievementIds: [],
    }),
    createTaskGoal({
      id: 'all-quests',
      name: 'Todas las misiones',
      description: 'Todas las misiones disponibles en la fuente de datos actual.',
      taskIds: tasks.map((task) => task.id),
      achievementIds: [],
    }),
  ];

  achievements.forEach((achievement) => {
    const relatedTaskIds = tasks
      .filter((task) => task.achievementRewards?.some((reward) => reward.id === achievement.id))
      .map((task) => task.id);

    goals.push({
      id: `achievement-${achievement.id}`,
      name: achievement.name,
      type: relatedTaskIds.length > 0 ? 'achievement' : 'manual-achievement',
      description: achievement.description ?? 'Achievement sin descripcion en la fuente de datos.',
      taskIds: relatedTaskIds,
      achievementIds: [achievement.id],
      source: achievement.wiki ? 'wiki' : 'tarkov.dev',
    });
  });

  const filePath = fileURLToPath(new URL('../src/data/goals.json', import.meta.url));
  const payload = {
    metadata: {
      source: 'src/data/tasks.json + src/data/achievements.json',
      builtAt: new Date().toISOString(),
      goalCount: goals.length,
      taskGoalCount: goals.filter((goal) => goal.taskIds.length > 0).length,
      manualAchievementGoalCount: goals.filter((goal) => goal.type === 'manual-achievement').length,
    },
    goals,
  };

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Built ${goals.length} goals and wrote to ${filePath}`);
}

buildGoals().catch((error) => {
  console.error(error);
  process.exit(1);
});
