import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Task } from '../src/types';
import { extractProgressFromLogs } from '../tools/eft-log-importer/parser';

const tasks: Task[] = [
  { id: '59689ee586f7740d1570bbd5', title: 'Sanitary Standards - Part 1', trader: 'Therapist', objectives: [], countsForKappa: true },
  { id: '59689fbd86f7740d137ebfc4', title: 'Operation Aquarius - Part 1', trader: 'Therapist', objectives: [], countsForKappa: true },
  { id: '597a0f5686f774273b74f676', title: 'Chemical - Part 4', trader: 'Skier', objectives: [], countsForKappa: true },
];

async function main() {
  const root = await mkdtemp(join(tmpdir(), 'eft-log-importer-'));

  try {
    const session = join(root, 'Logs', 'log_test');
    await mkdir(session, { recursive: true });
    await writeFile(join(session, '2026.06.06 push-notifications_000.log'), `2026-06-06|Info|push-notifications|Got notification | UserConfirmed
{
  "profileid": "profile-a"
}
2026-06-06|Info|push-notifications|Got notification | ChatMessageReceived
{
  "type": "new_message",
  "message": {
    "text": "quest started",
    "templateId": "59689fbd86f7740d137ebfc4 description"
  }
}
2026-06-06|Info|push-notifications|Got notification | ChatMessageReceived
{
  "type": "new_message",
  "message": {
    "text": "quest started",
    "templateId": "59689ee586f7740d1570bbd5 successMessageText"
  }
}
2026-06-06|Info|push-notifications|Got notification | ChatMessageReceived
{
  "type": "new_message",
  "message": {
    "text": "quest started",
    "templateId": "597a0f5686f774273b74f676 failMessageText"
  }
}
2026-06-06|Info|push-notifications|Got notification | ChatMessageReceived
{
  "type": "new_message",
  "message": {
    "text": "quest started",
    "templateId": "6a1c766939a00fb24a0b8d25 description"
  }
}
`, 'utf8');

    const result = await extractProgressFromLogs({
      eftPath: root,
      tasks,
      now: new Date('2026-06-06T12:00:00.000Z'),
    });

    assert.equal(result.generatedAt, '2026-06-06T12:00:00.000Z', 'generatedAt should use injected clock');
    assert.equal(result.profile?.profileId, 'profile-a', 'profile id should be inferred when present');
    assert.deepEqual(result.completedTaskIds, ['59689ee586f7740d1570bbd5'], 'successMessageText should mark completed quests');
    assert.deepEqual(result.startedTaskIds, ['59689fbd86f7740d137ebfc4'], 'description should mark started quests');
    assert.deepEqual(result.failedTaskIds, ['597a0f5686f774273b74f676'], 'failMessageText should mark failed quests');
    assert.equal(result.unmatchedTemplateIds?.length, 1, 'unknown task ids should be reported');
    assert.equal(result.rawMatches?.length, 4, 'raw matches should include all recognized quest template suffixes');
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  console.log('EFT log importer tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
