import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHostedPackageResolver } from '../js/server/hosted-package-resolver.mjs';
import { resolveRunPackageBinding, resolveStartPackageBinding } from '../js/server/run-package-binding.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = b => createHash('sha256').update(b).digest('hex');

test('real v2 archive projects and restores its pinned public bank offline', async t => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'ff-split-v2-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const example = path.join(tmp, 'example');
  const build = spawnSync(process.execPath, [path.join(root, 'scripts/build-companion-dock-example.mjs'), example], { encoding: 'utf8', cwd: root });
  assert.equal(build.status, 0, build.stderr);
  const archive = path.join(example, 'companion-moonshots-304.ffquest');
  const output = path.join(tmp, 'plan');
  const prep = spawnSync('bash', [path.join(root, 'deploy-quest.sh'), archive, '--dry-run', '--force', '--plan-dir', output], { encoding: 'utf8', cwd: root });
  assert.equal(prep.status, 0, prep.stderr);
  const dryPublish = spawnSync(process.execPath, [path.join(root, 'scripts/publish-loose-quests.mjs'), output, '--dry-run'], { encoding: 'utf8', cwd: root });
  assert.equal(dryPublish.status, 0, dryPublish.stderr);
  const plan = JSON.parse(readFileSync(path.join(output, 'plan.json'), 'utf8'));
  assert.equal(plan.quests.length, 1);
  const quest = readFileSync(path.join(output, plan.quests[0].file));
  const bankRef = plan.quests[0].predictionBankRef;
  const bank = readFileSync(path.join(output, 'predictions', bankRef.id, `${bankRef.sha256}.json`));
  assert.equal(hash(bank), bankRef.sha256);
  const ref = { packageId: 'loose-quest', questId: plan.quests[0].id, revision: `sha256:${hash(quest)}` };
  const catalog = { ok: true, quests: [{ id: ref.questId, storage: 'loose-v2', access: 'open', packageRef: ref }] };
  const resolver = createHostedPackageResolver({
    loadCatalog: async () => catalog,
    readBytes: async key => { assert.equal(key, `loose-quests/${ref.questId}/${hash(quest)}.json`); return quest; },
    readBank: async request => { assert.deepEqual(request, bankRef); return bank; },
  });
  const resolvePackage = request => resolver.resolve(request);
  const start = await resolveStartPackageBinding({ questId: ref.questId }, { loadCatalog: async () => catalog, resolvePackage });
  assert.equal(start.ok, true, JSON.stringify(start));
  assert.deepEqual(start.packageRef, ref);
  const saved = await resolveRunPackageBinding({ runId: '11111111-1111-4111-8111-111111111111', questId: ref.questId, play: {} }, {
    userId: 'offline-test', loadRun: async () => ({ quest_id: ref.questId, packageRef: ref }), resolvePackage,
  });
  assert.equal(saved.ok, true, JSON.stringify(saved));
  assert.equal(saved.state.play.mission.runWorld.bank.id, bankRef.id);
});
