/**
 * Shared voice-call decisions. DOM-free so the panel, the proxy, and tests agree.
 * Fingerprint fields are the ones the spoken prompt actually reads.
 */

export const VOICE_HISTORY_CAP = 24;

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
  ].join("\u0001");
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
    if (!pending) return { messages, captionIndex: null, pending: null, changed: false };
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
    return { messages, captionIndex: null, pending: null, changed: true };
  }

  return { messages, captionIndex, pending, changed: false };
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
