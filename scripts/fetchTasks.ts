import { fileURLToPath } from 'url';
import { fetchTarkovDevJsonTaskDataset } from './data-sources/tarkovDevJson';
import { buildTasksPayload, writeValidatedTasksPayload } from './data-normalizers/tasks';

/**
 * Orchestrates PvE task sync from tarkov.dev's JSON API.
 *
 * Fandom/wiki remains the primary semantic source for rules and exceptions, but
 * this script only writes data actually retrieved from json.tarkov.dev.
 */

const GAME_MODE = 'pve';

async function fetchTasks() {
  const dataset = await fetchTarkovDevJsonTaskDataset(GAME_MODE);
  const payload = buildTasksPayload(dataset);
  const filePath = fileURLToPath(new URL('../src/data/tasks.json', import.meta.url));
  await writeValidatedTasksPayload(filePath, payload);
  console.log(`Fetched ${payload.tasks.length} ${GAME_MODE} tasks from json.tarkov.dev and wrote to ${filePath}`);
}

fetchTasks().catch((err) => {
  console.error(err);
  process.exit(1);
});
