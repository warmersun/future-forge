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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  promptCompactEnabled,
  isConversationalPromptMode,
  composeConversationSystem,
  conversationUserSuffix,
  compactConversationPayload,
} from "./coinvent-conversation-prompt.mjs";
import { WORLD_CLOCK_CONTEXT_LINE } from "./fast-eval.mjs";

describe("conversational prompt composer", () => {
  it("stays off unless FF_CO_INVENT_PROMPT_COMPACT=1", () => {
    assert.equal(promptCompactEnabled({}), false);
    assert.equal(promptCompactEnabled({ FF_CO_INVENT_PROMPT_COMPACT: "1" }), true);
    assert.equal(isConversationalPromptMode("chat"), true);
    assert.equal(isConversationalPromptMode("score-pathway"), false);
    assert.equal(isConversationalPromptMode("generate-scenarios"), false);
    assert.equal(isConversationalPromptMode("judge-challenge"), false);
  });

  it("keeps grounding, learner-request, and tutor-exit rules", () => {
    const tutor = composeConversationSystem({ mode: "chat", tutor: true, hexInvent: true });
    assert.match(tutor, /explicit request/i);
    assert.match(tutor, /endTutoring/);
    assert.match(tutor, /authoritative source of truth/);
    assert.match(tutor, /not an invent/);
    assert.match(tutor, /plain words/);
    assert.doesNotMatch(tutor, /4–8 sentences/);
    assert.match(conversationUserSuffix({ tutor: true }), /explicit request/);
    assert.doesNotMatch(conversationUserSuffix({ tutor: true }), /4–8/);
    const chat = composeConversationSystem({ mode: "sit", tutor: false });
    assert.match(chat, /Subtraction/);
    assert.match(chat, /leave proposals empty/i);
    assert.match(tutor, /ILLUSTRATIONS/);
    assert.match(tutor, /optional matching illustration/);
    assert.match(tutor, /long version/);
    assert.match(tutor, /not the explanation/);
    assert.match(tutor, /no new URL/);
    assert.match(tutor, /javascript\/data/);
    assert.match(tutor, /one reading link per turn/);
    assert.doesNotMatch(tutor, /WORLD_CLOCK_TIMING_LINE/);
    assert.doesNotMatch(tutor, /do not score a claim/);
  });

  it("includes the world-clock line only when the caller passes it", () => {
    const teaching = `${WORLD_CLOCK_CONTEXT_LINE} When teaching trends and predictions, use due rows as what is real now and not_yet rows as labeled forecasts.`;
    const tutor = composeConversationSystem({ mode: "chat", tutor: true, worldClockLine: teaching });
    assert.match(tutor, /not_yet/);
    assert.match(tutor, /already due/);
    const plain = composeConversationSystem({ mode: "chat", tutor: false });
    assert.doesNotMatch(plain, /already due/);
    const chat = composeConversationSystem({
      mode: "chat",
      tutor: false,
      worldClockLine: WORLD_CLOCK_CONTEXT_LINE,
    });
    assert.match(chat, /already due/);
    assert.doesNotMatch(chat, /For assess-feasibility/);
  });

  it("passes the world-clock line from both compact call sites", () => {
    for (const rel of ["../../server.mjs", "../../portal/server.mjs"]) {
      const src = readFileSync(new URL(rel, import.meta.url), "utf8");
      const at = src.indexOf("composeConversationSystem({");
      assert.ok(at > 0, rel);
      const block = src.slice(at, src.indexOf("});", at));
      assert.match(block, /worldClockLine:/);
      assert.match(block, /WORLD_CLOCK_CONTEXT_LINE/);
      assert.match(block, /not_yet rows as labeled forecasts/);
      assert.doesNotMatch(block, /WORLD_CLOCK_TIMING_LINE/);
    }
  });

  it("drops scoring and scenario fields without dropping technology ids", () => {
    const compact = compactConversationPayload({
      availableTechs: [{ id: "solar", summary: "panels" }],
      selectedTechIds: ["solar"],
      stackCapability: { solar: { summary: "duplicate" } },
      crisisRoles: ["local"],
      scenarioCount: 4,
      challengeSpeech: "attack",
      grounding: { chain: "keep" },
      messages: [{ role: "user", content: "how does this work?" }],
    });
    assert.deepEqual(compact.selectedTechIds, ["solar"]);
    assert.equal(compact.availableTechs[0].id, "solar");
    assert.equal(compact.stackCapability, undefined);
    assert.equal(compact.crisisRoles, undefined);
    assert.equal(compact.scenarioCount, undefined);
    assert.equal(compact.challengeSpeech, undefined);
    assert.equal(compact.grounding.chain, "keep");
    assert.equal(compact.messages[0].content, "how does this work?");
  });
});
