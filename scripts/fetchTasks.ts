import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchTarkovDevJsonTaskDataset, TarkovDevGameMode } from './data-sources/tarkovDevJson';
import { buildTasksPayload, NormalizedTasksPayload, writeValidatedTasksPayload } from './data-normalizers/tasks';
import { buildCatalogIndex, CatalogIndex } from './data-normalizers/catalogIndex';

/**
 * Syncs the task catalog per game mode from json.tarkov.dev.
 *
 *   npm run update:tasks                 # pve + pvp
 *   npm run update:tasks -- --mode pve   # only one mode
 *   npm run update:tasks -- --force      # accept a >10% drop in task count
 *
 * Writes src/data/pve/tasks.json, src/data/pvp/tasks.json, the catalog index
 * (known ids per mode + tombstones) and src/data/tasks.json as a PvE alias for
 * the views that still import it directly.
 */

const MODES: Record<'pve' | 'pvp', TarkovDevGameMode> = { pve: 'pve', pvp: 'regular' };
const dataPath = (relative: string) => fileURLToPath(new URL(`../src/data/${relative}`, import.meta.url));

const argValue = (name: string) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

async function syncMode(mode: 'pve' | 'pvp', force: boolean): Promise<NormalizedTasksPayload> {
  const filePath = dataPath(`${mode}/tasks.json`);
  const previous = await readJson<NormalizedTasksPayload>(filePath);
  const dataset = await fetchTarkovDevJsonTaskDataset(MODES[mode]);
  const payload = buildTasksPayload(dataset);
  await mkdir(dirname(filePath), { recursive: true });
  await writeValidatedTasksPayload(filePath, payload, previous?.tasks.length, force);
  console.log(`${mode}: ${payload.tasks.length} tasks (${payload.metadata.kappaTaskCount} kappaRequired, ${payload.metadata.objectiveMapTaskCount} con mapas por objetivo) -> ${filePath}`);
  return payload;
}

async function main() {
  const requested = argValue('--mode') ?? 'all';
  const force = process.argv.includes('--force');
  const modes = requested === 'all' ? (['pve', 'pvp'] as const) : ([requested] as Array<'pve' | 'pvp'>);
  if (!modes.every((mode) => mode in MODES)) throw new Error(`Modo desconocido: ${requested}. Usa pve, pvp o all.`);

  const legacy = await readJson<{ tasks: Array<{ id: string; title: string }> }>(dataPath('tasks.json'));
  const previousIndex = await readJson<CatalogIndex>(dataPath('catalog-index.json'));
  const payloads: Partial<Record<'pve' | 'pvp', NormalizedTasksPayload>> = {};

  for (const mode of modes) {
    payloads[mode] = await syncMode(mode, force);
  }
  for (const mode of ['pve', 'pvp'] as const) {
    if (!payloads[mode]) payloads[mode] = await readJson<NormalizedTasksPayload>(dataPath(`${mode}/tasks.json`));
  }

  if (payloads.pve) {
    await writeFile(dataPath('tasks.json'), `${JSON.stringify(payloads.pve, null, 2)}\n`, 'utf8');
  }

  const index = buildCatalogIndex({
    pve: payloads.pve,
    pvp: payloads.pvp,
    previousIndex,
    legacyTasks: legacy?.tasks ?? [],
    now: new Date(),
  });
  await writeFile(dataPath('catalog-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  console.log(`catalog-index: ${index.metadata.pveCount} pve, ${index.metadata.pvpCount} pvp, ${index.tombstones.length} tombstones`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
