import { it } from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from './room-manager.mjs';
import { createAsyncRoomQuestRequestAuthority } from '../server/quest-request-authority.mjs';
import { validatePredictionsBank } from '../sim/world-foresight.js';

const ref = { packageId: 'room-test', questId: 'room-test', revision: `sha256:${'ab'.repeat(32)}` };
const bank = validatePredictionsBank({ schema: 'future-forge.predictions/v1', id: 'room-bank', title: 'TEST', predictions: [{ id: 'test-row', year: 2028, kind: 'prediction', claimBand: 'frontier', headline: 'TEST robots', detail: 'Fiction.', attribution: { name: 'Test' } }] }).bank;
const ordinary = { id: 'ordinary', globalId: 'climate', title: 'Test', startYear: 2026, collapseYear: 2034, yearsPerTurn: 2, pressure: { Floods: 2 }, pressureRise: { Floods: 1 }, winMax: { Floods: 1 } };
const authoritative = { ...ordinary, id: ref.questId, packageRef: ref, predictionBankId: bank.id, runWorld: { packageRef: ref, bank, trust: 'local-import', questId: ref.questId } };
function setup(opts = {}) {
  const rm = new RoomManager(opts);
  const created = rm.createRoom({ displayName: 'Host', clerkUserId: 'verified-host' });
  const room = rm.rooms.get(created.code);
  room.players[0].connected = true;
  rm.joinRoom(created.code, { displayName: 'Bea', clerkUserId: 'verified-bea' });
  return { rm, room, host: room.players[0] };
}
it('fails closed without resolver, on resolver denial, and on async resolver', () => {
  for (const opts of [{}, { resolveMission: () => ({ ok: false, error: 'forbidden' }) }, { resolveMission: () => Promise.resolve({ ok: true, mission: authoritative }) }]) {
    const { rm, room, host } = setup(opts);
    let broadcasts = 0;
    rm.broadcast = () => broadcasts++;
    for (const cmd of ['set_quest', 'start_quest']) assert.equal(rm.hostCommand(room, host, cmd, { mission: authoritative }).ok, false);
    assert.equal(room.mp, null);
    assert.equal(room.questMeta, null);
    assert.equal(broadcasts, 0);
  }
});
it('resolves known package IDs, clones authoritative banks, reconnects identically, clears ordinary world', async () => {
  const calls = [];
  let aiBody;
  const { rm, room, host } = setup({
    resolveMission: (mission, context) => {
      calls.push(context);
      return mission.id === ref.questId ? { ok: true, mission: authoritative } : null;
    },
    coInventHandler: async body => { aiBody = body; return { message: 'test' }; },
  });
  assert.equal(rm.hostCommand(room, host, 'set_quest', { mission: { ...ordinary, id: ref.questId, runWorld: { bank: { id: 'forged' } } } }).ok, true);
  assert.notEqual(room.questMeta.mission.runWorld.bank, bank);
  assert.deepEqual(calls[0].clerkUserIds, ['verified-host', 'verified-bea']);
  assert.equal(rm.hostCommand(room, host, 'start_quest', { mission: ordinary }).ok, true);
  assert.deepEqual(room.mp.place.mission.runWorld.bank, bank);
  await rm.requestAi(room, host, { context: { packageRef: { ...ref, revision: 'forged' }, predictionsBank: { id: 'forged' }, year: 2099 }, tutor: true });
  assert.deepEqual(aiBody.context.packageRef, ref);
  assert.deepEqual(aiBody.context.predictionsBank, bank);
  assert.equal(aiBody.context.year, 2026);
  const rejoin = rm.joinRoom(room.code, { playerToken: room.players[1].playerToken });
  assert.deepEqual(rejoin.snapshot.mp.place.mission.runWorld.bank, bank);
  room.mp.place.status = 'collapsed';
  assert.equal(rm.hostCommand(room, host, 'set_quest', { mission: ordinary }).ok, true);
  assert.equal(rm.hostCommand(room, host, 'start_quest').ok, true);
  assert.equal(room.mp.place.mission.packageRef, undefined);
  assert.equal(room.mp.place.mission.runWorld, undefined);
});
it('async authority checks every verified participant on selection/start and never reads payload grants', async () => {
  const calls = [];
  let revoked = false;
  const resolveMissionAsync = createAsyncRoomQuestRequestAuthority({
    loadCatalog: async () => ({ ok: true, quests: [{ id: ref.questId, packageRef: ref }] }),
    resolvePackage: async (requested, access) => {
      calls.push(access);
      if (revoked && access.identity.userId === 'verified-bea') return { ok: false, code: 'subscription_required' };
      return { ok: true, record: { id: ref.questId, mission: authoritative }, packageRef: requested, bank };
    },
  });
  const { rm, room, host } = setup({ resolveMissionAsync });
  assert.equal((await rm.hostCommandAsync(room, room.players[1], 'set_quest', { mission: { id: ref.questId } })).error, 'not_host');
  assert.equal(calls.length, 0);
  assert.equal((await rm.hostCommandAsync(room, host, 'set_quest', { mission: { id: ref.questId }, entitled: true })).ok, true);
  assert.deepEqual(calls.map(c => c.identity.userId), ['verified-host', 'verified-bea']);
  assert.equal(calls.every(c => c.entitled === false), true);
  revoked = true;
  assert.equal((await rm.hostCommandAsync(room, host, 'start_quest')).error, 'subscription_required');
  assert.equal(room.mp, null);
  assert.equal(calls.length, 4);
});
it('late async results cannot override newer selection, start, membership/reconnect or revoked host privilege', async () => {
  for (const change of ['selection', 'start', 'join', 'reconnect', 'host']) {
    let release;
    const { rm, room, host } = setup({ resolveMissionAsync: () => new Promise(resolve => { release = resolve; }) });
    const pending = rm.hostCommandAsync(room, host, 'set_quest', { mission: ordinary });
    if (change === 'selection') rm.hostCommand(room, host, 'set_quest', { mission: { ...ordinary, title: 'New' } });
    if (change === 'start') rm.hostCommand(room, host, 'start_quest', { mission: ordinary });
    if (change === 'join') rm.joinRoom(room.code, { displayName: 'Third' });
    if (change === 'reconnect') rm.joinRoom(room.code, { playerToken: host.playerToken });
    if (change === 'host') { host.isHost = false; room.hostPlayerId = room.players[1].id; }
    release({ ok: true, mission: { ...ordinary, title: 'Late' } });
    assert.equal((await pending).ok, false, change);
    assert.notEqual(room.questMeta?.mission?.title, 'Late');
  }
  let firstRelease;
  let calls = 0;
  const { rm, room, host } = setup({ resolveMissionAsync: mission => ++calls === 1
    ? new Promise(resolve => { firstRelease = resolve; }) : Promise.resolve({ ok: true, mission }) });
  const first = rm.hostCommandAsync(room, host, 'set_quest', { mission: ordinary });
  assert.equal((await rm.hostCommandAsync(room, host, 'set_quest', { mission: { ...ordinary, title: 'Latest' } })).ok, true);
  firstRelease({ ok: true, mission: ordinary });
  assert.equal((await first).error, 'room_changed');
  assert.equal(room.questMeta.mission.title, 'Latest');
});

it('checks current participants again at start without mutating selected world on denial', () => {
  const { rm, room, host } = setup({ resolveMission: (_mission, { clerkUserIds }) => clerkUserIds.every(Boolean)
    ? { ok: true, mission: authoritative } : { ok: false, error: 'members_only' } });
  assert.equal(rm.hostCommand(room, host, 'set_quest', { mission: { id: ref.questId } }).ok, true);
  room.players[1].clerkUserId = null;
  assert.equal(rm.hostCommand(room, host, 'start_quest').error, 'members_only');
  assert.equal(room.mp, null);
});
