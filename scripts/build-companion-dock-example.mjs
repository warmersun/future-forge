#!/usr/bin/env node
/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/** Build the worked v2 example from existing source/bank fixtures, without changing their claims. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = process.argv[2] ? path.resolve(process.argv[2]) : fs.mkdtempSync(path.join(os.tmpdir(), 'ff-dock-example-'));
const source = path.join(output, 'source');
const quest = JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures/quests/companion-moonshots-304.json')));
const bank = JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures/predictions/companion-dock-test.json')));
quest.predictionBankId = bank.id;
fs.mkdirSync(path.join(source, 'quests'), { recursive: true });
fs.mkdirSync(path.join(source, 'predictions'), { recursive: true });
fs.writeFileSync(path.join(source, 'quests', `${quest.id}.json`), `${JSON.stringify(quest, null, 2)}\n`);
fs.writeFileSync(path.join(source, 'predictions', `${bank.id}.json`), `${JSON.stringify(bank, null, 2)}\n`);
const archive = path.join(output, `${quest.id}.ffquest`);
for (const args of [['pack', source, '-o', archive], ['verify', archive]]) {
  const result = spawnSync('python3', [path.join(root, 'scripts/quest-package.py'), ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Example archive: ${archive}`);
console.log('The predictions are synthetic test assumptions, not forecasts or source-speaker claims.');
console.log(`Preview: ./scripts/sideload-local-package.sh ${JSON.stringify(archive)}`);
console.log(`Offline publication gates: npm run publish:quest-package -- ${JSON.stringify(archive)} --dry-run`);
