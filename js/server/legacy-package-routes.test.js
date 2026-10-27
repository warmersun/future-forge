import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { packageRevision } from '../package-identity.js';
import { packageObjectKey } from './package-paths.mjs';
import { mintGameSessionToken } from './game-session.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const runId = '11111111-1111-4111-8111-111111111111';
function release(label) {
  const tile = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/quests/companion-moonshots-304.json')));
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/predictions/companion-dock-test.json')));
  tile.id = tile.mission.id = 'dock';
  tile.access = 'open';
  tile.predictionBankId = bank.id;
  tile.grounding = tile.mission.grounding = `AUTHORED ${label}`;
  const members = { 'quests/dock.json': JSON.stringify(tile), [`predictions/${bank.id}.json`]: JSON.stringify(bank) };
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const files = Object.fromEntries(Object.entries(members).map(([name, bytes]) => [name, `sha256:${hash(bytes)}`]));
  const schema = 'future-forge.quest-package/v2';
  const revision = packageRevision(schema, 'dock', Object.entries(files).map(([path, digest]) => ({ path, digest })), hash);
  const ref = { packageId: 'dock', revision, questId: 'dock' };
  const manifest = { schema, version: 2, id: 'dock', revision, files,
    quests: [{ id: 'dock', kind: 'quest', file: 'quests/dock.json', predictionBankId: bank.id }],
    predictions: [{ id: bank.id, file: `predictions/${bank.id}.json` }] };
  return { ref, objects: Object.fromEntries(Object.entries({ ...members, 'manifest.json': JSON.stringify(manifest) })
    .map(([name, bytes]) => [packageObjectKey('', ref, name), bytes])) };
}

it('legacy portal HTTP run start and Continue bind the owned immutable release with current access', { timeout: 30000 }, async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-legacy-run-http-'));
  const old = release('old');
  const latest = release('latest');
  const objects = { ...old.objects, ...latest.objects,
    'catalog.json': JSON.stringify({ quests: [{ id: 'dock', access: 'open', title: 'Synthetic dock', packageRef: old.ref }] }) };
  const objectFile = path.join(work, 'objects.json');
  const stateFile = path.join(work, 'state.json');
  fs.writeFileSync(objectFile, JSON.stringify(objects));
  const preload = path.join(work, 'offline.mjs');
  fs.writeFileSync(preload, `import fs from 'node:fs';
    import { getPool } from ${JSON.stringify(pathToFileURL(path.join(ROOT, 'js/server/db.mjs')).href)};
    const pool=getPool(); let row=null; let snapshot=null;
    pool.query=async (sql,args=[])=>{
      const q=sql.trim();
      if(q.startsWith('INSERT INTO runs')) {row={id:${JSON.stringify(runId)},clerk_user_id:args[0],quest_id:args[1],package_id:args[4],package_revision:args[5],package_quest_id:args[6]}; fs.writeFileSync(${JSON.stringify(stateFile)},JSON.stringify(row)); return {rows:[{id:row.id}]};}
      if(q.includes('FROM runs WHERE clerk_user_id = $1 AND id = $2::uuid')) return {rows:row&&args[0]===row.clerk_user_id&&args[1]===row.id?[row]:[]};
      if(q.startsWith('INSERT INTO run_state')) {snapshot={run_id:args[1],quest_id:args[2],year_reached:args[3],tutor:args[4],board:args[5]?JSON.parse(args[5]):null,play:args[6]?JSON.parse(args[6]):null,chats:args[7]?JSON.parse(args[7]):null}; return {rows:[]};}
      if(q.includes('FROM run_state')) return {rows: snapshot?[snapshot]:[]};
      return {rows:[]};
    };
    pool.connect=async()=>({query:pool.query,release(){}}); pool.end=async()=>{};
    globalThis.fetch=async(raw)=>{const u=new URL(String(raw)); if(u.origin!=='https://legacy-fixture.example')throw Error('Unexpected external request'); const objects=JSON.parse(fs.readFileSync(${JSON.stringify(objectFile)})); const key=u.pathname.slice('/quests/'.length); return Object.hasOwn(objects,key)?new Response(objects[key]):new Response('missing',{status:404});};`);
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const secret = 'offline-fixture-secret-not-a-credential';
  const child = spawn(process.execPath, ['--import', preload, 'portal/server.mjs', '--developer'], { cwd: ROOT,
    env: { PATH: process.env.PATH, HOME: work, TMPDIR: os.tmpdir(), FF_SKIP_PORTAL_ENV_FILE: '1', FF_PORT: String(port),
      FF_HOST: '127.0.0.1', FF_QUESTS_DIR: path.join(work, 'quests'), FF_QUESTS_REMOTE_URL: 'https://legacy-fixture.example/quests/catalog.json',
      FF_TRENDS_REMOTE_URL: 'off', FF_USAGE_ENABLED: '0', DATABASE_URL: 'postgresql://offline.invalid/no-network',
      CLERK_SECRET_KEY: secret, CLERK_PUBLISHABLE_KEY: 'pk_test_b2ZmbGluZS5leGFtcGxlJA' }, stdio: ['ignore','pipe','pipe'] });
  const ended = once(child, 'exit');
  let output = '';
  for (const stream of [child.stdout,child.stderr]) stream.on('data', chunk => { output = (output+chunk).slice(-6000); });
  const origin = `http://127.0.0.1:${port}`;
  const token = userId => mintGameSessionToken({ userId }, { CLERK_SECRET_KEY: secret });
  const request = (route, method, body, userId = 'user_owner') => fetch(`${origin}${route}`, { method,
    headers: { Authorization: `Bearer ${token(userId)}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    let ready = false;
    for (let attempt=0;attempt<150;attempt++) {
      if(child.exitCode!==null)assert.fail(output);
      try {ready=(await fetch(`${origin}/api/health`)).ok;} catch { /* startup */ }
      if(ready)break;
      await delay(30);
    }
    assert.equal(ready,true,output);
    const started = await request('/api/me/runs/start','POST',{questId:'dock'});
    assert.equal(started.status,200,await started.clone().text());
    assert.deepEqual((await started.json()).packageRef,old.ref);
    assert.equal(JSON.parse(fs.readFileSync(stateFile)).package_revision,old.ref.revision);
    objects['catalog.json']=JSON.stringify({quests:[{id:'dock',access:'open',packageRef:latest.ref}]});
    fs.writeFileSync(objectFile,JSON.stringify(objects));
    const saved = { runId,questId:'dock',year:2028,play:{packageRef:old.ref,mission:{id:'dock',grounding:'FORGED'},reflection:'private reflection'},chats:{tutor:[]} };
    const put = await request('/api/me/run-state','PUT',saved);
    assert.equal(put.status,200,await put.clone().text());
    const restored = await request('/api/me/run-state','GET');
    assert.equal(restored.status,200,await restored.clone().text());
    const state=(await restored.json()).state;
    assert.deepEqual(state.play.packageRef,old.ref);
    assert.equal(state.play.mission.grounding,'AUTHORED old');
    assert.equal(state.play.reflection,'private reflection');
    const foreign=await request('/api/me/run-state','PUT',saved,'user_other');
    assert.equal(foreign.status,403,await foreign.clone().text());
    const switched=await request('/api/me/run-state','PUT',{...saved,play:{packageRef:latest.ref}});
    assert.equal(switched.status,409,await switched.clone().text());
    objects['catalog.json']=JSON.stringify({quests:[{id:'dock',access:'paid',packageRef:latest.ref}]});
    fs.writeFileSync(objectFile,JSON.stringify(objects));
    const revoked=await request('/api/me/run-state','GET');
    assert.equal(revoked.status,402,await revoked.clone().text());
    assert.equal((await revoked.json()).error,'content_required');
  } finally {
    child.kill('SIGTERM'); const force=setTimeout(()=>child.kill('SIGKILL'),2000); force.unref();
    await ended; clearTimeout(force); fs.rmSync(work,{recursive:true,force:true});
  }
});
