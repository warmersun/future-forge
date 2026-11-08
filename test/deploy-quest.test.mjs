import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../deploy-quest.sh', import.meta.url));

test('offline v2 projection pins raw bytes and live v2 fails closed', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'deploy-quest-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const ff = path.join(root, 'ff'), ws = path.join(root, 'ws'), bin = path.join(root, 'bin');
  for (const dir of [path.join(ff, 'scripts'), path.join(ws, 'scripts'), bin]) mkdirSync(dir, { recursive: true });
  const log = path.join(root, 'called');
  // Simulates the verified unpack contract; no network or external writes.
  writeFileSync(path.join(ff, 'scripts/quest-package.py'), `import sys,zipfile,pathlib,shutil
if sys.argv[1]=='verify': print('verified')
elif sys.argv[1]=='unpack':
 d=pathlib.Path(sys.argv[3]); d.mkdir()
 with zipfile.ZipFile(sys.argv[2]) as z: z.extractall(d)
 shutil.copytree(d, d/'raw', ignore=shutil.ignore_patterns('raw'))
else: sys.exit(2)
`);
  writeFileSync(path.join(ws, 'scripts/gated-deploy-package.sh'), '#!/bin/sh\nprintf "helper\\n" >> "$CALL_LOG"\n');
  chmodSync(path.join(ws, 'scripts/gated-deploy-package.sh'), 0o755);
  writeFileSync(path.join(bin, 'node'), '#!/bin/sh\nprintf "node %s\\n" "$*" >> "$CALL_LOG"\nexit "${STUB_NODE_EXIT:-0}"\n');
  chmodSync(path.join(bin, 'node'), 0o755);
  const bank = Buffer.from('{"id":"bank-a","note":"café"}\n');
  const hash = createHash('sha256').update(bank).digest('hex');
  const m = { id: 'sample', version: 2, revision: 'sha256:' + 'a'.repeat(64),
    quests: [{ id: 'sample', file: 'quests/sample.json', kind: 'quest', predictionBankId: 'bank-a' }, { id: 'module-a', file: 'quests/module-a.json', kind: 'module' }],
    predictions: [{ id: 'bank-a', file: 'predictions/bank-a.json' }], lessons: [{}], files: {} };
  const pkg = path.join(root, 'test.ffquest');
  const encoded = Buffer.from(JSON.stringify({ m, bank: bank.toString(), quest: { id: 'sample', predictionBankId: 'bank-a', content: 'keep' } })).toString('base64');
  const make = spawnSync('python3', ['-c', `import base64,json,sys,zipfile
x=json.loads(base64.b64decode(sys.argv[2]))
with zipfile.ZipFile(sys.argv[1],'w') as z:
 z.writestr('manifest.json',json.dumps(x['m']))
 z.writestr('predictions/bank-a.json',x['bank'])
 z.writestr('quests/sample.json',json.dumps(x['quest']))
 z.writestr('quests/module-a.json',json.dumps({'id':'module-a','kind':'module'}))
 z.writestr('lessons/book/index.html','Lesson')
 z.writestr('assets/scene.jpg',b'image')
`, pkg, encoded], { encoding: 'utf8' });
  assert.equal(make.status, 0, make.stderr);
  function run(args, extra = {}) {
    return spawnSync('bash', [script, ...args], { encoding: 'utf8', env: { ...process.env, FF_REPO: ff, WARMERSUN_DIR: ws, CALL_LOG: log, PATH: `${bin}:${process.env.PATH}`, ...extra } });
  }
  for (const args of [[pkg, '--yes'], [pkg, '--yes', '--force']]) {
    const r = run(args);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Module wrappers are unsupported/);
    assert.equal(existsSync(log), false);
  }
  let r = run([pkg, '--dry-run', '--source', 'other']);
  assert.notEqual(r.status, 0);
  assert.equal(existsSync(log), false);
  const dest = path.join(root, 'plan');
  r = run([pkg, '--dry-run', '--force', '--plan-dir', dest]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(readFileSync(log, 'utf8'), /node .*--dry-run --force/);
  assert.doesNotMatch(readFileSync(log, 'utf8'), /helper/);
  const plan = JSON.parse(readFileSync(path.join(dest, 'plan.json')));
  assert.equal(plan.publishable, false);
  assert.equal(plan.packageRevision, m.revision);
  assert.deepEqual(plan.banks[0], { id: 'bank-a', sha256: hash, url: `https://warmersun.com/predictions/bank-a/${hash}.json` });
  assert.deepEqual(readFileSync(path.join(dest, 'predictions', 'bank-a', `${hash}.json`)), bank);
  const quest = JSON.parse(readFileSync(path.join(dest, 'quests/sample.json')));
  assert.deepEqual(quest, { id: 'sample', predictionBankId: 'bank-a', content: 'keep', predictionBankRef: { id: 'bank-a', sha256: hash } });
  assert.equal(JSON.parse(readFileSync(path.join(dest, 'quests/module-a.json'))).predictionBankRef, undefined);
  assert.deepEqual(plan.lessonFiles, ['lessons/book/index.html']);
  assert.deepEqual(plan.assetFiles, ['assets/scene.jpg']);
  assert.equal(readFileSync(path.join(dest, 'lessons/book/index.html'), 'utf8'), 'Lesson');
  r = run([pkg, '--dry-run', '--plan-dir', dest]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /must not exist/);
  const failDest = path.join(root, 'failed');
  r = run([pkg, '--dry-run', '--plan-dir', failDest], { STUB_NODE_EXIT: '1' });
  assert.notEqual(r.status, 0);
  assert.equal(existsSync(failDest), false);
  r = run([pkg, '--staging']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /sideload/);
});

test('v1 requires confirmation and routes to the existing helper', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'deploy-v1-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const ff = path.join(root, 'ff'), ws = path.join(root, 'ws'), log = path.join(root, 'called');
  mkdirSync(path.join(ff, 'scripts'), { recursive: true });
  mkdirSync(path.join(ws, 'scripts'), { recursive: true });
  writeFileSync(path.join(ff, 'scripts/quest-package.py'), 'print("verified")\n');
  writeFileSync(path.join(ws, 'scripts/gated-deploy-package.sh'), '#!/bin/sh\nprintf "%s\\n" "$@" > "$CALL_LOG"\n');
  chmodSync(path.join(ws, 'scripts/gated-deploy-package.sh'), 0o755);
  const pkg = path.join(root, 'v1.ffquest');
  const made = spawnSync('python3', ['-c', 'import json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],"w") as z: z.writestr("manifest.json",json.dumps({"id":"sample","version":1,"lessons":[],"files":{}}))', pkg]);
  assert.equal(made.status, 0);
  const run = (...args) => spawnSync('bash', [script, ...args], { encoding: 'utf8', env: { ...process.env, FF_REPO: ff, WARMERSUN_DIR: ws, CALL_LOG: log } });
  let r = run(pkg);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /requires --yes/);
  assert.equal(existsSync(log), false);
  r = run(pkg, '--yes', '--force', '--source', 'spotlights');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n').slice(1), ['--force', '--source', 'spotlights']);
});

test('v2 fails closed on missing live runtime marker before publication', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'deploy-v2-health-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const ff = path.join(root, 'ff'), ws = path.join(root, 'ws'), bin = path.join(root, 'bin'), log = path.join(root, 'log');
  for (const p of [path.join(ff, 'scripts'), path.join(ws, 'scripts'), bin]) mkdirSync(p, { recursive: true });
  writeFileSync(path.join(ff, 'scripts/quest-package.py'), `import sys,zipfile,pathlib,shutil
if sys.argv[1]=='unpack':
 d=pathlib.Path(sys.argv[3]); d.mkdir()
 with zipfile.ZipFile(sys.argv[2]) as z: z.extractall(d)
 shutil.copytree(d,d/'raw',ignore=shutil.ignore_patterns('raw'))
`);
  writeFileSync(path.join(ws, 'scripts/gated-deploy-package.sh'), '#!/bin/sh\nexit 99\n');
  chmodSync(path.join(ws, 'scripts/gated-deploy-package.sh'), 0o755);
  writeFileSync(path.join(bin, 'node'), '#!/bin/sh\nprintf "node %s\\n" "$*" >> "$CALL_LOG"\n');
  chmodSync(path.join(bin, 'node'), 0o755);
  writeFileSync(path.join(bin, 'sitecustomize.py'), `import io,urllib.request,os,json,pathlib
def fetch(req,timeout=0):
 url=req.full_url if hasattr(req,'full_url') else req
 if 'api/health?' in url:
  return io.BytesIO(json.dumps({'ok':True,'service':'portal','features':{'looseQuestV2':os.environ.get('READY')=='1'}}).encode())
 if not hasattr(req,'get_header') or req.get_header('User-agent') != 'FutureForge-Quest-Deploy/1.0':
  raise RuntimeError('verification request missing deploy user agent')
 with open(os.environ['CALL_LOG'],'a') as f: f.write('http\\n')
 if os.environ.get('BAD_HTTP'): return io.BytesIO(b'wrong')
 return open(pathlib.Path(os.environ['PUBLIC']) / url.split('warmersun.com/')[1], 'rb')
urllib.request.urlopen=fetch
`);
  writeFileSync(path.join(ws, 'scripts/herenow-sites.json'), '{}');
  writeFileSync(path.join(ws, 'scripts/publish-live-patch.py'), `import os,pathlib,shutil
API='stub'
def load_key(): return 'stub'
def site_for_repo_path(cfg,rel):
 name=rel.split('/')[0]; return {'name':name,'slug':name},rel.split('/',1)[1]
def api(key,method,url):
 with open(os.environ['CALL_LOG'],'a') as f: f.write('manifest\\n')
 if os.environ.get('COLLISION'): return {'manifest':[{'path':os.environ['COLLISION'],'hash':'bad'}]}
 return {'manifest':[]}
def patch_site(key,site,files):
 with open(os.environ['CALL_LOG'],'a') as f: f.write('patch:'+site['name']+'\\n')
 for rel,src in files.items():
  dest=pathlib.Path(os.environ['PUBLIC'])/site['name']/rel
  dest.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(src,dest)
 return 0
`);
  const pkg = path.join(root, 'q.ffquest');
  const made = spawnSync('python3', ['-c', `import sys,zipfile,json
m={'id':'sample','version':2,'revision':'sha256:'+'a'*64,'quests':[{'id':'sample','file':'quests/sample.json','kind':'quest'}],'predictions':[{'id':'bank-a','file':'predictions/bank-a.json'}],'lessons':[]}
with zipfile.ZipFile(sys.argv[1],'w') as z:
 z.writestr('manifest.json',json.dumps(m)); z.writestr('quests/sample.json',json.dumps({'id':'sample','predictionBankId':'bank-a'})); z.writestr('predictions/bank-a.json','{"id":"bank-a"}'); z.writestr('lessons/book/index.html','lesson'); z.writestr('assets/scene.jpg','image')
`, pkg]);
  assert.equal(made.status, 0);
  const env = { ...process.env, FF_REPO: ff, WARMERSUN_DIR: ws, CALL_LOG: log, PUBLIC: path.join(root, 'public'), PATH: `${bin}:${process.env.PATH}`, PYTHONPATH: bin };
  const r = spawnSync('bash', [script, pkg, '--yes'], { encoding: 'utf8', env });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /readiness/);
  assert.equal(readFileSync(log, 'utf8').trim().split('\n').length, 2);
  assert.equal(existsSync(path.join(ws, 'prediction-banks')), false);
  rmSync(log);
  const collision = spawnSync('bash', [script, pkg, '--yes'], { encoding: 'utf8', env: { ...env, READY: '1', COLLISION: 'book/index.html' } });
  assert.notEqual(collision.status, 0); assert.match(collision.stderr, /live collision/);
  assert.equal(existsSync(path.join(ws, 'prediction-banks')), false);
  rmSync(log);
  const bad = spawnSync('bash', [script, pkg, '--yes'], { encoding: 'utf8', env: { ...env, READY: '1', BAD_HTTP: '1' } });
  assert.notEqual(bad.status, 0); assert.match(bad.stderr, /HTTP verification failed/);
  assert.equal(readFileSync(log, 'utf8').split('\n').filter(line => /publish-loose-quests/.test(line)).length, 1);
  rmSync(log);
  const success = spawnSync('bash', [script, pkg, '--yes'], { encoding: 'utf8', env: { ...env, READY: '1' } });
  assert.equal(success.status, 0, success.stderr);
  const entries = readFileSync(log, 'utf8').trim().split('\n');
  assert.match(entries[0], /publish-quest-package/); assert.match(entries[1], /publish-loose-quests.*--dry-run/); assert.match(entries[2], /input-type/);
  assert.deepEqual(entries.slice(3, 9), ['manifest', 'manifest', 'manifest', 'patch:predictions', 'patch:lessons', 'patch:quests']);
  assert.deepEqual(entries.slice(9, 12), ['http', 'http', 'http']);
  assert.match(entries[12], /publish-loose-quests/);
  const digest = createHash('sha256').update('{"id":"bank-a"}').digest('hex');
  assert.equal(readFileSync(path.join(ws, 'prediction-banks/bank-a', `${digest}.json`), 'utf8'), '{"id":"bank-a"}');
  assert.equal(readFileSync(path.join(ws, 'lesson-src/book/index.html'), 'utf8'), 'lesson');
  assert.equal(readFileSync(path.join(ws, 'future-forge/quests/assets/sample', 'a'.repeat(64), 'scene.jpg'), 'utf8'), 'image');
  assert.equal(existsSync(path.join(root, 'public/quests/sample.json')), false);
});
