import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import taskData from '../src/data/tasks.json';
import { Task } from '../src/types';

const outputPath = resolve('public/downloads/eft-log-importer.mjs');
const taskIds = (taskData.tasks as Task[]).map((task) => task.id).sort();

const standalone = `#!/usr/bin/env node
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';

const TASK_IDS = new Set(${JSON.stringify(taskIds)});
const DEFAULT_OUTPUT = 'kappa-progress-import.json';
const PUSH_LOG_PATTERN = /push-notifications_.*\\.log$/i;
const TEMPLATE_PATTERN = /"templateId"\\s*:\\s*"([0-9a-f]{24})\\s+(description|successMessageText|failMessageText)"/g;
const PROFILE_PATTERN = /"profileid"\\s*:\\s*"([^"]+)"/i;

function getArg(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function unique(values) {
  return Array.from(new Set(values));
}

function eventFromSuffix(suffix) {
  if (suffix === 'successMessageText') return 'completed';
  if (suffix === 'failMessageText') return 'failed';
  return 'started';
}

function getCandidateEftPaths(argv = process.argv, env = process.env) {
  const explicitPath = getArg(argv, '--eft') ?? getArg(argv, '--logs') ?? env.EFT_PATH;
  if (explicitPath) return [resolve(explicitPath)];

  const candidates = [
    env.EFT_INSTALL_PATH,
    platform() === 'win32' ? 'C:\\\\Battlestate Games\\\\EFT\\\\EscapeFromTarkov' : undefined,
    platform() === 'win32' ? 'C:\\\\Games\\\\EscapeFromTarkov' : undefined,
    join(homedir(), 'Desktop', 'EFTINSTALLFOLDER', 'EscapeFromTarkov'),
    '/mnt/c/Battlestate Games/EFT/EscapeFromTarkov',
    '/mnt/c/Games/EscapeFromTarkov',
    '/mnt/c/Users/masen/Desktop/EFTINSTALLFOLDER/EscapeFromTarkov',
  ];

  return unique(candidates.filter(Boolean).map((value) => resolve(value)));
}

async function hasReadableLogs(eftPath) {
  try {
    await access(join(eftPath, 'Logs'));
    return true;
  } catch {
    return false;
  }
}

async function resolveEftPath(argv = process.argv, env = process.env) {
  const candidates = getCandidateEftPaths(argv, env);
  for (const candidate of candidates) {
    if (await hasReadableLogs(candidate)) return candidate;
  }
  return undefined;
}

async function walkLogs(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkLogs(path);
    if (entry.isFile() && PUSH_LOG_PATTERN.test(entry.name)) return [path];
    return [];
  }));

  return files.flat();
}

function parsePushLog(text, file) {
  const matches = [];
  const profileIds = [];
  let match;
  TEMPLATE_PATTERN.lastIndex = 0;

  while ((match = TEMPLATE_PATTERN.exec(text))) {
    matches.push({
      taskId: match[1],
      suffix: match[2],
      templateId: match[0].match(/"([0-9a-f]{24}\\s+[^"]+)"/)?.[1] ?? match[1] + ' ' + match[2],
      file,
      line: text.slice(0, match.index).split('\\n').length,
    });
  }

  text.split('\\n').forEach((line) => {
    const profileMatch = PROFILE_PATTERN.exec(line);
    if (profileMatch) profileIds.push(profileMatch[1]);
  });

  return { matches, profileIds };
}

async function extractProgressFromLogs(eftPath) {
  const logsRoot = join(eftPath, 'Logs');
  const logFiles = await walkLogs(logsRoot);
  const completedTaskIds = [];
  const startedTaskIds = [];
  const failedTaskIds = [];
  const rawMatches = [];
  const unmatchedTemplateIds = [];
  const profileIds = [];

  for (const logFile of logFiles) {
    const text = await readFile(logFile, 'utf8').catch(() => '');
    const relativeFile = relative(eftPath, logFile) || basename(logFile);
    const parsed = parsePushLog(text, relativeFile);
    profileIds.push(...parsed.profileIds);

    parsed.matches.forEach((templateMatch) => {
      const event = eventFromSuffix(templateMatch.suffix);
      const isKnownTask = TASK_IDS.has(templateMatch.taskId);

      if (event === 'completed' && isKnownTask) completedTaskIds.push(templateMatch.taskId);
      if (event === 'started' && isKnownTask) startedTaskIds.push(templateMatch.taskId);
      if (event === 'failed' && isKnownTask) failedTaskIds.push(templateMatch.taskId);
      if (!isKnownTask) unmatchedTemplateIds.push({ templateId: templateMatch.templateId, event });

      rawMatches.push({
        taskId: templateMatch.taskId,
        event,
        file: templateMatch.file,
        line: templateMatch.line,
        templateId: templateMatch.templateId,
        confidence: isKnownTask ? 'high' : 'low',
      });
    });
  }

  const warnings = ['Local logs may be incomplete. Completed quests before retained logs cannot be detected.'];
  if (logFiles.length === 0) warnings.push('No push-notifications logs were found under EscapeFromTarkov/Logs.');

  return {
    schemaVersion: 1,
    source: 'eft-local-logs',
    generatedAt: new Date().toISOString(),
    profile: { profileId: unique(profileIds)[0] },
    completedTaskIds: unique(completedTaskIds),
    startedTaskIds: unique(startedTaskIds).filter((id) => !completedTaskIds.includes(id)),
    failedTaskIds: unique(failedTaskIds),
    rawMatches,
    unmatchedTemplateIds,
    warnings,
  };
}

function printHelp() {
  console.log(\`Usage: node eft-log-importer.mjs --eft "C:\\\\Games\\\\EscapeFromTarkov" --out kappa-progress-import.json

If --eft is omitted, the extractor tries common install locations and EFT_PATH/EFT_INSTALL_PATH.

Options:
  --eft <path>   Path to the EscapeFromTarkov installation folder.
  --out <path>   Output JSON path. Defaults to ./kappa-progress-import.json.
  --help         Show this help.

The extractor is read-only: it scans EscapeFromTarkov/Logs and writes only the output JSON.\`);
}

async function main() {
  if (process.argv.includes('--help')) {
    printHelp();
    return;
  }

  const eftPath = await resolveEftPath();
  if (!eftPath) {
    printHelp();
    console.error('\\nNo readable EscapeFromTarkov/Logs folder was found. Tried:');
    getCandidateEftPaths().forEach((candidate) => console.error('- ' + candidate));
    console.error('\\nPass the folder explicitly with --eft or set EFT_PATH.');
    process.exitCode = 1;
    return;
  }

  const outputPath = resolve(getArg(process.argv, '--out') ?? DEFAULT_OUTPUT);
  const result = await extractProgressFromLogs(eftPath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\\n', 'utf8');

  console.log('Wrote ' + outputPath);
  console.log('Completed quests: ' + result.completedTaskIds.length);
  console.log('Started quests: ' + (result.startedTaskIds?.length ?? 0));
  console.log('Failed/alternative quests: ' + (result.failedTaskIds?.length ?? 0));
  console.log('Unmatched template IDs: ' + (result.unmatchedTemplateIds?.length ?? 0));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
`;

async function main() {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, standalone, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
