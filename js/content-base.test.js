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

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  resolveContentBaseUrl,
  contentCatalogUrl,
  stagingBaseFromArg,
} from "./content-base.mjs";
import { resolveQuestsRemoteUrl, resolveQuestsRemoteUrlCandidates } from "./quests-remote.mjs";
import { resolveTrendsRemoteUrl } from "./trends-remote.mjs";

const TOKEN = "20261008-113941-f1ab7c98-solved-today";
const BASE = `https://warmersun.com/staging/${TOKEN}/`;
const KEYS = ["FF_CONTENT_BASE_URL", "FF_QUESTS_REMOTE_URL", "FF_TRENDS_REMOTE_URL"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("content-base", () => {
  it("stagingBaseFromArg accepts a bare token or a staging URL", () => {
    assert.equal(stagingBaseFromArg(TOKEN), BASE);
    assert.equal(stagingBaseFromArg(BASE), BASE);
    assert.equal(stagingBaseFromArg(BASE.slice(0, -1)), BASE);
    assert.equal(stagingBaseFromArg(`${BASE}index.html`), BASE);
    assert.equal(stagingBaseFromArg(`${BASE}quests/catalog.json`), BASE);
    assert.equal(stagingBaseFromArg(`${BASE}quests/`), BASE);
    assert.throws(() => stagingBaseFromArg(""), /missing/);
    assert.throws(() => stagingBaseFromArg("../etc"), /not a staging token/);
  });

  it("resolveContentBaseUrl is off unless set", () => {
    assert.equal(resolveContentBaseUrl({}), null);
    assert.equal(resolveContentBaseUrl({ FF_CONTENT_BASE_URL: "off" }), null);
    assert.equal(resolveContentBaseUrl({ FF_CONTENT_BASE_URL: BASE.slice(0, -1) }), BASE);
    assert.equal(contentCatalogUrl(BASE, "quests"), `${BASE}quests/catalog.json`);
  });

  it("one base drives quests and trends; specific env still wins", () => {
    delete process.env.FF_QUESTS_REMOTE_URL;
    delete process.env.FF_TRENDS_REMOTE_URL;
    process.env.FF_CONTENT_BASE_URL = BASE;
    assert.equal(resolveQuestsRemoteUrl(), `${BASE}quests/catalog.json`);
    assert.equal(resolveTrendsRemoteUrl(), `${BASE}trends/catalog.json`);
    // No silent fallback to live while on a content base
    assert.deepEqual(resolveQuestsRemoteUrlCandidates(), [`${BASE}quests/catalog.json`]);
    process.env.FF_TRENDS_REMOTE_URL = "https://warmersun.com/trends/catalog.json";
    assert.equal(resolveTrendsRemoteUrl(), "https://warmersun.com/trends/catalog.json");
  });
});
