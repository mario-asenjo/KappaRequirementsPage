import type {
  ProgressImportFileV2,
  ProgressImportProfile,
  ProgressImportUnknownTask,
} from '../../src/types';
import { compareVersions, LogGameMode, QuestEventKind, readSessions, resolveProfileModes } from './sessions';

export const EXTRACTOR_VERSION = '2.0.0';
export const DEFAULT_SINCE_VERSION = '1.2.0.0';

/** Subset of src/data/catalog-index.json the extractor needs. */
export interface ExtractorCatalog {
  metadata?: { pveSyncedAt?: string; pvpSyncedAt?: string };
  tasks: Record<string, { title?: string; modes: Array<'pve' | 'pvp'> }>;
  tombstones?: Array<{ id: string }>;
}

export interface ExtractV2Options {
  eftPath: string;
  catalog: ExtractorCatalog;
  sinceVersion?: string;
  now?: Date;
}

const catalogMode = (mode?: LogGameMode): 'pve' | 'pvp' | undefined => {
  if (mode === 'pve') return 'pve';
  if (mode === 'pvp' || mode === 'seasonal-pvp') return 'pvp';
  return undefined;
};

/**
 * Builds one progress block per detected profile. Each quest event belongs to
 * the profile selected when it happened; the final state of a task is its last
 * event (so restarts and failures resolve correctly).
 */
export async function extractProfilesFromLogs({
  eftPath,
  catalog,
  sinceVersion = DEFAULT_SINCE_VERSION,
  now = new Date(),
}: ExtractV2Options): Promise<ProgressImportFileV2> {
  const sessions = await readSessions(eftPath, { sinceVersion });
  const modes = resolveProfileModes(sessions);
  const tombstones = new Set((catalog.tombstones ?? []).map((tombstone) => tombstone.id));

  interface ProfileAccumulator {
    sessions: Set<string>;
    versions: string[];
    firstSeen?: string;
    lastSeen?: string;
    lastEvent: Map<string, { event: QuestEventKind; timestamp: string }>;
  }
  const accumulators = new Map<string, ProfileAccumulator>();
  let unattributedEventCount = 0;

  sessions.forEach((session) => {
    session.events.forEach((event) => {
      if (!event.profileHash) {
        unattributedEventCount += 1;
        return;
      }
      const accumulator = accumulators.get(event.profileHash) ?? {
        sessions: new Set<string>(),
        versions: [],
        lastEvent: new Map(),
      };
      accumulator.sessions.add(session.folder);
      accumulator.versions.push(session.clientVersion);
      if (!accumulator.firstSeen || event.timestamp < accumulator.firstSeen) accumulator.firstSeen = event.timestamp;
      if (!accumulator.lastSeen || event.timestamp > accumulator.lastSeen) accumulator.lastSeen = event.timestamp;
      const previous = accumulator.lastEvent.get(event.taskId);
      if (!previous || event.timestamp >= previous.timestamp) {
        accumulator.lastEvent.set(event.taskId, { event: event.event, timestamp: event.timestamp });
      }
      accumulators.set(event.profileHash, accumulator);
    });
  });

  const profiles: ProgressImportProfile[] = Array.from(accumulators.entries()).map(([profileHash, accumulator]) => {
    const resolution = modes[profileHash];
    const mode = resolution?.mode ?? 'unknown';
    const wanted = catalogMode(resolution?.mode);
    const completed: string[] = [];
    const started: string[] = [];
    const failed: string[] = [];
    const unknownTasks: ProgressImportUnknownTask[] = [];

    Array.from(accumulator.lastEvent.entries())
      .sort(([, a], [, b]) => a.timestamp.localeCompare(b.timestamp))
      .forEach(([taskId, { event }]) => {
        const entry = catalog.tasks[taskId];
        const known = entry && (!wanted || entry.modes.includes(wanted));
        if (!known) {
          unknownTasks.push({
            id: taskId,
            event,
            classification: entry ? 'other-mode' : tombstones.has(taskId) ? 'removed' : 'unresolved',
          });
          return;
        }
        if (event === 'completed') completed.push(taskId);
        else if (event === 'failed') failed.push(taskId);
        else started.push(taskId);
      });

    const versions = Array.from(new Set(accumulator.versions)).sort(compareVersions);
    return {
      profileKey: `${mode}:${profileHash}`,
      mode,
      modeConfidence: resolution?.confidence ?? 'unknown',
      versionRange: { oldest: versions[0], newest: versions[versions.length - 1] },
      sessionCount: accumulator.sessions.size,
      firstSeen: accumulator.firstSeen,
      lastSeen: accumulator.lastSeen,
      completedTaskIds: completed,
      startedTaskIds: started,
      failedTaskIds: failed,
      unknownTasks,
    };
  });

  const modeOrder: Record<string, number> = { pve: 0, pvp: 1, 'seasonal-pvp': 2, unknown: 3 };
  profiles.sort((a, b) => (modeOrder[a.mode] ?? 9) - (modeOrder[b.mode] ?? 9) || (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));

  const warnings: string[] = [];
  if (sessions.length === 0) warnings.push(`No hay sesiones de logs con version >= ${sinceVersion}.`);
  if (unattributedEventCount > 0) {
    warnings.push(`${unattributedEventCount} eventos de quest ocurrieron antes de seleccionar perfil y no se han asignado.`);
  }
  if (profiles.some((profile) => profile.mode === 'unknown')) {
    warnings.push('Hay perfiles cuyo modo no se pudo determinar con seguridad; revisa antes de aplicarlos.');
  }

  return {
    schemaVersion: 2,
    source: 'eft-local-logs',
    generatedAt: now.toISOString(),
    extractorVersion: EXTRACTOR_VERSION,
    since: sinceVersion,
    catalog: { pveSyncedAt: catalog.metadata?.pveSyncedAt, pvpSyncedAt: catalog.metadata?.pvpSyncedAt },
    sessionCount: sessions.length,
    profiles,
    warnings,
  };
}

const MODE_LABEL: Record<string, string> = { pve: 'PvE', pvp: 'PvP', 'seasonal-pvp': 'PvP Season', unknown: 'modo desconocido' };

/** Human summary printed by the CLI and the downloadable extractor. No raw ids. */
export function formatExtractionSummary(result: ProgressImportFileV2, outputPath: string): string[] {
  return [
    `Escrito ${outputPath}`,
    `Sesiones leidas (>= ${result.since}): ${result.sessionCount}`,
    ...result.profiles.map((profile) =>
      `- Perfil ${MODE_LABEL[profile.mode] ?? profile.mode} (${profile.profileKey.split(':')[1]}): ${profile.completedTaskIds.length} completadas, ${profile.startedTaskIds.length} en curso, ${profile.failedTaskIds.length} fallidas, ${profile.unknownTasks.length} sin resolver`),
    ...result.warnings.map((warning) => `Aviso: ${warning}`),
    'Sube el JSON en la pagina Importar y elige el perfil que quieres aplicar.',
  ];
}
