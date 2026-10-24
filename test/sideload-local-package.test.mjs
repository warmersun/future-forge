import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
it('sideload preserves an explicit v1 developer bank and isolates v2 without starting a server', () => {
  const scratch = process.env.TMPDIR || path.join(process.env.HOME, '.hermes/cache/scratch');
  fs.mkdirSync(scratch, { recursive: true });
  const dir = fs.mkdtempSync(path.join(scratch, 'sideload-test-'));
  try {
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    const python = spawnSync('which', ['python3'], { encoding: 'utf8' }).stdout.trim();
    // Stub only unpacking: exercise the real script's manifest/environment logic.
    fs.writeFileSync(path.join(bin, 'python3'), `#!/usr/bin/env bash\nif [[ "$2" == "unpack" ]]; then\n dest="$4"\n if [[ "$TEST_VERSION" == "2" ]]; then dest="$dest/raw"; fi\n mkdir -p "$dest/quests"\n printf '{"version":%s}' "$TEST_VERSION" > "$dest/manifest.json"\nelse\n exec ${JSON.stringify(python)} "$@"\nfi\n`, { mode: 0o755 });
    fs.writeFileSync(path.join(bin, 'node'), '#!/usr/bin/env bash\nprintf "BANK=%s\\nPACKAGES=%s\\nARGS=%s\\n" "${FF_PREDICTIONS_FILE-unset}" "${FF_QUEST_PACKAGES_DIR-unset}" "$*"\n', { mode: 0o755 });
    const pkg = path.join(dir, 'test.ffquest');
    fs.writeFileSync(pkg, 'unpack stub fixture');
    for (const version of ['1', '2']) {
      const result = spawnSync('bash', [path.join(root, 'scripts/sideload-local-package.sh'), pkg], { encoding: 'utf8', env: { ...process.env, TMPDIR: dir, PATH: `${bin}:${process.env.PATH}`, TEST_VERSION: version, FF_PREDICTIONS_FILE: '/developer/intentional-bank.json', FF_QUEST_PACKAGES_DIR: '/stale/packages' } });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, version === '1' ? /BANK=\/developer\/intentional-bank.json/ : /BANK=unset/);
      assert.match(result.stdout, version === '1' ? /PACKAGES=unset/ : /PACKAGES=.*ffquest\./);
      assert.match(result.stdout, /ARGS=server.mjs --developer --ai-search/);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
