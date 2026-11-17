import { createHash } from 'node:crypto';
import { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Session-level reader for EFT logs, certified against 1.3.0.2 logs (#66,
 * docs/logs-signal-matrix.md). It never returns raw profile or account ids:
 * profiles are identified by a short sha256 hash.
 *
 * Attribution rule: every quest event belongs to the profile selected at that
 * moment (`application` -> `CompleteSelectedProfile ProfileId`), and a
 * profile's mode is the backend gateway it talks to while active
 * (`gw-pve`, `gw-pvp`, `gw-pvp-season`).
 *
 * Not read on purpose: `members[]` blocks (Level, Side, PrestigeLevel,
 * GameVersion) belong to group invites from other accounts, so they are not a
 * reliable snapshot of the user's own profile.
 */

export type LogGameMode = 'pve' | 'pvp' | 'seasonal-pvp';
export type QuestEventKind = 'started' | 'failed' | 'completed';

export interface QuestLogEvent {
  timestamp: string;
  taskId: string;
  event: QuestEventKind;
  profileHash?: string;
}

export interface LogSession {
  folder: string;
  startedAt: string;
  clientVersion: string;
  channels: string[];
  profileSwitches: Array<{ timestamp: string; profileHash: string }>;
  gatewayHits: Record<string, Partial<Record<LogGameMode, number>>>;
  events: QuestLogEvent[];
}

const SESSION_FOLDER = /^log_(\d{4}\.\d{2}\.\d{2}_\d{1,2}-\d{2}-\d{2})_(\d+\.\d+\.\d+\.\d+)(?:\.\d+)?$/;
const LINE_TIMESTAMP = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)\|/;
const PROFILE_SWITCH = /CompleteSelectedProfile ProfileId:([0-9a-f]{24})/;
const GATEWAY = /https?:\/\/gw-(pve|pvp-season|pvp)\.escapefromtarkov\.com/;
const QUEST_TEMPLATE = /"templateId"\s*:\s*"([0-9a-f]{24}) (description|successMessageText|failMessageText)"/;
const MESSAGE_TYPE = /"type"\s*:\s*(\d+)\s*,/;

const GATEWAY_MODE: Record<string, LogGameMode> = { pve: 'pve', pvp: 'pvp', 'pvp-season': 'seasonal-pvp' };
const SUFFIX_EVENT: Record<string, QuestEventKind> = {
  description: 'started',
  failMessageText: 'failed',
  successMessageText: 'completed',
};
const TYPE_EVENT: Record<string, QuestEventKind> = { '10': 'started', '11': 'failed', '12': 'completed' };

export const hashProfileId = (profileId: string) => createHash('sha256').update(profileId).digest('hex').slice(0, 8);

export function compareVersions(a: string, b: string) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** Channel name from a log file name such as `2026.11.14_22-42-32_1.3.0.2.48779 push-notifications_000.log`. */
export const channelOf = (fileName: string) => fileName.split(' ').pop()?.replace(/_\d+\.log$/i, '') ?? fileName;

async function readChannel(folderPath: string, files: string[], channel: string) {
  const matching = files.filter((file) => channelOf(file) === channel).sort();
  const contents = await Promise.all(matching.map((file) => readFile(join(folderPath, file), 'utf8').catch(() => '')));
  return contents.join('\n');
}

function profileAt(switches: LogSession['profileSwitches'], timestamp: string) {
  let active: string | undefined;
  for (const entry of switches) {
    if (entry.timestamp > timestamp) break;
    active = entry.profileHash;
  }
  return active;
}

export async function readSession(logsRoot: string, folder: string): Promise<LogSession | undefined> {
  const match = SESSION_FOLDER.exec(folder);
  if (!match) return undefined;
  const folderPath = join(logsRoot, folder);
  let files: string[];
  try {
    files = (await readdir(folderPath, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return undefined;
  }

  const [application, backend, push] = await Promise.all([
    readChannel(folderPath, files, 'application'),
    readChannel(folderPath, files, 'backend'),
    readChannel(folderPath, files, 'push-notifications'),
  ]);

  const profileSwitches: LogSession['profileSwitches'] = [];
  application.split('\n').forEach((line) => {
    const timestamp = LINE_TIMESTAMP.exec(line)?.[1];
    const profile = PROFILE_SWITCH.exec(line)?.[1];
    if (timestamp && profile) profileSwitches.push({ timestamp, profileHash: hashProfileId(profile) });
  });
  profileSwitches.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const gatewayHits: LogSession['gatewayHits'] = {};
  backend.split('\n').forEach((line) => {
    const timestamp = LINE_TIMESTAMP.exec(line)?.[1];
    const gateway = GATEWAY.exec(line)?.[1];
    if (!timestamp || !gateway) return;
    const key = profileAt(profileSwitches, timestamp) ?? 'before-profile-selection';
    const mode = GATEWAY_MODE[gateway];
    gatewayHits[key] = { ...gatewayHits[key], [mode]: (gatewayHits[key]?.[mode] ?? 0) + 1 };
  });

  const events: QuestLogEvent[] = [];
  let timestamp = '';
  let messageType: string | undefined;
  push.split('\n').forEach((line) => {
    const header = LINE_TIMESTAMP.exec(line);
    if (header) {
      timestamp = header[1];
      messageType = undefined;
    }
    const type = MESSAGE_TYPE.exec(line)?.[1];
    if (type) messageType = type;
    const template = QUEST_TEMPLATE.exec(line);
    if (!template) return;
    const event = (messageType && TYPE_EVENT[messageType]) || SUFFIX_EVENT[template[2]];
    events.push({ timestamp, taskId: template[1], event, profileHash: profileAt(profileSwitches, timestamp) });
  });

  return {
    folder,
    startedAt: match[1],
    clientVersion: match[2],
    channels: Array.from(new Set(files.map(channelOf))).sort(),
    profileSwitches,
    gatewayHits,
    events,
  };
}

export interface ReadSessionsOptions {
  /** Ignore sessions older than this client version (default 1.2.0.0) */
  sinceVersion?: string;
}

export async function readSessions(eftPath: string, options: ReadSessionsOptions = {}): Promise<LogSession[]> {
  const logsRoot = join(eftPath, 'Logs');
  let entries: Dirent[];
  try {
    entries = await readdir(logsRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const since = options.sinceVersion ?? '1.2.0.0';
  const folders = entries
    .filter((entry) => entry.isDirectory() && SESSION_FOLDER.test(entry.name))
    .map((entry) => entry.name)
    .filter((folder) => compareVersions(SESSION_FOLDER.exec(folder)![2], since) >= 0)
    .sort();
  const sessions = await Promise.all(folders.map((folder) => readSession(logsRoot, folder)));
  return sessions.filter((session): session is LogSession => Boolean(session));
}

export interface ProfileModeResolution {
  mode?: LogGameMode;
  confidence: 'high' | 'low' | 'unknown';
  hits: Partial<Record<LogGameMode, number>>;
}

/** Mode of each profile = gateway it used while selected, across all sessions. */
export function resolveProfileModes(sessions: LogSession[]): Record<string, ProfileModeResolution> {
  const totals: Record<string, Partial<Record<LogGameMode, number>>> = {};
  sessions.forEach((session) => {
    Object.entries(session.gatewayHits).forEach(([profileHash, hits]) => {
      if (profileHash === 'before-profile-selection') return;
      Object.entries(hits).forEach(([mode, count]) => {
        totals[profileHash] = { ...totals[profileHash], [mode]: (totals[profileHash]?.[mode as LogGameMode] ?? 0) + (count ?? 0) };
      });
    });
  });

  return Object.fromEntries(Object.entries(totals).map(([profileHash, hits]) => {
    const ranked = Object.entries(hits).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    const [top] = ranked;
    const total = ranked.reduce((sum, [, count]) => sum + (count ?? 0), 0);
    if (!top || total === 0) return [profileHash, { confidence: 'unknown', hits }];
    const share = (top[1] ?? 0) / total;
    const confidence = share >= 0.95 ? 'high' : share >= 0.75 ? 'low' : 'unknown';
    return [profileHash, {
      mode: confidence === 'unknown' ? undefined : (top[0] as LogGameMode),
      confidence,
      hits,
    }];
  }));
}
