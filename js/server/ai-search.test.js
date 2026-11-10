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

/**
 * Optional live web + X search flag and mode gating.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAiSearchEnabled,
  searchToolsForMode,
  SEARCH_TOOLS,
  SEARCH_MAX_OUTPUT_TOKENS,
  SEARCH_SYSTEM_LINE,
  SEARCH_FACT_CHECK_LINE,
  searchSystemLineForMode,
  AI_SEARCH_MODES,
} from "./ai-search.mjs";

describe("resolveAiSearchEnabled", () => {
  it("defaults to off", () => {
    assert.equal(resolveAiSearchEnabled([], {}), false);
    assert.equal(resolveAiSearchEnabled([], { FF_AI_SEARCH: "" }), false);
  });

  it("enables with --ai-search or --search CLI flag", () => {
    assert.equal(resolveAiSearchEnabled(["--ai-search"], {}), true);
    assert.equal(resolveAiSearchEnabled(["--search"], {}), true);
  });

  it("--no-ai-search wins over env and --ai-search", () => {
    assert.equal(
      resolveAiSearchEnabled(["--ai-search", "--no-ai-search"], {
        FF_AI_SEARCH: "1",
      }),
      false
    );
    assert.equal(
      resolveAiSearchEnabled(["--no-search"], { FF_AI_SEARCH: "1" }),
      false
    );
  });

  it("enables with FF_AI_SEARCH=1 when no CLI", () => {
    assert.equal(resolveAiSearchEnabled([], { FF_AI_SEARCH: "1" }), true);
    assert.equal(resolveAiSearchEnabled([], { FF_AI_SEARCH: "true" }), true);
    assert.equal(resolveAiSearchEnabled([], { FF_AI_SEARCH: "on" }), true);
    assert.equal(resolveAiSearchEnabled([], { FF_AI_SEARCH: "0" }), false);
    assert.equal(resolveAiSearchEnabled([], { FF_AI_SEARCH: "off" }), false);
  });
});

describe("searchToolsForMode", () => {
  it("returns null when search is off", () => {
    assert.equal(searchToolsForMode("assess-feasibility", false), null);
    assert.equal(searchToolsForMode("idea-sparks", false), null);
    assert.equal(searchToolsForMode("chat", true), null);
  });

  it("returns web_search and x_search for assess, idea-sparks, and fact-check", () => {
    assert.deepEqual(searchToolsForMode("assess-feasibility", true), SEARCH_TOOLS);
    assert.deepEqual(searchToolsForMode("idea-sparks", true), SEARCH_TOOLS);
    assert.deepEqual(searchToolsForMode("fact-check-argument", true), SEARCH_TOOLS);
    assert.equal(searchToolsForMode("score-pathway", true), null);
    assert.equal(searchToolsForMode("pose-challenge", true), null);
    assert.equal(searchToolsForMode("chat", true), null);
    assert.ok(AI_SEARCH_MODES.has("assess-feasibility"));
    assert.ok(AI_SEARCH_MODES.has("idea-sparks"));
    assert.ok(AI_SEARCH_MODES.has("fact-check-argument"));
    assert.equal(SEARCH_TOOLS.length, 2);
    assert.equal(SEARCH_TOOLS[0].type, "web_search");
    assert.equal(SEARCH_TOOLS[1].type, "x_search");
    assert.equal(searchSystemLineForMode("fact-check-argument"), SEARCH_FACT_CHECK_LINE);
    assert.doesNotMatch(SEARCH_FACT_CHECK_LINE, /worldClock|grounding/);
    assert.match(SEARCH_FACT_CHECK_LINE, /search results are the whole check/);
    assert.doesNotMatch(SEARCH_FACT_CHECK_LINE, /score green/);
    assert.equal(searchSystemLineForMode("assess-feasibility"), SEARCH_SYSTEM_LINE);
  });

  it("raises token budget for search modes", () => {
    assert.equal(SEARCH_MAX_OUTPUT_TOKENS["assess-feasibility"], 600);
    assert.equal(SEARCH_MAX_OUTPUT_TOKENS["idea-sparks"], 900);
    assert.equal(SEARCH_MAX_OUTPUT_TOKENS["fact-check-argument"], 500);
    assert.match(SEARCH_SYSTEM_LINE, /web_search/);
    assert.match(SEARCH_SYSTEM_LINE, /x_search/);
    assert.match(SEARCH_SYSTEM_LINE, /score green/);
    assert.match(SEARCH_SYSTEM_LINE, /do not let smaller grounding examples/i);
  });
});
