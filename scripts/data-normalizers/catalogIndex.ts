import type { NormalizedTasksPayload } from './tasks';

export interface CatalogTombstone {
  id: string;
  lastTitle: string;
  /** Mode where the id was last seen, or `legacy` for the pre-JSON GraphQL snapshot */
  lastMode: 'pve' | 'pvp' | 'legacy';
  removedDetectedAt: string;
}

export interface CatalogIndex {
  metadata: {
    builtAt: string;
    pveSyncedAt?: string;
    pvpSyncedAt?: string;
    pveCount: number;
    pvpCount: number;
    sharedCount: number;
  };
  /** id -> modes where the task currently exists */
  tasks: Record<string, { title: string; modes: Array<'pve' | 'pvp'> }>;
  /** Ids that existed before and are gone from every current catalog */
  tombstones: CatalogTombstone[];
}

interface BuildCatalogIndexInput {
  pve?: NormalizedTasksPayload;
  pvp?: NormalizedTasksPayload;
  previousIndex?: CatalogIndex;
  legacyTasks: Array<{ id: string; title: string }>;
  now: Date;
}

export function buildCatalogIndex({ pve, pvp, previousIndex, legacyTasks, now }: BuildCatalogIndexInput): CatalogIndex {
  const tasks: CatalogIndex['tasks'] = {};
  (['pve', 'pvp'] as const).forEach((mode) => {
    const payload = mode === 'pve' ? pve : pvp;
    payload?.tasks.forEach((task) => {
      tasks[task.id] = { title: tasks[task.id]?.title ?? task.title, modes: [...(tasks[task.id]?.modes ?? []), mode] };
    });
  });

  const tombstones = new Map<string, CatalogTombstone>();
  (previousIndex?.tombstones ?? []).forEach((tombstone) => {
    if (!tasks[tombstone.id]) tombstones.set(tombstone.id, tombstone);
  });

  const detectedAt = now.toISOString();
  Object.entries(previousIndex?.tasks ?? {}).forEach(([id, entry]) => {
    if (!tasks[id] && !tombstones.has(id)) {
      tombstones.set(id, { id, lastTitle: entry.title, lastMode: entry.modes[0] ?? 'pve', removedDetectedAt: detectedAt });
    }
  });
  legacyTasks.forEach((task) => {
    if (!tasks[task.id] && !tombstones.has(task.id)) {
      tombstones.set(task.id, { id: task.id, lastTitle: task.title, lastMode: 'legacy', removedDetectedAt: detectedAt });
    }
  });

  const values = Object.values(tasks);
  return {
    metadata: {
      builtAt: detectedAt,
      pveSyncedAt: pve?.metadata.syncedAt,
      pvpSyncedAt: pvp?.metadata.syncedAt,
      pveCount: values.filter((entry) => entry.modes.includes('pve')).length,
      pvpCount: values.filter((entry) => entry.modes.includes('pvp')).length,
      sharedCount: values.filter((entry) => entry.modes.length === 2).length,
    },
    tasks: Object.fromEntries(Object.entries(tasks).sort(([a], [b]) => a.localeCompare(b))),
    tombstones: Array.from(tombstones.values()).sort((a, b) => a.lastTitle.localeCompare(b.lastTitle) || a.id.localeCompare(b.id)),
  };
}
