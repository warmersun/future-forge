/**
 * Shared voice-call decisions. DOM-free so the panel, the proxy, and tests agree.
 * Fingerprint fields are the ones the spoken prompt actually reads.
 */

export const VOICE_HISTORY_CAP = 24;

/** Hangup lives on the workshop compose bar. Any other screen hides it. */
export function screenShowsVoiceHangup(screenId) {
  return String(screenId || "") === "workshop";
}

/**
 * Hang up when the visible screen changes to one that hides the workshop waveform.
 * Staying on challenge or deploy must not drop a call whose button is already there.
 * @param {string|null|undefined} prevScreenId
 * @param {string|null|undefined} nextScreenId resolved screen, after challenge/deploy remap
 */
export function voiceHangsUpOnScreenChange(prevScreenId, nextScreenId) {
  const prev = String(prevScreenId || "");
  const next = String(nextScreenId || "");
  if (prev === next) return false;
  return !screenShowsVoiceHangup(next);
}

/**
 * A live call belongs to one lane. Tutoring ↔ co-inventing waits until hangup.
 * The same lane, and an idle call, do not block.
 * @param {boolean} live
 * @param {string} fromLane
 * @param {string} toLane
 */
export function voiceBlocksModeSwitch(live, fromLane, toLane) {
  if (!live) return false;
  return String(fromLane || "") !== String(toLane || "");
}

export function emptyVoiceProposals() {
  return {
    addTechIds: [],
    removeTechIds: [],
    inventionName: null,
    inventionHow: null,
    inventionImpact: null,
    scrutiny: null,
  };
}

export function hasVoiceProposal(p) {
  return Boolean(
    p?.addTechIds?.length ||
      p?.removeTechIds?.length ||
      p?.inventionName ||
      p?.inventionHow ||
      p?.inventionImpact ||
      p?.scrutiny
  );
}

function unionIds(a, b) {
  const out = [];
  const seen = new Set();
  for (const id of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const s = String(id || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= 4) break;
  }
  return out;
}

function filled(v) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

/** Latest non-empty text field wins. Tech ids accumulate, first-seen order, cap 4. */
export function mergeVoiceProposals(a, b) {
  const left = a && typeof a === "object" ? a : emptyVoiceProposals();
  const right = b && typeof b === "object" ? b : emptyVoiceProposals();
  const pick = (key) => (filled(right[key]) ? right[key] : (left[key] ?? null));
  return {
    addTechIds: unionIds(left.addTechIds, right.addTechIds),
    removeTechIds: unionIds(left.removeTechIds, right.removeTechIds),
    inventionName: pick("inventionName"),
    inventionHow: pick("inventionHow"),
    inventionImpact: pick("inventionImpact"),
    scrutiny: pick("scrutiny"),
  };
}

function mergeVoicePacket(prev, next) {
  const parts = [];
  for (const raw of [prev?.message, next?.message]) {
    const text = String(raw || "").trim();
    if (text && !parts.includes(text)) parts.push(text);
  }
  return {
    proposals: mergeVoiceProposals(prev?.proposals, next?.proposals),
    message: parts.join(" "),
    endTutoring: Boolean(prev?.endTutoring || next?.endTutoring),
  };
}

/**
 * Stable across key order. Unchanged board → same string → no session.update.
 * @param {object|null|undefined} context
 */
export function voiceContextFingerprint(context) {
  const c = context && typeof context === "object" ? context : {};
  const selected = Array.isArray(c.selectedTechIds)
    ? c.selectedTechIds.map((x) => String(x || "").trim()).filter(Boolean).join(",")
    : "";
  const available = Array.isArray(c.availableTechs)
    ? c.availableTechs
        .map((t) => (t && typeof t === "object" ? String(t.id || "").trim() : ""))
        .filter(Boolean)
        .join(",")
    : "";
  let how = "";
  let pathwayIds = "";
  if (c.hexInvent) {
    const paths = Array.isArray(c.hexBoard?.pathways) ? c.hexBoard.pathways : [];
    how = paths.map((p) => String(p?.howText || "").trim()).join("\n");
    pathwayIds = paths
      .map((p) =>
        (Array.isArray(p?.inventionIds) ? p.inventionIds : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean)
          .join(",")
      )
      .join("|");
  } else {
    how = String(c.inventionHow || "").trim();
  }
  const name = c.hexInvent ? "" : String(c.inventionName || "").trim();
  let pressure = "";
  if (Array.isArray(c.pressure)) {
    pressure = c.pressure
      .map((p) => {
        const label = String(p?.label || p?.name || p?.id || "").trim();
        return label ? `${label}:${Number(p?.level) || 0}` : "";
      })
      .filter(Boolean)
      .join(",");
  } else if (c.pressure && typeof c.pressure === "object") {
    pressure = Object.keys(c.pressure)
      .sort()
      .map((k) => `${k}:${Number(c.pressure[k]) || 0}`)
      .join(",");
  }
  const life = c.hexInvent ? "" : String(c.inventionImpact || "").trim();
  const title = String(c.challenge?.title || "").trim();
  const problem = String(c.challenge?.problem || "").trim();
  return [
    c.year ?? "",
    c.turn ?? "",
    String(c.place || "").trim(),
    c.hexInvent ? "1" : "0",
    c.tutorMode ? "1" : "0",
    selected,
    available,
    how,
    life,
    name,
    pathwayIds,
    pressure,
    title,
    problem,
    String(c.focusTechId || "").trim(),
    String(c.spotlightTechId || "").trim(),
    String(c.guidance || "").trim(),
    String(c.aiTutorContext || "").trim(),
    c.metricsPending ? "1" : "0",
  ].join("\u0001");
}

/**
 * Pending meters should reach the proxy without the usual 1s debounce.
 * First send after connect still waits.
 * @param {string} sentFp
 * @param {{ metricsPending?: boolean }|null|undefined} sentContext
 * @param {{ metricsPending?: boolean }|null|undefined} nextContext
 */
export function shouldFlushVoiceContextNow(sentFp, sentContext, nextContext) {
  if (!sentFp) return false;
  return Boolean(nextContext?.metricsPending) !== Boolean(sentContext?.metricsPending);
}

/**
 * How a new invent snapshot meets a live call.
 * "drop" cancels a queued send when the live board matches what we already sent,
 * so a timing-settle paint cannot emit settled meters after scoring starts again.
 * "now" skips the debounce when pending meters flip versus the snapshot that
 * would otherwise go out (the queued one, otherwise the last sent one).
 * @param {{
 *   sentFp?: string,
 *   pendingFp?: string,
 *   nextFp?: string,
 *   sentMetricsPending?: boolean,
 *   pendingMetricsPending?: boolean,
 *   nextMetricsPending?: boolean,
 * }} state
 * @returns {"drop"|"now"|"debounce"}
 */
export function planVoiceContextFlush(state = {}) {
  const sentFp = String(state.sentFp || "");
  const nextFp = String(state.nextFp || "");
  if (nextFp === sentFp) return "drop";
  const baselinePending = state.pendingFp
    ? state.pendingMetricsPending
    : state.sentMetricsPending;
  if (
    shouldFlushVoiceContextNow(
      sentFp,
      { metricsPending: baselinePending },
      { metricsPending: state.nextMetricsPending }
    )
  ) {
    return "now";
  }
  return "debounce";
}

/**
 * xAI sends growing user transcripts on `…transcription.completed` with
 * `status: "in_progress"`, then one `status: "completed"`. A missing status
 * is the older single-final payload and still counts as final.
 * @param {{ status?: string }|null|undefined} event
 */
export function userTranscriptIsFinal(event) {
  const status = String(event?.status || "").trim().toLowerCase();
  if (status === "in_progress") return false;
  return true;
}

/**
 * Commit one spoken user line. The same item is one bubble, rewritten in
 * place even after the co-inventor has replied. Identical text dedupes only
 * when the transcript has no item id.
 * @param {object[]} messages
 * @param {{ text?: string, itemId?: string }} caption
 */
export function commitUserVoiceCaption(messages, caption = {}) {
  const list = Array.isArray(messages) ? messages.slice() : [];
  const content = String(caption.text || "").trim();
  if (!content) return { messages: list, changed: false };
  const itemId = String(caption.itemId || "").trim();
  if (itemId) {
    for (let i = list.length - 1; i >= 0; i--) {
      const msg = list[i];
      if (!(msg?.role === "user" && msg.voice && msg.itemId === itemId)) continue;
      if (msg.content === content) return { messages: list, changed: false };
      list[i] = { ...msg, content };
      return { messages: list, changed: true };
    }
  } else {
    const last = list[list.length - 1];
    if (last?.role === "user" && last.content === content) {
      return { messages: list, changed: false };
    }
  }
  const msg = { role: "user", content, voice: true };
  if (itemId) msg.itemId = itemId;
  list.push(msg);
  return { messages: list, changed: true };
}

/**
 * Fold a tool proposal into the spoken assistant turn.
 * A caption and a tool result become one bubble. end_tutoring with no draft
 * leaves the transcript alone.
 *
 * @param {{ messages: object[], captionIndex: number|null, pending: object|null }} state
 * @param {{ type: string, text?: string, proposals?: object, message?: string, endTutoring?: boolean }} event
 */
export function reduceVoiceTranscript(state, event) {
  const messages = state.messages.slice();
  let captionIndex = state.captionIndex ?? null;
  let pending = state.pending ?? null;
  const type = String(event?.type || "");

  if (type === "caption_final") {
    const text = String(event.text || "").trim();
    if (!text && !pending) {
      return { messages, captionIndex, pending, changed: false };
    }
    const folded = pending;
    messages.push({
      role: "assistant",
      content: text || String(folded?.message || "").trim() || "A draft you can apply:",
      proposals: folded?.proposals || emptyVoiceProposals(),
      teaching: [],
      voice: true,
      endTutoring: Boolean(folded?.endTutoring),
    });
    return {
      messages,
      captionIndex: messages.length - 1,
      pending: null,
      changed: true,
    };
  }

  if (type === "proposals") {
    const proposals = event.proposals || emptyVoiceProposals();
    const text = String(event.message || "").trim();
    if (!hasVoiceProposal(proposals) && !text) {
      return { messages, captionIndex, pending, changed: false };
    }
    const packet = {
      proposals,
      message: text,
      endTutoring: Boolean(event.endTutoring),
    };
    if (captionIndex != null && messages[captionIndex]?.role === "assistant") {
      const prev = messages[captionIndex];
      const merged = mergeVoicePacket(
        { proposals: prev.proposals, message: "", endTutoring: prev.endTutoring },
        packet
      );
      messages[captionIndex] = {
        ...prev,
        proposals: merged.proposals,
        endTutoring: merged.endTutoring,
      };
      return { messages, captionIndex, pending: null, changed: true };
    }
    return {
      messages,
      captionIndex,
      pending: mergeVoicePacket(pending, packet),
      changed: false,
    };
  }

  if (type === "turn_done") {
    // Keep captionIndex so a proposal that arrives after the learner barges in
    // still folds into this spoken bubble. The next assistant speech clears it.
    if (!pending) return { messages, captionIndex, pending: null, changed: false };
    const text = String(pending.message || "").trim();
    if (!hasVoiceProposal(pending.proposals) && !text) {
      return { messages, captionIndex, pending: null, changed: false };
    }
    messages.push({
      role: "assistant",
      content: text || "A draft you can apply:",
      proposals: pending.proposals || emptyVoiceProposals(),
      teaching: [],
      voice: true,
      endTutoring: Boolean(pending.endTutoring),
    });
    return {
      messages,
      captionIndex: messages.length - 1,
      pending: null,
      changed: true,
    };
  }

  return { messages, captionIndex, pending, changed: false };
}

/**
 * Close an open spoken turn. A partial caption becomes the bubble, and any
 * tool packet waiting on that caption is folded in. The bubble stays the
 * merge target for a late proposal.
 * @param {{ messages?: object[], captionIndex?: number|null, pending?: object|null, asstCaption?: string }} state
 */
export function settleVoiceTurn(state = {}) {
  let cursor = {
    messages: Array.isArray(state.messages) ? state.messages.slice() : [],
    captionIndex: state.captionIndex ?? null,
    pending: state.pending ?? null,
  };
  let changed = false;
  const asst = String(state.asstCaption || "").trim();
  if (asst) {
    const capped = reduceVoiceTranscript(cursor, { type: "caption_final", text: asst });
    cursor = capped;
    changed = changed || capped.changed;
  } else if (cursor.pending && cursor.captionIndex != null) {
    const folded = reduceVoiceTranscript(cursor, {
      type: "proposals",
      proposals: cursor.pending.proposals,
      message: cursor.pending.message,
      endTutoring: cursor.pending.endTutoring,
    });
    cursor = folded;
    changed = changed || folded.changed;
  }
  const done = reduceVoiceTranscript(cursor, { type: "turn_done" });
  return {
    messages: done.messages,
    captionIndex: done.captionIndex,
    pending: done.pending,
    asstCaption: "",
    changed: changed || done.changed,
  };
}

/**
 * First delta of a new reply. Drops the previous bubble as the merge target
 * once speech for the new reply has started.
 * @param {{ captionIndex?: number|null, asstCaption?: string }} state
 * @returns {number|null}
 */
export function beginAssistantSpeech(state = {}) {
  if (!String(state.asstCaption || "") && state.captionIndex != null) return null;
  return state.captionIndex ?? null;
}

/**
 * Keep every typed line. Keep the newest voice lines so a long call
 * does not inflate the next /api/co-invent body. The on-screen list is uncut.
 * @param {object[]} messages
 * @param {number} [cap]
 */
export function capVoiceHistory(messages, cap = VOICE_HISTORY_CAP) {
  const list = Array.isArray(messages) ? messages : [];
  const limit = Number.isFinite(cap) && cap >= 0 ? cap : VOICE_HISTORY_CAP;
  const voiceIdx = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i]?.voice) voiceIdx.push(i);
  }
  const drop = new Set(voiceIdx.slice(0, Math.max(0, voiceIdx.length - limit)));
  if (!drop.size) return list.slice();
  return list.filter((_, i) => !drop.has(i));
}
