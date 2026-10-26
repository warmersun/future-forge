import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./game.js', import.meta.url), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

function fixture() {
  const snapshots = [], controllers = [], requests = [];
  const state = { screen: 'workshop', mission: { id: 'q', packageRef: { packageId: 'p', questId: 'q', revision: 'r' } }, runWorld: { bank: 'bound' }, pinnedPredictionsBank: null, year: 2041, selectedTechIds: ['a'], hostedTrends: [{ id: 'cached' }], hostedTrendsLoaded: true, hostedTrendsOk: true, mp: { mode: 'room', code: 'room', viewSeatId: 'one' } };
  let host = {};
  const ctx = { state, focusedTechId: 'b', techById: id => id === 'b' ? { name: 'Biotech' } : null, $: () => host, getWorldForesightBank: () => 'ambient', liveScenarioPremise: () => null, mountTrendChart() {}, destroyTrendChart() {}, refreshHostedTrends: (...args) => requests.push(args), createCapabilityExplorer: (h, deps) => { const c = { host: h, deps, updates: 0, suspends: 0, update: s => { c.updates++; snapshots.push(s); }, suspend: () => c.suspends++, destroy: () => c.destroyed = true }; controllers.push(c); return c; } };
  const setHost = value => { host = value; };
  runInNewContext(section('let capabilityExplorer = null;', 'function activePinnedBank()'), ctx);
  return { ctx, state, snapshots, controllers, requests, setHost };
}

test('snapshot uses current hydrated state and preserves run/seat identity across paints', () => {
  const f = fixture(); f.ctx.syncCapabilityExplorer();
  const a = f.snapshots.at(-1);
  assert.equal(a.year, 2041); assert.equal(a.focusedTechId, 'b'); assert.equal(a.focusedTechName, 'Biotech');
  assert.equal(a.runWorld, f.state.runWorld); assert.equal(a.ambientBank, 'ambient');
  assert.equal(a.status.catalog, 'ready');
  f.ctx.syncCapabilityExplorer(); assert.equal(f.controllers.length, 1);
  assert.equal(f.snapshots.at(-1).viewIdentity, a.viewIdentity);
  f.state.year = 2055; f.state.mp.viewSeatId = 'two'; f.ctx.syncCapabilityExplorer();
  assert.equal(f.snapshots.at(-1).year, 2055);
  assert.notEqual(f.snapshots.at(-1).viewIdentity, a.viewIdentity);
  f.state.mp.viewSeatId = 'one'; f.ctx.resetCapabilityExplorerRun(); f.ctx.syncCapabilityExplorer();
  assert.notEqual(f.snapshots.at(-1).viewIdentity, a.viewIdentity);
  assert.equal(f.requests.length, 0);
  f.controllers[0].deps.retry(); assert.equal(f.requests.length, 1);
});

test('navigation suspends and resumes the same controller with live state', () => {
  const f = fixture(); f.ctx.syncCapabilityExplorer();
  const controller = f.controllers[0], identity = f.snapshots.at(-1).viewIdentity;
  f.ctx.suspendCapabilityExplorer(); f.state.screen = 'title'; f.state.year = 2055;
  f.ctx.syncCapabilityExplorer();
  assert.equal(controller.suspends, 1); assert.equal(controller.destroyed, undefined); assert.equal(controller.updates, 1);
  f.state.screen = 'workshop'; f.ctx.syncCapabilityExplorer();
  assert.equal(f.controllers.length, 1); assert.equal(controller.updates, 2);
  assert.equal(f.snapshots.at(-1).year, 2055); assert.equal(f.snapshots.at(-1).viewIdentity, identity);
});

test('run reset and host replacement destroy the old controller', () => {
  const f = fixture(); f.ctx.syncCapabilityExplorer(); const first = f.controllers[0];
  f.setHost({}); f.ctx.syncCapabilityExplorer(); assert.equal(first.destroyed, true);
  const second = f.controllers[1], identity = f.snapshots.at(-1).viewIdentity;
  f.ctx.resetCapabilityExplorerRun(); assert.equal(second.destroyed, true);
  f.ctx.syncCapabilityExplorer(); assert.equal(f.controllers.length, 3);
  assert.notEqual(f.snapshots.at(-1).viewIdentity, identity);
  f.setHost(null); f.ctx.syncCapabilityExplorer(); assert.equal(f.controllers[2].destroyed, true);
});

test('catalog completion syncs on success and failures without losing cached trends', async () => {
  const fn = section('async function refreshHostedTrends(opts = {})', '/**\n * Invent-screen module');
  for (const response of [null, { ok: false, json: async () => ({}) }, { ok: true, json: async () => ({ ok: true, remoteOk: false, trends: [] }) }, { ok: true, json: async () => ({ ok: true, trends: [{ id: 'new' }] }) }]) {
    const state = { hostedTrends: [{ id: 'old' }] }; let syncs = 0;
    const ctx = { state, fetch: async () => { if (!response) throw Error('offline'); return response; }, flashToast() {}, _waitConfirmCtx: null, syncWaitTrendCharts() {}, syncCapabilityExplorer: () => syncs++ };
    runInNewContext(fn, ctx); await ctx.refreshHostedTrends({ silent: true });
    assert.equal(syncs, 1); assert.equal(state.hostedTrendsLoaded, true);
    assert.equal(state.hostedTrends[0].id, response?.ok && !((await response.json()).remoteOk === false) ? 'new' : 'old');
  }
});

test('storm hydration and legacy tech focus synchronize the explorer', () => {
  const start = source.indexOf('  if (storm) {');
  const storm = source.slice(start, source.indexOf('  mpHydrateBusy = true;', start));
  assert.match(storm, /reapplyFocusedInventDrafts\(drafts\);[\s\S]*syncCapabilityExplorer\(\)/);
  const toggleStart = source.indexOf('      focusedTechId = btn.dataset.techToggle;');
  const toggle = source.slice(toggleStart, source.indexOf('  el.querySelectorAll(".tech-card")', toggleStart));
  assert.match(toggle, /onTechClick\(btn.dataset.techToggle\);\s*syncCapabilityExplorer\(\)/);
});

test('game and explorer use the same cache-busted chart module', () => {
  const explorer = readFileSync(new URL('./capability-explorer.js', import.meta.url), 'utf8');
  const chartImport = text => text.match(/from ["'](\.\/trend-chart\.js\?[^"']+)["']/)?.[1];
  assert.ok(chartImport(source), 'game chart import must be cache-busted');
  assert.equal(chartImport(source), chartImport(explorer));
});

test('workshop and accepted focus hooks, ambient finalizer, and navigation suspension are wired', () => {
  const workshop = section('function renderWorkshop() {', 'function renderWorkshopDeployBay()');
  assert.match(workshop, /renderWorkshopDeployBay\(\);\s*syncCapabilityExplorer\(\)/);
  const focus = section('function focusTech(techId)', 'async function openIdeaDeck');
  assert.ok(focus.indexOf('focusedTechId = techId') < focus.indexOf('syncCapabilityExplorer()'));
  assert.match(section('async function loadPredictionsFromServer()', 'export function init()'), /finally\s*\{\s*syncCapabilityExplorer\(\)/);
  assert.match(section('function showScreen(id)', 'function renderTitleMeta()'), /id !== "workshop"\) suspendCapabilityExplorer\(\)/);
});
