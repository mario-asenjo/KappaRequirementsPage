import { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { ProgressImportFile, ProgressImportRawMatch, ProgressImportUnmatchedTemplate, Task } from '../../src/types';

export interface ExtractProgressOptions {
  eftPath: string;
  tasks: Task[];
  now?: Date;
}

type QuestTemplateSuffix = 'description' | 'successMessageText' | 'failMessageText';

interface TemplateMatch {
  taskId: string;
  suffix: QuestTemplateSuffix;
  templateId: string;
  file: string;
  line: number;
}

const PUSH_LOG_PATTERN = /push-notifications_.*\.log$/i;
const TEMPLATE_PATTERN = /"templateId"\s*:\s*"([0-9a-f]{24})\s+(description|successMessageText|failMessageText)"/g;
const PROFILE_PATTERN = /"profileid"\s*:\s*"([^"]+)"/i;

const unique = (values: string[]) => Array.from(new Set(values));

const eventFromSuffix = (suffix: QuestTemplateSuffix): ProgressImportRawMatch['event'] => {
  if (suffix === 'successMessageText') return 'completed';
  if (suffix === 'failMessageText') return 'failed';
  return 'started';
};

async function walkLogs(directory: string): Promise<string[]> {
  let entries: Dirent[];

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

function parsePushLog(text: string, file: string): { matches: TemplateMatch[]; profileIds: string[] } {
  const matches: TemplateMatch[] = [];
  const profileIds: string[] = [];
  let match: RegExpExecArray | null;

  TEMPLATE_PATTERN.lastIndex = 0;
  while ((match = TEMPLATE_PATTERN.exec(text))) {
    matches.push({
      taskId: match[1],
      suffix: match[2] as QuestTemplateSuffix,
      templateId: match[0].match(/"([0-9a-f]{24}\s+[^"]+)"/)?.[1] ?? `${match[1]} ${match[2]}`,
      file,
      line: text.slice(0, match.index).split('\n').length,
    });
  }

  text.split('\n').forEach((line) => {
    const profileMatch = PROFILE_PATTERN.exec(line);
    if (profileMatch) profileIds.push(profileMatch[1]);
  });

  return { matches, profileIds };
}

export async function extractProgressFromLogs(options: ExtractProgressOptions): Promise<ProgressImportFile> {
  const logsRoot = join(options.eftPath, 'Logs');
  const taskIds = new Set(options.tasks.map((task) => task.id));
  const logFiles = await walkLogs(logsRoot);
  const completedTaskIds: string[] = [];
  const startedTaskIds: string[] = [];
  const failedTaskIds: string[] = [];
  const rawMatches: ProgressImportRawMatch[] = [];
  const unmatchedTemplateIds: ProgressImportUnmatchedTemplate[] = [];
  const profileIds: string[] = [];

  for (const logFile of logFiles) {
    const text = await readFile(logFile, 'utf8').catch(() => '');
    const relativeFile = relative(options.eftPath, logFile) || basename(logFile);
    const parsed = parsePushLog(text, relativeFile);
    profileIds.push(...parsed.profileIds);

    parsed.matches.forEach((templateMatch) => {
      const event = eventFromSuffix(templateMatch.suffix);
      const isKnownTask = taskIds.has(templateMatch.taskId);

      if (event === 'completed' && isKnownTask) completedTaskIds.push(templateMatch.taskId);
      if (event === 'started' && isKnownTask) startedTaskIds.push(templateMatch.taskId);
      if (event === 'failed' && isKnownTask) failedTaskIds.push(templateMatch.taskId);
      if (!isKnownTask) {
        unmatchedTemplateIds.push({ templateId: templateMatch.templateId, event });
      }

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

  const warnings = [
    'Local logs may be incomplete. Completed quests before retained logs cannot be detected.',
  ];
  if (logFiles.length === 0) {
    warnings.push('No push-notifications logs were found under EscapeFromTarkov/Logs.');
  }

  return {
    schemaVersion: 1,
    source: 'eft-local-logs',
    generatedAt: (options.now ?? new Date()).toISOString(),
    profile: {
      profileId: unique(profileIds)[0],
    },
    completedTaskIds: unique(completedTaskIds),
    startedTaskIds: unique(startedTaskIds).filter((id) => !completedTaskIds.includes(id)),
    failedTaskIds: unique(failedTaskIds),
    rawMatches,
    unmatchedTemplateIds,
    warnings,
  };
}
