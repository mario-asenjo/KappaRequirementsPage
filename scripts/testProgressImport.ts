import assert from 'node:assert/strict';
import { Task } from '../src/types';
import { getProgressImportPreview, parseProgressImportJson } from '../src/utils/progressImport';

const tasks: Task[] = [
  { id: 'accepted', title: 'Accepted Quest', trader: 'Prapor', objectives: [], countsForKappa: true },
  { id: 'done', title: 'Done Quest', trader: 'Therapist', objectives: [], countsForKappa: true },
  { id: 'failed', title: 'Failed Quest', trader: 'Skier', objectives: [], countsForKappa: true },
];

const importFile = parseProgressImportJson(JSON.stringify({
  schemaVersion: 1,
  source: 'eft-local-logs',
  generatedAt: '2026-06-05T20:00:00.000Z',
  completedTaskIds: ['done', 'done', 'missing-complete'],
  startedTaskIds: ['accepted', 'missing-start'],
  failedTaskIds: ['failed'],
  warnings: ['Logs may be incomplete'],
}));

assert.deepEqual(importFile.completedTaskIds, ['done', 'missing-complete'], 'completed task ids should be unique');

const preview = getProgressImportPreview(importFile, tasks, ['done']);

assert.deepEqual(preview.validCompletedTaskIds, ['done'], 'preview should keep only known completed IDs');
assert.deepEqual(preview.newCompletedTaskIds, [], 'preview should not reapply already completed tasks');
assert.deepEqual(preview.alreadyCompletedTaskIds, ['done'], 'preview should report already completed tasks');
assert.deepEqual(preview.validStartedTaskIds, ['accepted'], 'preview should report known started tasks');
assert.deepEqual(preview.validFailedTaskIds, ['failed'], 'preview should report known failed tasks');
assert.deepEqual(
  preview.unknownTaskIds.sort(),
  ['missing-complete', 'missing-start'],
  'preview should report unknown imported IDs'
);
assert.equal(preview.warnings.length, 2, 'preview should include importer and local-log warnings');

assert.throws(
  () => parseProgressImportJson('{'),
  /JSON valido/,
  'invalid JSON should fail with a readable message'
);

console.log('Progress import tests passed');
