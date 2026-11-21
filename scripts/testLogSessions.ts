import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { channelOf, compareVersions, hashProfileId, readSessions, resolveProfileModes } from '../tools/eft-log-importer/sessions';
import { buildSurvey } from '../tools/eft-log-importer/survey';

// Synthetic ids only: no real profile/account data in fixtures.
const PVE_PROFILE = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const PVP_PROFILE = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const TASK_STARTED = '111111111111111111111111';
const TASK_DONE = '222222222222222222222222';
const TASK_FAILED = '333333333333333333333333';
const TASK_PVP = '444444444444444444444444';
const VERSION = '1.3.0.2.48779';

const line = (time: string, channel: string, message: string) => `2026-11-14 ${time}|${VERSION}|Info|${channel}|${message}`;
const questMessage = (time: string, type: number, taskId: string, suffix: string) => `${line(time, 'push-notifications', 'Got notification | ChatMessageReceived')}
{
  "type": "new_message",
  "message": {
    "type": ${type},
    "dt": 1,
    "text": "quest started",
    "templateId": "${taskId} ${suffix}",
    "hasRewards": false
  }
}`;

async function writeSession(root: string, folder: string, files: Record<string, string>) {
  const dir = join(root, 'Logs', folder);
  await mkdir(dir, { recursive: true });
  const prefix = folder.replace(/^log_/, '');
  await Promise.all(Object.entries(files).map(([channel, content]) => writeFile(join(dir, `${prefix} ${channel}_000.log`), content)));
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), 'eft-log-sessions-'));
  try {
    const push = [
      questMessage('20:10:00', 10, TASK_STARTED, 'description'),
      questMessage('20:20:00', 12, TASK_DONE, 'successMessageText'),
      questMessage('20:20:01', 11, TASK_FAILED, 'failMessageText'),
      questMessage('21:05:00', 12, TASK_PVP, 'successMessageText'),
    ].join('\n');

    await writeSession(root, `log_2026.11.14_20-00-00_${VERSION}`, {
      application: [
        line('20:01:00', 'application', `CompleteSelectedProfile ProfileId:${PVE_PROFILE} AccountId:12345`),
        line('21:00:00', 'application', `CompleteSelectedProfile ProfileId:${PVP_PROFILE} AccountId:12345`),
      ].join('\n'),
      backend: [
        line('20:00:30', 'backend', '---> Request HTTPS: https://gw-pvp.escapefromtarkov.com/client/game/start'),
        line('20:00:31', 'backend', '---> Request HTTPS: https://gw-pve.escapefromtarkov.com/client/game/start'),
        ...Array.from({ length: 30 }, (_, index) => line(`20:${String(10 + index).padStart(2, '0')}:00`, 'backend', '---> Request HTTPS: https://gw-pve.escapefromtarkov.com/client/quest/list')),
        ...Array.from({ length: 10 }, (_, index) => line(`21:0${index}:30`, 'backend', '---> Request HTTPS: https://gw-pvp.escapefromtarkov.com/client/quest/list')),
      ].join('\n'),
      'push-notifications': push,
      // `output` repeats every quest event: it must not be counted twice.
      output: push,
    });

    await writeSession(root, 'log_2026.10.01_20-00-00_1.1.5.1.47510', {
      application: line('20:01:00', 'application', `CompleteSelectedProfile ProfileId:${PVE_PROFILE} AccountId:12345`),
      'push-notifications': questMessage('20:10:00', 12, '555555555555555555555555', 'successMessageText'),
    });

    assert.equal(channelOf(`2026.11.14_20-00-00_${VERSION} push-notifications_000.log`), 'push-notifications');
    assert.ok(compareVersions('1.3.0.2', '1.2.0.0') > 0);
    assert.ok(compareVersions('1.1.5.1', '1.2.0.0') < 0);

    const sessions = await readSessions(root);
    assert.equal(sessions.length, 1, 'sessions older than 1.2.0.0 are skipped by default');
    const [session] = sessions;
    assert.equal(session.clientVersion, '1.3.0.2');
    assert.equal(session.events.length, 4, 'events are read only from push-notifications');

    const pveHash = hashProfileId(PVE_PROFILE);
    const pvpHash = hashProfileId(PVP_PROFILE);
    assert.deepEqual(session.events.map((event) => [event.taskId, event.event, event.profileHash]), [
      [TASK_STARTED, 'started', pveHash],
      [TASK_DONE, 'completed', pveHash],
      [TASK_FAILED, 'failed', pveHash],
      [TASK_PVP, 'completed', pvpHash],
    ]);
    assert.deepEqual(session.gatewayHits['before-profile-selection'], { pvp: 1, pve: 1 }, 'login traffic is kept apart');

    const modes = resolveProfileModes(sessions);
    assert.deepEqual(modes[pveHash], { mode: 'pve', confidence: 'high', hits: { pve: 30 } });
    assert.deepEqual(modes[pvpHash], { mode: 'pvp', confidence: 'high', hits: { pvp: 10 } });

    assert.equal((await readSessions(root, { sinceVersion: '1.0.0.0' })).length, 2, '--since can include older sessions');

    const survey = await buildSurvey(root, '1.2.0.0');
    const surveyText = JSON.stringify(survey);
    assert.ok(!surveyText.includes(PVE_PROFILE) && !surveyText.includes(PVP_PROFILE) && !surveyText.includes('12345'), 'survey output is redacted');
    assert.deepEqual(survey.sessions[0].events.map((event) => event.mode), ['pve', 'pve', 'pve', 'pvp']);
    assert.equal(survey.sessions[0].events[0].classification, 'unresolved');

    console.log('Log session tests passed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
