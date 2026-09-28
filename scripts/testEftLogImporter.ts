import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Task } from '../src/types';
import { detectGameMode, extractProgressFromLogs } from '../tools/eft-log-importer/parser';
import { getArg, getCandidateEftPaths, resolveEftPath } from '../tools/eft-log-importer/paths';

const tasks: Task[] = [
  { id: '59689ee586f7740d1570bbd5', title: 'Sanitary Standards - Part 1', trader: 'Therapist', objectives: [], countsForKappa: true },
  { id: '59689fbd86f7740d137ebfc4', title: 'Operation Aquarius - Part 1', trader: 'Therapist', objectives: [], countsForKappa: true },
  { id: '597a0f5686f774273b74f676', title: 'Chemical - Part 4', trader: 'Skier', objectives: [], countsForKappa: true },
];

assert.equal(detectGameMode('onlinePveRaidStates'), 'pve', 'PvE log marker should resolve PvE');
assert.equal(detectGameMode('gw-pvp.escapefromtarkov.com'), 'pvp', 'PvP endpoint should resolve PvP');
assert.equal(detectGameMode('gw-pvp-season.escapefromtarkov.com'), 'seasonal-pvp', 'season endpoint should resolve seasonal PvP');

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

    assert.equal(result.schemaVersion, 2, 'extractor should emit schemaVersion 2');
    assert.equal(result.clientVersion, 'unknown', 'extractor must declare unknown client version rather than inventing one');
    assert.equal(result.profile?.mode, 'pve', 'missing mode signal should default to PvE');
    assert.equal(result.generatedAt, '2026-06-06T12:00:00.000Z', 'generatedAt should use injected clock');
    assert.equal(result.profile?.profileId, 'profile-a', 'profile id should be inferred when present');
    assert.deepEqual(result.completedTaskIds, ['59689ee586f7740d1570bbd5'], 'successMessageText should mark completed quests');
    assert.deepEqual(result.startedTaskIds, ['59689fbd86f7740d137ebfc4'], 'description should mark started quests');
    assert.deepEqual(result.failedTaskIds, ['597a0f5686f774273b74f676'], 'failMessageText should mark failed quests');
    assert.deepEqual(result.unknownTaskIds, ['6a1c766939a00fb24a0b8d25'], 'unknown task ids should aggregate quest IDs');
    assert.equal(result.unmatchedTemplateIds?.length, 1, 'unknown task ids should be reported');
    assert.equal(result.rawMatches?.length, 4, 'raw matches should include all recognized quest template suffixes');
    assert.equal(getArg(['node', 'cli', '--eft', root], '--eft'), root, 'CLI arg helper should read explicit paths');
    assert.deepEqual(getCandidateEftPaths(['node', 'cli', '--eft', root], {}), [root], 'explicit EFT path should be the only candidate');
    assert.deepEqual(getCandidateEftPaths(['node', 'cli'], { EFT_PATH: root }), [root], 'EFT_PATH should be supported');
    assert.equal(await resolveEftPath(['node', 'cli', '--eft', root], {}), root, 'resolver should accept folders with Logs');
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  console.log('EFT log importer tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
