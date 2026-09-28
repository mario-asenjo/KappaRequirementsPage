import { mkdtemp, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildTasksPayload, normalizeTasks, validateTasksPayload, writeValidatedTasksPayload } from './data-normalizers/tasks';
import { TarkovDevJsonTaskDataset } from './data-sources/tarkovDevJson';

const source = {
  provider: 'json.tarkov.dev',
  endpoint: 'https://json.tarkov.dev/pve/tasks',
  retrievedAt: '2026-09-28T00:00:00.000Z',
  gameMode: 'pve' as const,
};

const fixture = (): TarkovDevJsonTaskDataset => ({
  gameMode: 'pve',
  retrievedAt: source.retrievedAt,
  sources: [source],
  taskTranslations: {
    'task-a name': 'First Task',
    'task-b name': 'Second Task',
    'objective-a': 'Visit both places',
    'objective-b': 'Survive on Customs',
    'achievement-a': 'Done Thing',
  },
  traderTranslations: {
    'trader-a name': 'Therapist',
  },
  mapTranslations: {
    'map-a name': 'Ground Zero',
    'map-b name': 'Customs',
  },
  traders: {
    'trader-a': { id: 'trader-a', name: 'trader-a name' },
  },
  maps: {
    'map-a': { id: 'map-a', name: 'map-a name' },
    'map-b': { id: 'map-b', name: 'map-b name' },
  },
  tasks: {
    'task-a': {
      id: 'task-a',
      name: 'task-a name',
      normalizedName: 'first-task',
      trader: 'trader-a',
      map: 'map-a',
      minPlayerLevel: 2,
      traderRequirements: [{ trader: 'trader-a', level: 3 }],
      objectives: [{ id: 'objective-a', description: 'objective-a', maps: ['map-a'], zones: [{ map: 'map-b' }] }],
      finishRewards: { achievement: [{ id: 'achievement-a', name: 'achievement-a' }] },
      kappaRequired: true,
      lightkeeperRequired: false,
    },
    'task-b': {
      id: 'task-b',
      name: 'task-b name',
      trader: 'trader-a',
      map: 'map-b',
      taskRequirements: [{ task: 'task-a' }],
      objectives: [{ id: 'objective-b', description: 'objective-b', maps: ['map-b'] }],
      kappaRequired: false,
      lightkeeperRequired: true,
    },
  },
});

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

async function main() {
  const payload = buildTasksPayload(fixture());
  const first = payload.tasks.find((task) => task.id === 'task-a');
  const second = payload.tasks.find((task) => task.id === 'task-b');

  assert(first?.title === 'First Task', 'translates task title');
  assert(first?.objectives[0] === 'Visit both places', 'translates objective description');
  assert(first?.objectiveMaps.includes('Ground Zero'), 'maps direct objective maps');
  assert(first?.objectiveMaps.includes('Customs'), 'maps zones -> maps');
  assert(second?.prerequisites.includes('First Task'), 'resolves prerequisites by id');
  assert(first?.requiredTraderLoyaltyLevel === 3, 'keeps required trader LL separate from unlock pool LL');
  assert(!('traderLoyaltyLevel' in (first ?? {})), 'does not invent unlock pool traderLoyaltyLevel');
  assert(first?.provenance?.[0]?.provider === 'json.tarkov.dev', 'records structured provenance');
  assert(!JSON.stringify(first).includes('escapefromtarkov.fandom.com'), 'does not attribute Fandom when not read');
  assert(payload.metadata.primarySemanticSource === 'https://escapefromtarkov.fandom.com', 'documents primary semantic source at metadata level');

  assert(validateTasksPayload(payload).ok, 'valid fixture passes validation');
  assert(!validateTasksPayload({ ...payload, tasks: [] }).ok, 'empty dataset fails validation');
  assert(!validateTasksPayload({ ...payload, tasks: [payload.tasks[0], payload.tasks[0]] }).ok, 'duplicate ids fail validation');
  assert(!validateTasksPayload({ ...payload, tasks: [{ ...payload.tasks[0], title: '' }] }).ok, 'empty titles fail validation');

  const dir = await mkdtemp(join(tmpdir(), 'kappa-data-pipeline-'));
  const file = join(dir, 'tasks.json');
  await writeFile(file, 'keep me', 'utf8');
  let failed = false;
  try {
    await writeValidatedTasksPayload(file, { ...payload, tasks: [] });
  } catch {
    failed = true;
  }
  assert(failed, 'invalid payload throws before write');
  assert(await readFile(file, 'utf8') === 'keep me', 'invalid payload does not overwrite last valid snapshot');

  await writeValidatedTasksPayload(file, payload);
  assert(JSON.parse(await readFile(file, 'utf8')).tasks.length === 2, 'valid payload writes snapshot');

  console.log('Data pipeline tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
