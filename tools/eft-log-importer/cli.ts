import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import taskData from '../../src/data/tasks.json';
import { Task } from '../../src/types';
import { extractProgressFromLogs } from './parser';
import { DEFAULT_OUTPUT, getArg, getCandidateEftPaths, resolveEftPath } from './paths';

function printHelp() {
  console.log(`Usage: npm run extract:logs -- --eft "C:\\Games\\EscapeFromTarkov" --out kappa-progress-import.json

If --eft is omitted, the extractor tries common install locations and EFT_PATH/EFT_INSTALL_PATH.

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

  const eftPath = await resolveEftPath();
  if (!eftPath) {
    printHelp();
    console.error('\nNo readable EscapeFromTarkov/Logs folder was found. Tried:');
    getCandidateEftPaths().forEach((candidate) => console.error(`- ${candidate}`));
    console.error('\nPass the folder explicitly with --eft or set EFT_PATH.');
    process.exitCode = 1;
    return;
  }

  const outputPath = resolve(getArg(process.argv, '--out') ?? DEFAULT_OUTPUT);
  const result = await extractProgressFromLogs({
    eftPath,
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
