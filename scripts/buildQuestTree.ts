import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { buildQuestTree } from '../src/utils/questTree';
import { Task } from '../src/types';

/**
 *   npm run build:quests                 # PvE -> src/data/questTree.json
 *   npm run build:quests -- --mode pvp   # PvP -> src/data/pvp/questTree.json
 */
const modeIndex = process.argv.indexOf('--mode');
const mode = modeIndex === -1 ? 'pve' : process.argv[modeIndex + 1];
if (mode !== 'pve' && mode !== 'pvp') throw new Error(`Modo desconocido: ${mode}`);
const dataPath = (relative: string) => fileURLToPath(new URL(`../src/data/${relative}`, import.meta.url));

async function buildQuestTreeFile() {
  const tasks = JSON.parse(await readFile(dataPath(`${mode}/tasks.json`), 'utf8')).tasks as Task[];
  const tree = buildQuestTree(tasks);
  const payload = {
    metadata: {
      source: `src/data/${mode}/tasks.json`,
      gameMode: mode,
      builtAt: new Date().toISOString(),
      traderCount: tree.length,
      taskCount: tasks.length,
    },
    traders: tree,
  };
  const filePath = dataPath(mode === 'pve' ? 'questTree.json' : 'pvp/questTree.json');

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Built quest tree for ${tree.length} traders and wrote to ${filePath}`);
}

buildQuestTreeFile().catch((error) => {
  console.error(error);
  process.exit(1);
});
