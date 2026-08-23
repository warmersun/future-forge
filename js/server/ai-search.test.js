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

  it("returns web_search and x_search only for assess and idea-sparks", () => {
    assert.deepEqual(searchToolsForMode("assess-feasibility", true), SEARCH_TOOLS);
    assert.deepEqual(searchToolsForMode("idea-sparks", true), SEARCH_TOOLS);
    assert.equal(searchToolsForMode("score-pathway", true), null);
    assert.equal(searchToolsForMode("pose-challenge", true), null);
    assert.equal(searchToolsForMode("chat", true), null);
    assert.ok(AI_SEARCH_MODES.has("assess-feasibility"));
    assert.ok(AI_SEARCH_MODES.has("idea-sparks"));
    assert.equal(SEARCH_TOOLS.length, 2);
    assert.equal(SEARCH_TOOLS[0].type, "web_search");
    assert.equal(SEARCH_TOOLS[1].type, "x_search");
  });

  it("raises token budget for search modes", () => {
    assert.equal(SEARCH_MAX_OUTPUT_TOKENS["assess-feasibility"], 400);
    assert.equal(SEARCH_MAX_OUTPUT_TOKENS["idea-sparks"], 900);
    assert.match(SEARCH_SYSTEM_LINE, /web_search/);
    assert.match(SEARCH_SYSTEM_LINE, /x_search/);
    assert.match(SEARCH_SYSTEM_LINE, /score green/);
    assert.match(SEARCH_SYSTEM_LINE, /do not let smaller grounding examples/i);
  });
});
