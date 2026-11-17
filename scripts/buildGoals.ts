import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import achievementData from '../src/data/achievements.json';
import { Achievement, Goal, Task } from '../src/types';

/**
 * Builds goals from a task catalog.
 *   npm run build:goals                  # PvE -> src/data/goals.json
 *   npm run build:goals -- --mode pvp    # PvP -> src/data/pvp/goals.json
 */
const modeIndex = process.argv.indexOf('--mode');
const mode = modeIndex === -1 ? 'pve' : process.argv[modeIndex + 1];
if (mode !== 'pve' && mode !== 'pvp') throw new Error(`Modo desconocido: ${mode}`);
const dataPath = (relative: string) => fileURLToPath(new URL(`../src/data/${relative}`, import.meta.url));
const achievements = achievementData.achievements as Achievement[];

const createTaskGoal = (goal: Omit<Goal, 'type' | 'source'>): Goal => ({
  ...goal,
  type: 'task-set',
  source: 'derived',
});

async function buildGoals() {
  const tasks = JSON.parse(await readFile(dataPath(`${mode}/tasks.json`), 'utf8')).tasks as Task[];
  const goals: Goal[] = [
    createTaskGoal({
      id: 'kappa',
      name: 'Kappa',
      description: 'Cadena de misiones que exige Collector en 1.3 (kappaRequired). Las otras puertas (nivel 42, LL4 con 7 traders, karma Scav +3 y 44 items FiR) se modelan en #77.',
      taskIds: tasks.filter((task) => task.kappaRequired ?? task.countsForKappa).map((task) => task.id),
      achievementIds: achievements.filter((achievement) => achievement.name === 'The Kappa Path').map((achievement) => achievement.id),
    }),
    createTaskGoal({
      id: 'lightkeeper',
      name: 'Lightkeeper',
      description: 'Misiones del trader Lightkeeper. Provisional: desde 1.1.5 la fuente ya no marca lightkeeperRequired; el acceso real se modela en #77.',
      taskIds: (tasks.some((task) => task.lightkeeperRequired)
        ? tasks.filter((task) => task.lightkeeperRequired)
        : tasks.filter((task) => task.trader === 'Lightkeeper')).map((task) => task.id),
      achievementIds: [],
    }),
    createTaskGoal({
      id: 'all-quests',
      name: 'Todas las misiones',
      description: `Todas las misiones ${mode === 'pve' ? 'PvE' : 'PvP'} de la fuente de datos actual.`,
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

  const filePath = dataPath(mode === 'pve' ? 'goals.json' : 'pvp/goals.json');
  const payload = {
    metadata: {
      source: `src/data/${mode}/tasks.json + src/data/achievements.json`,
      gameMode: mode,
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
