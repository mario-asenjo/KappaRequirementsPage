import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Task } from '../src/types';
import { extractProfilesFromLogs, ExtractorCatalog } from '../tools/eft-log-importer/extractV2';
import { hashProfileId } from '../tools/eft-log-importer/sessions';
import {
  getDefaultImportProfile,
  getProgressImportPreview,
  parseProgressImportDocument,
  parseProgressImportJson,
  selectImportProfile,
} from '../src/utils/progressImport';

// Synthetic ids only.
const PVE_PROFILE = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const PVP_PROFILE = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const SHARED_DONE = '111111111111111111111111';
const RESTARTED = '222222222222222222222222';
const FAILED_ALT = '333333333333333333333333';
const PVP_ONLY = '444444444444444444444444';
const PVE_ZONE = '555555555555555555555555';
const REMOVED = '666666666666666666666666';
const UNRESOLVED = '777777777777777777777777';
const IN_PROGRESS = '888888888888888888888888';
const OLD_SESSION_TASK = '999999999999999999999999';
const VERSION = '1.3.0.2.48779';

const catalog: ExtractorCatalog = {
  metadata: { pveSyncedAt: '2026-11-17T00:00:00.000Z', pvpSyncedAt: '2026-11-17T00:00:00.000Z' },
  tasks: {
    [SHARED_DONE]: { modes: ['pve', 'pvp'] },
    [RESTARTED]: { modes: ['pve', 'pvp'] },
    [FAILED_ALT]: { modes: ['pve', 'pvp'] },
    [PVP_ONLY]: { modes: ['pvp'] },
    [PVE_ZONE]: { modes: ['pve'] },
    [IN_PROGRESS]: { modes: ['pve', 'pvp'] },
    [OLD_SESSION_TASK]: { modes: ['pve', 'pvp'] },
  },
  tombstones: [{ id: REMOVED }],
};

const line = (date: string, time: string, channel: string, message: string) => `${date} ${time}|${VERSION}|Info|${channel}|${message}`;
const quest = (date: string, time: string, type: number, taskId: string, suffix: string) => `${line(date, time, 'push-notifications', 'Got notification | ChatMessageReceived')}
{
  "type": "new_message",
  "message": {
    "type": ${type},
    "text": "quest started",
    "templateId": "${taskId} ${suffix}"
  }
}`;
const gw = (date: string, time: string, host: string) => line(date, time, 'backend', `---> Request HTTPS: https://${host}.escapefromtarkov.com/client/quest/list`);

async function writeSession(root: string, folder: string, files: Record<string, string>) {
  const dir = join(root, 'Logs', folder);
  await mkdir(dir, { recursive: true });
  const prefix = folder.replace(/^log_/, '');
  await Promise.all(Object.entries(files).map(([channel, content]) => writeFile(join(dir, `${prefix} ${channel}_000.log`), content)));
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), 'eft-extractor-v2-'));
  try {
    // Day 1: PvE profile. Day 2: same folder switches PvE -> PvP.
    await writeSession(root, `log_2026.11.14_20-00-00_${VERSION}`, {
      application: line('2026-11-14', '20:00:10', 'application', `CompleteSelectedProfile ProfileId:${PVE_PROFILE} AccountId:1`),
      backend: [gw('2026-11-14', '20:00:20', 'gw-pve'), gw('2026-11-14', '20:30:00', 'gw-pve')].join('\n'),
      'push-notifications': [
        quest('2026-11-14', '20:05:00', 10, RESTARTED, 'description'),
        quest('2026-11-14', '20:06:00', 11, RESTARTED, 'failMessageText'),
        quest('2026-11-14', '20:07:00', 12, SHARED_DONE, 'successMessageText'),
        quest('2026-11-14', '20:08:00', 11, FAILED_ALT, 'failMessageText'),
        quest('2026-11-14', '20:09:00', 12, PVE_ZONE, 'successMessageText'),
        quest('2026-11-14', '20:10:00', 10, PVP_ONLY, 'description'),
        quest('2026-11-14', '20:11:00', 12, REMOVED, 'successMessageText'),
        quest('2026-11-14', '20:12:00', 10, UNRESOLVED, 'description'),
        quest('2026-11-14', '20:13:00', 10, IN_PROGRESS, 'description'),
      ].join('\n'),
    });
    await writeSession(root, `log_2026.11.15_20-00-00_${VERSION}`, {
      application: [
        line('2026-11-15', '20:00:10', 'application', `CompleteSelectedProfile ProfileId:${PVE_PROFILE} AccountId:1`),
        line('2026-11-15', '21:00:00', 'application', `CompleteSelectedProfile ProfileId:${PVP_PROFILE} AccountId:1`),
      ].join('\n'),
      backend: [gw('2026-11-15', '20:10:00', 'gw-pve'), gw('2026-11-15', '21:10:00', 'gw-pvp')].join('\n'),
      'push-notifications': [
        quest('2026-11-15', '20:20:00', 10, RESTARTED, 'description'),
        quest('2026-11-15', '20:25:00', 12, RESTARTED, 'successMessageText'),
        quest('2026-11-15', '21:20:00', 12, PVP_ONLY, 'successMessageText'),
        quest('2026-11-15', '21:21:00', 12, SHARED_DONE, 'successMessageText'),
      ].join('\n'),
    });
    // Pre-1.2 session: ignored by default.
    await writeSession(root, 'log_2026.09.01_20-00-00_1.1.5.1.47510', {
      application: line('2026-09-01', '20:00:10', 'application', `CompleteSelectedProfile ProfileId:${PVE_PROFILE} AccountId:1`),
      backend: gw('2026-09-01', '20:00:20', 'gw-pve'),
      'push-notifications': quest('2026-09-01', '20:05:00', 12, OLD_SESSION_TASK, 'successMessageText'),
    });

    const result = await extractProfilesFromLogs({ eftPath: root, catalog, now: new Date('2026-11-18T00:00:00.000Z') });
    const pveKey = `pve:${hashProfileId(PVE_PROFILE)}`;
    const pvpKey = `pvp:${hashProfileId(PVP_PROFILE)}`;

    assert.equal(result.schemaVersion, 2);
    assert.equal(result.since, '1.2.0.0');
    assert.equal(result.sessionCount, 2);
    assert.deepEqual(result.profiles.map((profile) => profile.profileKey), [pveKey, pvpKey], 'PvE first');
    assert.ok(!JSON.stringify(result).includes(PVE_PROFILE) && !JSON.stringify(result).includes(PVP_PROFILE), 'no raw profile ids');

    const [pve, pvp] = result.profiles;
    assert.equal(pve.mode, 'pve');
    assert.equal(pve.sessionCount, 2);
    assert.deepEqual(pve.completedTaskIds.sort(), [SHARED_DONE, RESTARTED, PVE_ZONE].sort(), 'restarted task ends completed (last event wins)');
    assert.deepEqual(pve.failedTaskIds, [FAILED_ALT]);
    assert.deepEqual(pve.startedTaskIds, [IN_PROGRESS]);
    assert.ok(!pve.completedTaskIds.includes(OLD_SESSION_TASK), 'pre-1.2 sessions are skipped');
    assert.deepEqual(
      pve.unknownTasks.map((task) => [task.id, task.classification]).sort(),
      [[PVP_ONLY, 'other-mode'], [REMOVED, 'removed'], [UNRESOLVED, 'unresolved']].sort(),
    );

    assert.equal(pvp.mode, 'pvp');
    assert.deepEqual(pvp.completedTaskIds.sort(), [PVP_ONLY, SHARED_DONE].sort(), 'PvP events never leak into PvE');
    assert.equal(pvp.sessionCount, 1);

    const withOld = await extractProfilesFromLogs({ eftPath: root, catalog, sinceVersion: '1.0.0.0' });
    assert.ok(withOld.profiles[0].completedTaskIds.includes(OLD_SESSION_TASK), '--since includes older sessions');

    // Web side: parse v2, default to PvE, select profiles into the v1 preview flow.
    const parsed = parseProgressImportDocument(JSON.stringify(result));
    assert.equal(parsed.schemaVersion, 2);
    if (parsed.schemaVersion !== 2) throw new Error('unreachable');
    assert.equal(getDefaultImportProfile(parsed.document)?.profileKey, pveKey);

    const tasks: Task[] = [SHARED_DONE, RESTARTED, FAILED_ALT, PVE_ZONE, IN_PROGRESS].map((id) => ({
      id, title: id, trader: 'Prapor', objectives: [], countsForKappa: false,
    }));
    const pveFile = selectImportProfile(parsed.document, pveKey);
    assert.equal(pveFile.profile?.mode, 'pve');
    const preview = getProgressImportPreview(pveFile, tasks, []);
    assert.deepEqual(preview.newCompletedTaskIds.sort(), [SHARED_DONE, RESTARTED, PVE_ZONE, FAILED_ALT].sort());
    assert.deepEqual(preview.validStartedTaskIds, [IN_PROGRESS]);

    const pvpPreview = getProgressImportPreview(selectImportProfile(parsed.document, pvpKey), tasks, []);
    assert.deepEqual(pvpPreview.newCompletedTaskIds, [SHARED_DONE], 'only the chosen profile is applied');

    assert.deepEqual(parseProgressImportJson(JSON.stringify(result)).completedTaskIds.sort(), pve.completedTaskIds.sort(), 'legacy helper picks PvE');
    assert.equal(parseProgressImportDocument(JSON.stringify({ schemaVersion: 1, source: 'x', generatedAt: 'y', completedTaskIds: [SHARED_DONE] })).schemaVersion, 1, 'v1 still accepted');
    assert.throws(() => parseProgressImportDocument(JSON.stringify({ ...result, profiles: [] })), /ningun perfil/);
    assert.throws(() => parseProgressImportDocument(JSON.stringify({ schemaVersion: 3 })), /schemaVersion 1 o 2/);

    console.log('Extractor v2 tests passed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
