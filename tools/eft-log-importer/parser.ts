import { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { GameMode, ProgressImportFile, ProgressImportRawMatch, ProgressImportUnmatchedTemplate, Task } from '../../src/types';

export interface ExtractProgressOptions { eftPath: string; tasks: Task[]; now?: Date; }
type QuestTemplateSuffix = 'description' | 'successMessageText' | 'failMessageText';
interface TemplateMatch { taskId: string; suffix: QuestTemplateSuffix; templateId: string; file: string; line: number; }
const LOG_PATTERN = /(?:push-notifications|output)_.*\.log$/i;
const TEMPLATE_PATTERN = /"templateId"\s*:\s*"([0-9a-f]{24})\s+(description|successMessageText|failMessageText)"/g;
const PROFILE_PATTERN = /"profileid"\s*:\s*"([^"\s]+)"/ig;
const VERSION_PATTERN = /(?:version|gameVersion|clientVersion)[=:" ]+([0-9]+(?:\.[0-9]+){1,3})/i;
const unique = (values: string[]) => Array.from(new Set(values));
const eventFromSuffix = (suffix: QuestTemplateSuffix): ProgressImportRawMatch['event'] => suffix === 'successMessageText' ? 'completed' : suffix === 'failMessageText' ? 'failed' : 'started';

async function walkLogs(directory: string): Promise<string[]> {
  let entries: Dirent[]; try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  return (await Promise.all(entries.map(async (entry) => { const path = join(directory, entry.name); if (entry.isDirectory()) return walkLogs(path); return entry.isFile() && LOG_PATTERN.test(entry.name) ? [path] : []; }))).flat();
}
export function detectGameMode(text: string): GameMode | undefined { if (/gw-pvp-season/i.test(text)) return 'seasonal-pvp'; if (/onlinePveRaidStates|gw-pve/i.test(text)) return 'pve'; if (/gw-pvp/i.test(text)) return 'pvp'; return undefined; }
function parseLog(text: string, file: string) {
  const matches: TemplateMatch[] = []; const profileIds: string[] = []; let match: RegExpExecArray | null; TEMPLATE_PATTERN.lastIndex = 0; PROFILE_PATTERN.lastIndex = 0;
  while ((match = TEMPLATE_PATTERN.exec(text))) matches.push({ taskId: match[1], suffix: match[2] as QuestTemplateSuffix, templateId: `${match[1]} ${match[2]}`, file, line: text.slice(0, match.index).split('\n').length });
  while ((match = PROFILE_PATTERN.exec(text))) profileIds.push(match[1]);
  return { matches, profileIds, mode: detectGameMode(text), version: text.match(VERSION_PATTERN)?.[1] };
}

export async function extractProgressFromLogs(options: ExtractProgressOptions): Promise<ProgressImportFile> {
  const taskIds = new Set(options.tasks.map((task) => task.id)); const files = await walkLogs(join(options.eftPath, 'Logs')); const completed: string[] = []; const started: string[] = []; const failed: string[] = []; const rawMatches: ProgressImportRawMatch[] = []; const unmatchedTemplateIds: ProgressImportUnmatchedTemplate[] = []; const unknownTaskIds: string[] = []; const profileIds: string[] = []; const modes: GameMode[] = []; const versions: string[] = [];
  for (const logFile of files) { const text = await readFile(logFile, 'utf8').catch(() => ''); const parsed = parseLog(text, relative(options.eftPath, logFile) || basename(logFile)); profileIds.push(...parsed.profileIds); if (parsed.mode) modes.push(parsed.mode); if (parsed.version) versions.push(parsed.version); for (const template of parsed.matches) { const event = eventFromSuffix(template.suffix); const known = taskIds.has(template.taskId); if (known && event === 'completed') completed.push(template.taskId); if (known && event === 'started') started.push(template.taskId); if (known && event === 'failed') failed.push(template.taskId); if (!known) { unknownTaskIds.push(template.taskId); unmatchedTemplateIds.push({ templateId: template.templateId, event }); } rawMatches.push({ taskId: template.taskId, event, file: template.file, line: template.line, templateId: template.templateId, confidence: known ? 'high' : 'low' }); } }
  const mode = modes[0] ?? 'pve'; const warnings = ['Local logs may be incomplete. Completed quests before retained logs cannot be detected.']; if (!modes.length) warnings.push('Game mode could not be detected; defaulting to PvE.'); if (!versions.length) warnings.push('Client version could not be detected from retained logs.'); if (!files.length) warnings.push('No supported push-notifications or output logs were found under EscapeFromTarkov/Logs.');
  return { schemaVersion: 2, source: 'eft-local-logs', generatedAt: (options.now ?? new Date()).toISOString(), profile: { profileId: unique(profileIds)[0], mode }, clientVersion: unique(versions)[0] ?? 'unknown', logVersionRange: { oldest: basename(files.sort()[0] ?? ''), newest: basename(files.sort().at(-1) ?? '') }, completedTaskIds: unique(completed), startedTaskIds: unique(started).filter((id) => !completed.includes(id)), failedTaskIds: unique(failed), unknownTaskIds: unique(unknownTaskIds), rawMatches, unmatchedTemplateIds, warnings };
}
