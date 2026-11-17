import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compareVersions, readSessions, resolveProfileModes } from './sessions';
import { getArg, resolveEftPath } from './paths';

/**
 * Read-only, redacted report of what the EFT logs contain (#66).
 *
 *   npm run survey:logs -- --eft "C:\\Games\\EscapeFromTarkov" [--since 1.2.0.0] [--json]
 *
 * Prints sessions, the profile (hashed) and mode each quest event belongs to,
 * duplicated channels and task ids missing from the local catalogs. No raw
 * profile or account ids are printed.
 */

interface CatalogIndexFile {
  tasks?: Record<string, { title: string; modes: string[] }>;
  tombstones?: Array<{ id: string; lastTitle: string }>;
}

async function loadCatalog() {
  const read = async <T>(relative: string) => {
    try {
      return JSON.parse(await readFile(fileURLToPath(new URL(`../../src/data/${relative}`, import.meta.url)), 'utf8')) as T;
    } catch {
      return undefined;
    }
  };
  const index = await read<CatalogIndexFile>('catalog-index.json');
  const tasks = await read<{ tasks: Array<{ id: string; title: string }> }>('tasks.json');
  const titles = new Map<string, string>();
  tasks?.tasks.forEach((task) => titles.set(task.id, task.title));
  Object.entries(index?.tasks ?? {}).forEach(([id, entry]) => titles.set(id, entry.title));
  const tombstones = new Map((index?.tombstones ?? []).map((tombstone) => [tombstone.id, tombstone.lastTitle]));
  return { titles, tombstones, modes: index?.tasks ?? {} };
}

export async function buildSurvey(eftPath: string, sinceVersion: string) {
  const sessions = await readSessions(eftPath, { sinceVersion });
  const profiles = resolveProfileModes(sessions);
  const catalog = await loadCatalog();
  const classify = (id: string) => {
    if (catalog.modes[id]) return `known:${catalog.modes[id].modes.join('+')}`;
    if (catalog.titles.has(id)) return 'known';
    if (catalog.tombstones.has(id)) return 'removed';
    return 'unresolved';
  };

  return {
    sinceVersion,
    sessionCount: sessions.length,
    versions: Array.from(new Set(sessions.map((session) => session.clientVersion))).sort(compareVersions),
    profiles,
    sessions: sessions.map((session) => ({
      folder: session.folder,
      clientVersion: session.clientVersion,
      channels: session.channels,
      profiles: Array.from(new Set(session.profileSwitches.map((entry) => entry.profileHash))),
      gatewayHits: session.gatewayHits,
      events: session.events.map((event) => ({
        time: event.timestamp,
        profile: event.profileHash ?? 'unattributed',
        mode: (event.profileHash && profiles[event.profileHash]?.mode) ?? 'unknown',
        event: event.event,
        taskId: event.taskId,
        title: catalog.titles.get(event.taskId) ?? catalog.tombstones.get(event.taskId),
        classification: classify(event.taskId),
      })),
    })),
  };
}

async function main() {
  const eftPath = await resolveEftPath();
  if (!eftPath) {
    console.error('No se encontro EscapeFromTarkov/Logs. Usa --eft <carpeta> o EFT_PATH.');
    process.exitCode = 1;
    return;
  }
  const report = await buildSurvey(eftPath, getArg(process.argv, '--since') ?? '1.2.0.0');
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`Sesiones >= ${report.sinceVersion}: ${report.sessionCount} (${report.versions.join(', ') || 'ninguna'})`);
  Object.entries(report.profiles).forEach(([hash, resolution]) => {
    console.log(`Perfil ${hash}: ${resolution.mode ?? 'desconocido'} (${resolution.confidence}) ${JSON.stringify(resolution.hits)}`);
  });
  report.sessions.forEach((session) => {
    console.log(`\n${session.folder}  perfiles=${session.profiles.join(',') || '-'}`);
    session.events.forEach((event) => {
      console.log(`  ${event.time.slice(11, 19)} ${event.mode.padEnd(7)} ${event.event.padEnd(9)} ${event.title ?? event.taskId} [${event.classification}]`);
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
