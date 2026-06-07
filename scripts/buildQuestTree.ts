import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import taskData from '../src/data/tasks.json';
import { buildQuestTree } from '../src/utils/questTree';
import { Task } from '../src/types';

async function buildQuestTreeFile() {
  const tasks = taskData.tasks as Task[];
  const tree = buildQuestTree(tasks);
  const payload = {
    metadata: {
      source: 'src/data/tasks.json',
      builtAt: new Date().toISOString(),
      traderCount: tree.length,
      taskCount: tasks.length,
    },
    traders: tree,
  };
  const filePath = fileURLToPath(new URL('../src/data/questTree.json', import.meta.url));

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Built quest tree for ${tree.length} traders and wrote to ${filePath}`);
}

buildQuestTreeFile().catch((error) => {
  console.error(error);
  process.exit(1);
});
