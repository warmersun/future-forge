import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mission = (id = 'quest-a', trust = 'official') => ({ id, packageRef: { questId: id }, runWorld: { trust } });
function harness(initialMission) {
  const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
  const starter = source.slice(source.indexOf('function postCloudRunStart(mission)'), source.indexOf('async function syncCloudProgress()'));
  const scheduler = source.slice(source.indexOf('function scheduleCloudRunState()'), source.indexOf('function applyRestoredPlay(play)'));
  const post = source.slice(source.indexOf('function postCloudRun(run,'), source.indexOf('function postCloudRunStart(mission)'));
  const state = { mission: initialMission, cloudRunId: null, progress: 'initial' };
  const pending = [], puts = [], notices = [], timers = new Map(); let nextTimer = 0;
  const apiFetch = (url, options) => {
    if (url === '/api/me/runs/start' || url === '/api/me/runs') return new Promise((resolve, reject) => pending.push({ url, resolve, reject }));
    puts.push(JSON.parse(options.body));
    return Promise.resolve({ ok: true });
  };
  const setTimer = (fn) => { timers.set(++nextTimer, fn); return nextTimer; };
  const clearTimer = (id) => timers.delete(id);
  const payload = () => ({ questId: state.mission.id, runId: state.cloudRunId, progress: state.progress });
  const methods = new Function('state', 'apiFetch', 'isClerkSignedIn', 'cloudRunKind', 'isRoomOrHotseatSession', 'flashToast', 'setTimeout', 'clearTimeout', 'cloudRunStatePayload', 'applyOutcomeCloudSaveChrome',
    `let cloudRunStateTimer = null; ${post}\n${starter}\n${scheduler}\nreturn { postCloudRun, postCloudRunStart, scheduleCloudRunState };`)(
    state, apiFetch, () => true, () => 'solo', () => false, (s) => notices.push(s), setTimer, clearTimer, payload, () => {});
  const tick = () => { const tasks = [...timers.values()]; timers.clear(); for (const f of tasks) f(); };
  return { state, pending, puts, notices, tick, ...methods };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('official Continue waits for run ID and saves the latest state', async () => {
  const current = mission(), h = harness(current);
  h.postCloudRunStart(current);
  h.scheduleCloudRunState(); h.tick();
  assert.equal(h.puts.length, 0);
  h.state.progress = 'updated while start was pending';
  h.pending[0].resolve({ ok: true, json: async () => ({ id: 'run-a' }) });
  await flush(); h.tick(); await flush();
  assert.deepEqual(h.puts, [{ questId: 'quest-a', runId: 'run-a', progress: 'updated while start was pending' }]);
  assert.deepEqual(h.notices, []);
});

test('a late start or completion cannot bind to a replacement quest', async () => {
  const old = mission(), h = harness(old);
  h.postCloudRunStart(old); h.scheduleCloudRunState();
  h.state.mission = mission('quest-b'); h.state.cloudRunId = null;
  h.tick();
  h.pending[0].resolve({ ok: true, json: async () => ({ id: 'old-run' }) });
  await flush(); h.tick();
  assert.equal(h.state.cloudRunId, null);
  assert.equal(h.puts.length, 0);
  const completion = h.postCloudRun({ questId: 'quest-b' });
  h.state.mission = mission('quest-b');
  h.pending[1].resolve({ ok: true, json: async () => ({ id: 'old-completion' }) });
  await completion;
  assert.equal(h.state.cloudRunId, null);
});

test('failed official starts warn; local imports can still save without an official run ID', async () => {
  const current = mission(), h = harness(current);
  h.postCloudRunStart(current);
  h.pending[0].resolve({ ok: false, json: async () => ({}) });
  await flush();
  assert.match(h.notices[0], /Continue is not being saved/);
  h.state.mission = mission('quest-a', 'local-import'); h.scheduleCloudRunState(); h.tick(); await flush();
  assert.equal(h.puts.length, 1);
  assert.equal(h.puts[0].runId, null);
});

test('a delayed progress import does not replace the active run ID', async () => {
  const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
  const sync = source.slice(source.indexOf('async function syncCloudProgress()'), source.indexOf('let cloudRunStateTimer = null;'));
  const state = { mission: null, cloudRunId: null, solvedMissionIds: new Set() };
  let finish;
  const apiFetch = () => new Promise((resolve) => { finish = resolve; });
  const noop = () => {};
  const run = new Function('state', 'apiFetch', 'isClerkSignedIn', 'refreshCloudDbFlag', 'applyOutcomeCloudSaveChrome', 'readBriefedQuestIds', 'readStashedLastRun', 'flashToast', 'postCloudRun', 'syncCloudPins', 'maybeOfferContinue', 'unionSolvedIds',
    `let cloudImportDone = false; ${sync}; return syncCloudProgress;`)(state, apiFetch, () => true, async () => true, noop, () => [], () => null, noop, noop, noop, noop, noop);
  const started = run();
  await flush();
  state.mission = mission();
  state.cloudRunId = 'current-run';
  finish({ ok: true, json: async () => ({ lastRunId: 'old-imported-run' }) });
  await started;
  assert.equal(state.cloudRunId, 'current-run');
});

test('imported past runs do not bind to the active quest', async () => {
  const h = harness(mission());
  const req = h.postCloudRun({ questId: 'quest-a' }, { bindCurrent: false });
  h.pending[0].resolve({ ok: true, json: async () => ({ id: 'imported-run' }) });
  await req;
  assert.equal(h.state.cloudRunId, null);
});
