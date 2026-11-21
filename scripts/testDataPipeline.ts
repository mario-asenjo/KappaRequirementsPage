import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildTasksPayload, validateTasksPayload, writeValidatedTasksPayload } from './data-normalizers/tasks';
import { buildCatalogIndex } from './data-normalizers/catalogIndex';
import { TarkovDevJsonTaskDataset } from './data-sources/tarkovDevJson';

const retrievedAt = '2026-11-17T00:00:00.000Z';

const fixture = (gameMode: 'pve' | 'regular' = 'pve'): TarkovDevJsonTaskDataset => ({
  gameMode,
  retrievedAt,
  sources: [
    { provider: 'json.tarkov.dev', endpoint: `https://json.tarkov.dev/${gameMode}/tasks`, retrievedAt, gameMode },
    { provider: 'json.tarkov.dev', endpoint: `https://json.tarkov.dev/${gameMode}/tasks_en`, retrievedAt, gameMode },
  ],
  taskTranslations: {
    'task-a name': 'First Task',
    'task-b name': 'Second Task [PVE ZONE]',
    'task-c name': 'Faction Task',
    'obj-a': 'Visit both places',
    'obj-b': 'Hand over the found in raid item: Antique axe',
    'fail-a': 'Do not fail',
  },
  traderTranslations: { 'trader-a name': 'Therapist', 'trader-f name': 'Fence' },
  mapTranslations: { 'map-a name': 'Ground Zero', 'map-b name': 'Customs' },
  itemTranslations: { 'item-axe Name': 'Antique axe', 'item-key Name': 'Dorm overseer key', 'item-gun Name': 'AKM' },
  traders: {
    'trader-a': { id: 'trader-a', name: 'trader-a name' },
    'trader-f': { id: 'trader-f', name: 'trader-f name' },
  },
  maps: {
    'map-a': { id: 'map-a', name: 'map-a name' },
    'map-b': { id: 'map-b', name: 'map-b name' },
  },
  tasks: {
    'task-a': {
      id: 'task-a',
      name: 'task-a name',
      trader: 'trader-a',
      map: null,
      minPlayerLevel: 2,
      experience: 1000,
      kappaRequired: true,
      traderRequirements: [
        { trader: 'trader-a', requirementType: 'level', compareMethod: '>=', value: 3 },
        { trader: 'trader-f', requirementType: 'reputation', compareMethod: '>=', value: 3 },
      ],
      otherRequirements: [{ type: 'globalVariable', variableId: 'pool-1', compareMethod: '>=', value: 2 }],
      objectives: [{ id: 'obj-a', description: 'obj-a', type: 'visit', maps: ['map-a'], zones: [{ map: 'map-b' }] }],
      failConditions: [{ id: 'fail-a', description: 'fail-a', type: 'taskStatus', task: 'task-b', status: ['complete'] }],
      neededKeys: [{ map: 'map-b', keys: ['item-key'] }],
      finishRewards: { offerUnlock: [{ id: 'offer', trader: 'trader-a', level: 2, item: 'item-gun' }], achievement: [] },
      availableDelaySecondsMin: 36000,
      availableDelaySecondsMax: 36000,
    },
    'task-b': {
      id: 'task-b',
      name: 'task-b name',
      trader: 'trader-a',
      map: 'map-b',
      taskRequirements: [{ task: 'task-a', status: ['complete'] }],
      objectives: [{ id: 'obj-b', description: 'obj-b', type: 'giveItem', count: 1, items: ['item-axe'], foundInRaid: true }],
    },
    'task-c': {
      id: 'task-c',
      name: 'task-c name',
      trader: 'trader-a',
      factionName: 'USEC',
      restartable: true,
      objectives: [],
    },
  },
});

const payload = buildTasksPayload(fixture());
const byId = Object.fromEntries(payload.tasks.map((task) => [task.id, task]));

assert.equal(payload.metadata.gameMode, 'pve');
assert.equal(payload.metadata.taskCount, 3);
assert.equal(payload.metadata.kappaTaskCount, 1);
assert.equal(payload.metadata.modeExclusiveCount, 1);
assert.equal(payload.metadata.factionExclusiveCount, 1);

const a = byId['task-a'];
assert.equal(a.title, 'First Task');
assert.equal(a.gameMode, 'pve');
assert.deepEqual(a.objectiveMaps, ['Ground Zero', 'Customs']);
assert.equal(a.location, 'Ground Zero', 'generic task falls back to its first objective map');
assert.deepEqual(a.traderLevelRequirements, [{ trader: 'Therapist', level: 3 }]);
assert.equal(a.requiredTraderLoyaltyLevel, 3, 'reads `value` (not `level`) from traderRequirements');
assert.deepEqual(a.traderReputationRequirements, [{ trader: 'Fence', compareMethod: '>=', value: 3 }]);
assert.deepEqual(a.unlockPools, [{ variableId: 'pool-1', minValue: 2 }]);
assert.deepEqual(a.neededKeys, [{ map: 'Customs', keys: [{ id: 'item-key', name: 'Dorm overseer key' }] }]);
assert.equal(a.failConditions?.[0].description, 'Do not fail');
assert.deepEqual(a.availableDelaySeconds, { min: 36000, max: 36000 });
assert.deepEqual(a.rewardUnlocks, [{ kind: 'offer', label: 'AKM (Therapist LL2)' }]);
assert.equal(a.kappaRequired, true);
assert.equal(a.countsForKappa, true);

const b = byId['task-b'];
assert.equal(b.modeExclusive, true);
assert.deepEqual(b.prerequisites, ['First Task']);
assert.deepEqual(b.prerequisiteIds, [{ id: 'task-a', status: ['complete'] }]);
assert.deepEqual(b.objectiveDetails?.[0], {
  id: 'obj-b', type: 'giveItem', description: 'Hand over the found in raid item: Antique axe',
  maps: [], optional: false, count: 1, itemIds: ['item-axe'], foundInRaid: true,
});
assert.equal(b.unlockPools, undefined, 'empty optional arrays are dropped');

assert.equal(byId['task-c'].faction, 'USEC');
assert.equal(byId['task-c'].restartable, true);
assert.equal(payload.items['item-axe'], 'Antique axe');

assert.ok(validateTasksPayload(payload).ok, validateTasksPayload(payload).errors.join('\n'));

const pvpPayload = buildTasksPayload(fixture('regular'));
const pvpValidation = validateTasksPayload(pvpPayload);
assert.equal(pvpPayload.metadata.gameMode, 'pvp');
assert.ok(!pvpValidation.ok && pvpValidation.errors.some((error) => error.includes('es de otro modo')), 'a [PVE ZONE] task in the PvP dataset is rejected');

const dropped = validateTasksPayload(payload, 10);
assert.ok(!dropped.ok && dropped.errors.some((error) => error.includes('>10%')), 'large drops are rejected');
assert.ok(validateTasksPayload(payload, 10, true).ok, '--force accepts large drops');

const broken = { ...payload, tasks: payload.tasks.map((task) => (task.id === 'task-b' ? { ...task, prerequisiteIds: [{ id: 'ghost', status: ['complete'] }] } : task)) };
assert.ok(validateTasksPayload(broken).errors.some((error) => error.includes('ghost')), 'unresolved prerequisites are rejected');

const index = buildCatalogIndex({
  pve: payload,
  pvp: { ...payload, metadata: { ...payload.metadata, gameMode: 'pvp' }, tasks: payload.tasks.filter((task) => task.id !== 'task-b') },
  previousIndex: undefined,
  legacyTasks: [{ id: 'task-a', title: 'First Task' }, { id: 'legacy-x', title: 'Make Amends' }],
  now: new Date(retrievedAt),
});
assert.deepEqual(index.tasks['task-a'].modes, ['pve', 'pvp']);
assert.deepEqual(index.tasks['task-b'].modes, ['pve']);
assert.deepEqual(index.tombstones.map((tombstone) => [tombstone.id, tombstone.lastMode]), [['legacy-x', 'legacy']]);

const revived = buildCatalogIndex({
  pve: { ...payload, tasks: [...payload.tasks, { ...payload.tasks[0], id: 'legacy-x', title: 'Make Amends' }] },
  pvp: undefined,
  previousIndex: index,
  legacyTasks: [],
  now: new Date(retrievedAt),
});
assert.equal(revived.tombstones.length, 0, 'ids that come back leave the tombstone list');

async function testWrite() {
  const dir = await mkdtemp(join(tmpdir(), 'kappa-data-'));
  const file = join(dir, 'tasks.json');
  await writeValidatedTasksPayload(file, payload);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).tasks.length, 3);
  await assert.rejects(writeValidatedTasksPayload(file, { ...payload, tasks: [] }));
}

testWrite()
  .then(() => console.log('Data pipeline tests passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
