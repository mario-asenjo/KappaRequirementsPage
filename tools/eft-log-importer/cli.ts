import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import taskData from '../../src/data/tasks.json';
import { Task } from '../../src/types';
import { extractProgressFromLogs } from './parser';

const DEFAULT_OUTPUT = 'kappa-progress-import.json';

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function printHelp() {
  console.log(`Usage: npm run extract:logs -- --eft "C:\\Games\\EscapeFromTarkov" --out kappa-progress-import.json

Options:
  --eft <path>   Path to the EscapeFromTarkov installation folder.
  --out <path>   Output JSON path. Defaults to ./kappa-progress-import.json.
  --help         Show this help.

The extractor is read-only: it scans EscapeFromTarkov/Logs and writes only the output JSON.`);
}

async function main() {
  if (process.argv.includes('--help')) {
    printHelp();
    return;
  }

  const eftPath = getArg('--eft') ?? getArg('--logs');
  if (!eftPath) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const outputPath = resolve(getArg('--out') ?? DEFAULT_OUTPUT);
  const result = await extractProgressFromLogs({
    eftPath: resolve(eftPath),
    tasks: taskData.tasks as Task[],
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${outputPath}`);
  console.log(`Completed quests: ${result.completedTaskIds.length}`);
  console.log(`Started quests: ${result.startedTaskIds?.length ?? 0}`);
  console.log(`Failed/alternative quests: ${result.failedTaskIds?.length ?? 0}`);
  console.log(`Unmatched template IDs: ${result.unmatchedTemplateIds?.length ?? 0}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
