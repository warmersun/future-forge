/**
 * AI Co-Inventor client — brainstorms with the learner via /api/co-invent
 */

import { getClientSessionId } from "./client-session.js";
import { apiFetch, isClerkReady, openCloudSignIn } from "./auth.js";
import { renderChatMarkdown } from "./md-lite.js";
import {
  attachReadAloud,
  pruneDetachedReadAloud,
  plainTextFromEl,
} from "./read-aloud.js";

/** Chat replies can be shorter than brief/scene hosts. */
const CO_READ_MIN_CHARS = 40;

const QUICK_ACTIONS = [
  { mode: "spark", label: "Spark ideas", hint: "Frame the local mission" },
  { mode: "suggest-stack", label: "Suggest stack", hint: "Tech combo for this place" },
  {
    mode: "art-of-the-possible",
    label: "Art of the possible",
    hint: "Milestones, capabilities, unlocked use cases for this stack & year",
  },
  {
    mode: "sit",
    label: "SIT invent",
    hint: "Addition · subtraction · multiplication · division — thinking in a box",
  },
  {
    mode: "scamper",
    label: "SCAMPER invent",
    hint: "Substitute · Combine · Adapt · Modify · Put to other uses · Eliminate · Reverse",
  },
  { mode: "draft-name", label: "Name it", hint: "Invention name" },
  { mode: "push-further", label: "Timing check", hint: "Wait vs claim fit for this year" },
  { mode: "explain-techs", label: "Teach me", hint: "Explain techs in the stack" },
];

/** Match invent howOk threshold — enough substance for SIT / SCAMPER to remake. */
const HOW_IT_WORKS_MIN = 20;
const HOW_GATED_MODES = new Set(["sit", "scamper"]);
const HOW_GATED_DISABLED_TITLE = "Write how it works first (a short paragraph)";
const HOW_GATED_DISABLED_TITLE_HEX = "Mint at least one idea tile first";

export class CoInventor {
  /**
   * @param {object} opts
   * @param {() => object} opts.getContext — returns challenge, techs, draft fields
   * @param {(proposals: object) => void} opts.applyProposals
   * @param {(techId: string) => object|null} opts.techById
   * @param {(mode: string) => boolean|Promise<boolean>} [opts.beforeRequest] — return false to abort (e.g. no AP)
   * @param {(mode: string, ok: boolean) => void} [opts.afterRequest] — cleanup after AI call
   * @param {(body: object) => Promise<object>} [opts.transport] — replace fetch /api/co-invent (e.g. room WS)
   * @param {(info: object) => void} [opts.onTrace] — developer inspect: sent/received payload
   * @param {boolean} [opts.showQuickActions=true] — invent chips (spark, stack, …); off on Challenge
   * @param {"hex"|"legacy"} [opts.surface="legacy"] — hex workshop vs essay/stack apply
   * @param {string} [opts.placeholder] — compose box placeholder
   * @param {string} [opts.subtitle] — header subtitle default before health check
   * @param {boolean} [opts.tutorMode=false] — active tutor session (free AP + badge)
   * @param {boolean} [opts.learningQuest=false] — learning module (can resume tutoring)
   * @param {() => void} [opts.onEndTutoring] — learner ends tutor session
   * @param {() => void} [opts.onResumeTutoring] — learner resumes tutor session
   * @param {(reason?: string) => void} [opts.onTutorSessionEnded] — after AI signals endTutoring
   */
  constructor(opts) {
    this.getContext = opts.getContext;
    this.applyProposals = opts.applyProposals;
    this.techById = opts.techById;
    this.beforeRequest = opts.beforeRequest || null;
    this.afterRequest = opts.afterRequest || null;
    this.transport = opts.transport || null;
    this.onTrace = opts.onTrace || null;
    this.showQuickActions = opts.showQuickActions !== false;
    this.surface = opts.surface === "hex" ? "hex" : "legacy";
    this.placeholder =
      opts.placeholder ||
      "Brainstorm with your co-inventor… e.g. “What if we grew the seawalls instead of building them?”";
    this.subtitle = opts.subtitle || "Your creative partner for this challenge";
    this.tutorMode = Boolean(opts.tutorMode);
    this.learningQuest = Boolean(opts.learningQuest);
    this.onEndTutoring = opts.onEndTutoring || null;
    this.onResumeTutoring = opts.onResumeTutoring || null;
    this.onTutorSessionEnded = opts.onTutorSessionEnded || null;
    this.onHistoryChange = opts.onHistoryChange || null;
    /** Separate full transcripts: tutor session vs regular co-inventor. */
    this.histories = {
      tutor: Array.isArray(opts.histories?.tutor) ? [...opts.histories.tutor] : [],
      coinventor: Array.isArray(opts.histories?.coinventor)
        ? [...opts.histories.coinventor]
        : [],
    };
    this.activeHistoryKey = this._historyKeyForState();
    /** Active lane — always the same array as histories[activeHistoryKey]. */
    this.messages = this.histories[this.activeHistoryKey];
    this.busy = false;
    /** When false (e.g. multiplayer spectator), chips/send stay disabled. */
    this.interactive = true;
    this.available = null;
    this.root = null;
  }

  /** @returns {"tutor"|"coinventor"} */
  _historyKeyForState() {
    return this.learningQuest && this.tutorMode ? "tutor" : "coinventor";
  }

  /**
   * Snapshot both histories for remount (Invent ↔ Challenge).
   * @returns {{ tutor: object[], coinventor: object[], activeHistoryKey: string }}
   */
  exportHistories() {
    return {
      tutor: [...(this.histories.tutor || [])],
      coinventor: [...(this.histories.coinventor || [])],
      activeHistoryKey: this.activeHistoryKey,
    };
  }

  /**
   * Restore both histories after remount.
   * @param {{ tutor?: object[], coinventor?: object[], activeHistoryKey?: string }|null} data
   */
  importHistories(data) {
    if (!data || typeof data !== "object") return;
    this.histories = {
      tutor: Array.isArray(data.tutor) ? [...data.tutor] : [],
      coinventor: Array.isArray(data.coinventor) ? [...data.coinventor] : [],
    };
    const key =
      data.activeHistoryKey === "tutor" || data.activeHistoryKey === "coinventor"
        ? data.activeHistoryKey
        : this._historyKeyForState();
    this.activeHistoryKey = key;
    this.messages = this.histories[key];
    this.renderMessages();
  }

  /**
   * Switch active transcript when tutor session toggles.
   * @param {"tutor"|"coinventor"} nextKey
   */
  _switchHistoryLane(nextKey) {
    if (nextKey !== "tutor" && nextKey !== "coinventor") return;
    if (nextKey === this.activeHistoryKey) {
      this.messages = this.histories[nextKey];
      return;
    }
    // messages is already a reference into histories[old]; nothing to flush
    this.activeHistoryKey = nextKey;
    this.messages = this.histories[nextKey];
    this.renderMessages();
  }

  mount(root) {
    this.root = root;
    root.innerHTML = `
      <div class="co-header">
        <div class="co-header-text">
          <div class="co-title">AI Co-Inventor</div>
          <div class="co-sub" id="co-status">${escapeHtml(this.subtitle)}</div>
        </div>
        <div class="co-header-actions">
          <span
            class="co-tutor-badge"
            id="co-tutor-badge"
            hidden
            title="Tutoring"
          >Tutoring</span>
          <button
            type="button"
            class="btn btn-ghost btn-sm co-tutor-toggle"
            id="co-end-tutor"
            hidden
            title="End free tutor mode — chat will cost 1 AP like a normal co-inventor"
          >End tutoring</button>
          <button
            type="button"
            class="btn btn-ghost btn-sm co-tutor-toggle"
            id="co-resume-tutor"
            hidden
            title="Resume AI tutor mode — free AP, one short idea at a time (learning quests only)"
          >Resume tutoring</button>
          <button type="button" class="btn btn-ghost btn-sm" id="co-clear" title="Clear chat">Clear</button>
        </div>
      </div>
      <div class="co-actions" id="co-actions" ${this.showQuickActions ? "" : "hidden"}></div>
      <div class="co-messages" id="co-messages" role="log" aria-live="polite"></div>
      <form class="co-compose" id="co-form">
        <textarea
          id="co-input"
          rows="2"
          placeholder="${escapeHtml(this.placeholder)}"
        ></textarea>
        <button type="submit" class="btn btn-primary btn-sm" id="co-send">Send</button>
      </form>
    `;

    const actions = root.querySelector("#co-actions");
    if (this.showQuickActions && actions) {
      actions.hidden = false;
      const chips = QUICK_ACTIONS.filter(
        (a) => !(this.surface === "hex" && a.mode === "draft-name")
      );
      actions.innerHTML = chips
        .map(
          (a) =>
            `<button type="button" class="co-chip" data-mode="${a.mode}" title="${a.hint}">${a.label}</button>`
        )
        .join("");
      actions.querySelectorAll(".co-chip").forEach((btn) => {
        btn.addEventListener("click", () => this.runMode(btn.dataset.mode));
      });
    } else if (actions) {
      actions.hidden = true;
      actions.innerHTML = "";
    }

    root.querySelector("#co-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = root.querySelector("#co-input");
      const text = input.value.trim();
      if (!text || this.busy) return;
      input.value = "";
      this.sendChat(text);
    });

    root.querySelector("#co-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        root.querySelector("#co-form").requestSubmit();
      }
    });

    root.querySelector("#co-clear").addEventListener("click", () => {
      if (this.learningQuest && this.tutorMode) return;
      this.reset(true);
    });
    root.querySelector("#co-end-tutor")?.addEventListener("click", () => {
      if (this.busy) return;
      try {
        this.onEndTutoring?.();
      } catch {
        /* host */
      }
    });
    root.querySelector("#co-resume-tutor")?.addEventListener("click", () => {
      if (this.busy) return;
      try {
        this.onResumeTutoring?.();
      } catch {
        /* host */
      }
    });

    this.syncChipGates();
    this.applyTutorModeUi();
    this.checkHealth();
  }

  /**
   * Sync tutor session chrome (badge, End/Resume, free-AP subtitle) and swap chat lane.
   * @param {{ tutorMode?: boolean, learningQuest?: boolean, subtitle?: string }} [opts]
   */
  setTutorSession(opts = {}) {
    if (opts.tutorMode != null) this.tutorMode = Boolean(opts.tutorMode);
    if (opts.learningQuest != null) this.learningQuest = Boolean(opts.learningQuest);
    if (opts.subtitle != null) this.subtitle = String(opts.subtitle);
    const nextKey = this._historyKeyForState();
    this._switchHistoryLane(nextKey);
    this.applyTutorModeUi();
  }

  /** @deprecated use setTutorSession */
  setTutorMode(on, opts = {}) {
    this.setTutorSession({ tutorMode: on, ...opts });
  }

  applyTutorModeUi() {
    if (!this.root) return;
    const badge = this.root.querySelector("#co-tutor-badge");
    const endBtn = this.root.querySelector("#co-end-tutor");
    const resumeBtn = this.root.querySelector("#co-resume-tutor");
    // Learning quests always show "Tutoring"; highlight only while session is active
    if (badge) {
      badge.hidden = !this.learningQuest;
      badge.classList.toggle("is-active", Boolean(this.tutorMode));
      badge.classList.toggle("is-idle", Boolean(this.learningQuest && !this.tutorMode));
      badge.title = this.tutorMode
        ? "Tutor mode on — co-inventor chat does not cost AP"
        : "Tutor mode off — co-inventor chat costs 1 AP · Resume tutoring to turn free help back on";
      badge.setAttribute("aria-pressed", this.tutorMode ? "true" : "false");
    }
    if (endBtn) endBtn.hidden = !(this.learningQuest && this.tutorMode);
    if (resumeBtn) resumeBtn.hidden = !(this.learningQuest && !this.tutorMode);
    this.root.classList.toggle("is-tutor-mode", this.tutorMode);
    this.root.classList.toggle("is-learning-quest", this.learningQuest);
    this.syncClearButton();
    this.syncChipGates();
    const status = this.root.querySelector("#co-status");
    if (!status || status.classList.contains("co-offline")) return;
    if (this.tutorMode) {
      status.textContent =
        this.subtitle ||
        "Free AP · one short idea at a time — stack picks and fielding still cost resources";
      status.dataset.tutorOwned = "1";
    } else if (this.learningQuest) {
      status.textContent =
        this.subtitle ||
        "Co-inventor mode · 1 AP per AI request — Resume tutoring anytime";
      status.dataset.tutorOwned = "1";
    } else {
      delete status.dataset.tutorOwned;
    }
  }

  /**
   * Clear: disabled while tutoring; otherwise respects busy/spectator lock.
   */
  syncClearButton() {
    const clear = this.root?.querySelector("#co-clear");
    if (!clear) return;
    const tutorLock = Boolean(this.learningQuest && this.tutorMode);
    const busyLock = Boolean(this.busy) || !this.interactive;
    clear.disabled = tutorLock || busyLock;
    clear.setAttribute("aria-disabled", clear.disabled ? "true" : "false");
    clear.classList.toggle("is-tutor-locked", tutorLock);
    if (tutorLock) {
      clear.title = "Chat is kept while tutoring — End tutoring to clear the co-inventor thread";
    } else if (busyLock && this._lockReason) {
      clear.title = this._lockReason;
    } else {
      clear.title = "Clear chat";
    }
  }

  /**
   * Enable/disable invent chips. Tutor session locks the whole row; otherwise
   * busy / spectator, then SIT / SCAMPER how-it-works gates.
   */
  syncChipGates() {
    if (!this.root || !this.showQuickActions) return;
    const tutorLock = Boolean(this.learningQuest && this.tutorMode);
    const locked = Boolean(this.busy) || !this.interactive;
    const ctx = (() => {
      try {
        return this.getContext?.() || {};
      } catch {
        return {};
      }
    })();
    const howOk = ctx.hexInvent
      ? (ctx.hexBoard?.pathways || []).some(
          (p) => String(p.howText || "").trim().length >= HOW_IT_WORKS_MIN
        )
      : String(ctx.inventionHow || "").trim().length >= HOW_IT_WORKS_MIN;
    this.root.querySelectorAll(".co-chip").forEach((chip) => {
      const mode = chip.dataset.mode;
      const action = QUICK_ACTIONS.find((a) => a.mode === mode);
      if (tutorLock) {
        chip.disabled = true;
        chip.title = "End tutoring to use invent tools";
        chip.classList.add("is-tutor-locked");
        return;
      }
      chip.classList.remove("is-tutor-locked");
      if (locked) {
        chip.disabled = true;
        if (this._lockReason) chip.title = this._lockReason;
        return;
      }
      if (HOW_GATED_MODES.has(mode)) {
        chip.disabled = !howOk;
        chip.title = howOk
          ? action?.hint || mode
          : this.surface === "hex"
            ? HOW_GATED_DISABLED_TITLE_HEX
            : HOW_GATED_DISABLED_TITLE;
        return;
      }
      chip.disabled = false;
      if (action) chip.title = action.hint;
    });
  }

  async checkHealth() {
    const status = this.root?.querySelector("#co-status");
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      this.available = Boolean(data.coInventor);
      this.aiLive = Boolean(data.ai);
      if (status) {
        if (!this.available) {
          status.textContent = "Offline";
          status.classList.add("co-offline");
          delete status.dataset.tutorOwned;
        } else if (this.tutorMode || this.learningQuest) {
          status.classList.remove("co-offline");
          this.applyTutorModeUi();
        } else if (this.aiLive && data.auth === "supergrok") {
          status.textContent = "SuperGrok — invent with me";
          status.classList.remove("co-offline");
        } else if (this.aiLive) {
          status.textContent = "Grok online — invent with me";
          status.classList.remove("co-offline");
        } else {
          status.textContent = "Local co-inventor — run grok login for SuperGrok";
          status.classList.remove("co-offline");
        }
      }
    } catch {
      this.available = false;
      this.aiLive = false;
      if (status) {
        status.textContent = "Server unreachable — run npm start";
        status.classList.add("co-offline");
        delete status.dataset.tutorOwned;
      }
    }
  }

  /**
   * Clear the **co-inventor** chat lane only. No-op while tutoring (Clear disabled).
   * @param {boolean} [seedWelcome=true]
   */
  reset(seedWelcome = true) {
    if (this.learningQuest && this.tutorMode) return;
    this.histories.coinventor = [];
    if (this.activeHistoryKey === "coinventor") {
      this.messages = this.histories.coinventor;
      this.renderMessages();
    }
    if (seedWelcome) this.seedWelcome();
  }

  /**
   * Wipe both lanes (new mission). Always allowed.
   * @param {boolean} [seedWelcome=false]
   */
  clearAllHistories(seedWelcome = false) {
    this.histories = { tutor: [], coinventor: [] };
    this.activeHistoryKey = this._historyKeyForState();
    this.messages = this.histories[this.activeHistoryKey];
    this.renderMessages();
    if (seedWelcome) this.seedWelcome();
  }

  /** Active lane message count (for Resume spam control). */
  activeHistoryLength() {
    return this.messages?.length || 0;
  }

  /** Length of a named lane. */
  historyLength(key) {
    return this.histories?.[key]?.length || 0;
  }

  seedWelcome() {
    const ctx = this.getContext();
    const title = ctx.challenge?.title || "this mission";
    const year = ctx.year ? ` (${ctx.year})` : "";
    const hex = this.surface === "hex";
    this.pushAssistant(
      {
        message: hex
          ? `I'm your co-inventor for **${title}**${year}. ` +
            `Pick emTechs and mint invention tiles on the **hex board** — categories are never locked by year. ` +
            `Feasibility judges whether a tile's *how it works* over-claims. ` +
            `Use **Art of the possible** for milestones and current capabilities. You lead; I brainstorm, teach, and draft mint-box text with you.`
          : `I'm your co-inventor for **${title}**${year}. ` +
            `Pick any emTech categories this place needs — nothing is locked by year. ` +
            `Feasibility judges whether your *how it works* over-claims. ` +
            `Use **Art of the possible** for milestones and current capabilities. You lead; I brainstorm, teach, and draft with you.`,
        proposals: emptyProposals(),
        teaching: [],
      },
      { local: true }
    );
  }

  onChallengeStart() {
    this.reset(true);
  }

  async runMode(mode) {
    if (this.learningQuest && this.tutorMode) {
      this.syncChipGates();
      return;
    }
    if (HOW_GATED_MODES.has(mode)) {
      const how = String(this.getContext?.()?.inventionHow || "").trim();
      if (how.length < HOW_IT_WORKS_MIN) {
        this.syncChipGates();
        return;
      }
    }
    const labels = Object.fromEntries(QUICK_ACTIONS.map((a) => [a.mode, a.label]));
    const userText = `[${labels[mode] || mode}]`;
    await this.request({ mode, userText, showUser: mode === "chat" ? true : true, userDisplay: userText });
  }

  async sendChat(text) {
    await this.request({ mode: "chat", userText: text, showUser: true, userDisplay: text });
  }

  async request({ mode, userText, showUser, userDisplay }) {
    if (this.busy) return;
    await this.checkHealth();
    if (!this.available) {
      this.pushAssistant({
        message: "Co-inventor is offline. Start the app with `npm start` from the project folder.",
        proposals: emptyProposals(),
        teaching: [],
      });
      return;
    }

    if (this.beforeRequest) {
      const ok = await this.beforeRequest(mode);
      if (!ok) return;
    }

    if (showUser) {
      this.messages.push({ role: "user", content: userDisplay || userText });
      this.renderMessages();
      try {
        this.onHistoryChange?.();
      } catch {
        /* host */
      }
    }

    this.busy = true;
    this.setBusyUi(true);
    const thinkingId = this.pushThinking();
    let requestOk = false;
    const t0 = Date.now();

    try {
      const ctx = this.getContext();
      const requestBody = {
        mode,
        clientSessionId: getClientSessionId(),
        messages: [
          ...this.messages.filter((m) => m.role === "user" || m.role === "assistant"),
        ].map((m) => ({ role: m.role, content: m.content })),
        context: {
          challenge: ctx.challenge
            ? {
                id: ctx.challenge.id,
                title: ctx.challenge.title,
                problem: ctx.challenge.problem,
                stakes: ctx.challenge.stakes,
                prompt: ctx.challenge.prompt,
                recommended: ctx.challenge.recommended,
                successLens: ctx.challenge.successLens,
              }
            : null,
          selectedTechIds: ctx.selectedTechIds,
          inventionName: ctx.hexInvent ? null : ctx.inventionName,
          inventionHow: ctx.hexInvent ? null : ctx.inventionHow,
          inventionImpact: ctx.hexInvent ? null : ctx.inventionImpact,
          storyFace: ctx.storyFace,
          writeBoth: ctx.writeBoth,
          hexInvent: Boolean(ctx.hexInvent),
          focusTechId: ctx.focusTechId || null,
          hexBoard: ctx.hexBoard || null,
          year: ctx.year,
          turn: ctx.turn,
          place: ctx.place,
          pressure: ctx.pressure,
          availableTechs: ctx.availableTechs,
          grounding: ctx.grounding || null,
          isLearningModule: Boolean(ctx.isLearningModule),
          aiTutorContext: ctx.aiTutorContext || null,
          questId: ctx.questId || ctx.challenge?.id || null,
          // Active tutor session only (not merely "this is a learning quest")
          tutorMode: Boolean(ctx.tutorMode),
          guidance: ctx.guidance || null,
          spotlightTechId: ctx.spotlightTechId || null,
          spotlightAdvance: ctx.spotlightAdvance || null,
        },
      };

      let data;
      const trace = (extra = {}) => {
        try {
          this.onTrace?.({
            mode,
            sent: requestBody,
            received: data || null,
            ms: Date.now() - t0,
            ...extra,
          });
        } catch {
          /* inspect must not break chat */
        }
      };
      if (this.transport) {
        data = await this.transport(requestBody);
        this.removeThinking(thinkingId);
        if (data?.error && !data.message) {
          trace({ ok: false, error: data.error });
          this.pushAssistant({
            message: data.message || data.error,
            proposals: emptyProposals(),
            teaching: [],
          });
          return;
        }
        trace({ ok: true });
      } else {
        const res = await apiFetch("/api/co-invent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        data = await res.json();
        this.removeThinking(thinkingId);
        if (!res.ok && data.error) {
          trace({ ok: false, error: data.error });
          if (data.error === "sign_in_required" && isClerkReady()) {
            openCloudSignIn();
          }
          this.pushAssistant({
            message: data.message || data.error,
            proposals: emptyProposals(),
            teaching: [],
          });
          return;
        }
        trace({ ok: res.ok });
      }

      // Store plain text for conversation history
      // SIT / SCAMPER are inspiration only — never surface Apply how-it-works
      let proposals = data.proposals || emptyProposals();
      if (mode === "sit" || mode === "scamper") {
        proposals = {
          ...emptyProposals(),
          // keep teaching-related empty; strip all applyable story/stack proposals
        };
      }
      this.messages.push({
        role: "assistant",
        content: data.message || "",
        proposals,
        teaching: data.teaching,
        endTutoring: Boolean(data.endTutoring),
      });
      this.renderMessages();
      requestOk = true;
      try {
        this.onHistoryChange?.();
      } catch {
        /* host */
      }

      // AI tutor can end the free tutoring session (learning quests)
      if (data.endTutoring && this.tutorMode && this.learningQuest) {
        try {
          this.onTutorSessionEnded?.("ai");
        } catch {
          /* host */
        }
      }
    } catch (e) {
      this.removeThinking(thinkingId);
      const cancelled =
        e?.name === "AbortError" || e?.code === 20;
      try {
        this.onTrace?.({
          mode,
          sent: null,
          received: null,
          cancelled,
          error: cancelled ? null : String(e?.message || e),
          ok: false,
          ms: Date.now() - t0,
        });
      } catch {
        /* inspect */
      }
      this.pushAssistant({
        message: `Connection error: ${e.message}. Is the Future Forge server running?`,
        proposals: emptyProposals(),
        teaching: [],
      });
    } finally {
      this.busy = false;
      this.setBusyUi(false);
      try {
        this.afterRequest?.(mode, requestOk);
      } catch {
        /* host cleanup must not break chat */
      }
      this.syncChipGates();
    }
  }

  pushAssistant(data, { local } = {}) {
    this.messages.push({
      role: "assistant",
      content: data.message,
      proposals: data.proposals || emptyProposals(),
      teaching: data.teaching || [],
      local: Boolean(local),
    });
    this.renderMessages();
    if (!local) {
      try {
        this.onHistoryChange?.();
      } catch {
        /* host */
      }
    }
  }

  pushThinking() {
    const id = `think-${Date.now()}`;
    const box = this.root.querySelector("#co-messages");
    const el = document.createElement("div");
    el.className = "co-msg assistant thinking";
    el.dataset.thinkId = id;
    el.innerHTML = `<div class="co-bubble"><span class="ai-snake" aria-hidden="true"></span><span>Thinking with you…</span></div>`;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return id;
  }

  removeThinking(id) {
    this.root?.querySelector(`[data-think-id="${id}"]`)?.remove();
  }

  /**
   * Enable/disable compose + quick chips (multiplayer spectator / not your turn).
   * @param {boolean} on
   * @param {string} [reason]
   */
  setInteractive(on, reason = "") {
    this.interactive = Boolean(on);
    this._lockReason = reason || "";
    this.setBusyUi(this.busy);
  }

  setBusyUi(busy) {
    const locked = Boolean(busy) || !this.interactive;
    const send = this.root?.querySelector("#co-send");
    const input = this.root?.querySelector("#co-input");
    if (send) send.disabled = locked;
    if (input) {
      input.disabled = locked;
      if (locked && this._lockReason) input.title = this._lockReason;
      else input.removeAttribute("title");
    }
    this.syncClearButton();
    // End / Resume still usable unless busy (not spectator-locked? keep enabled when only spectator - actually spectator locks all)
    this.root?.querySelectorAll(".co-tutor-toggle").forEach((b) => {
      b.disabled = Boolean(busy) || !this.interactive;
    });
    this.root?.classList.toggle("co-locked", locked && !busy);
    this.syncChipGates();
  }

  renderMessages() {
    const box = this.root?.querySelector("#co-messages");
    if (!box) return;
    box.innerHTML = this.messages
      .map((m, idx) => {
        if (m.role === "user") {
          return `<div class="co-msg user"><div class="co-bubble">${escapeHtml(m.content)}</div></div>`;
        }
        return this.renderAssistant(m, idx);
      })
      .join("");

    box.querySelectorAll("[data-apply]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.msg);
        const kind = btn.dataset.apply;
        const msg = this.messages[idx];
        if (!msg?.proposals) return;
        // Per-tech: hex workshop focuses the picker; legacy pays stack costs
        if (kind === "tech") {
          const techId = btn.dataset.techId;
          if (!techId) return;
          const result = this.applyPartial(msg.proposals, "tech", { techId });
          const focused = result?.focusedTechIds?.includes(techId);
          const added = result?.addedTechIds?.includes(techId);
          if (!focused && !added) return; // unaffordable / locked — leave button active
          btn.classList.add("applied");
          btn.disabled = true;
          if (this.surface === "hex") {
            btn.textContent = btn.textContent.replace(/^Invent with /, "Inventing with ");
          } else {
            btn.textContent = btn.textContent.replace(/^Add /, "Added ");
          }
          return;
        }
        const result = this.applyPartial(msg.proposals, kind);
        if (kind === "how" && this.surface === "hex" && !result?.filledHow) return;
        btn.classList.add("applied");
        btn.disabled = true;
        if (kind === "how" && this.surface === "hex") {
          btn.textContent = "Used as how it works";
        } else {
          btn.textContent = btn.textContent.replace(/^Apply/, "Applied");
        }
      });
    });

    box.querySelectorAll("[data-apply-all]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.applyAll);
        const msg = this.messages[idx];
        if (!msg?.proposals) return;
        // Apply all still runs techs one-by-one with normal costs (not free bulk)
        const result = this.applyProposals(msg.proposals) || {};
        const added = new Set(result.addedTechIds || []);
        btn.classList.add("applied");
        btn.textContent = "Applied to invention";
        btn.disabled = true;
        // Mark only what actually landed (techs that failed afford stay clickable)
        box.querySelectorAll(`[data-msg="${idx}"]`).forEach((b) => {
          if (b.dataset.apply === "tech") {
            const tid = b.dataset.techId;
            if (tid && added.has(tid)) {
              b.classList.add("applied");
              b.disabled = true;
              b.textContent = b.textContent.replace(/^Add /, "Added ");
            }
            return;
          }
          b.classList.add("applied");
          b.disabled = true;
        });
      });
    });

    pruneDetachedReadAloud();
    box.querySelectorAll(".co-msg.assistant .co-bubble-md").forEach((el) => {
      attachReadAloud(el, {
        minChars: CO_READ_MIN_CHARS,
        getText: () =>
          plainTextFromEl(el, {
            skipSelector: ".read-aloud-bar, .co-proposal-actions, script, style",
          }),
      });
    });

    box.scrollTop = box.scrollHeight;
  }

  renderAssistant(m, idx) {
    const p = m.proposals || emptyProposals();
    const hasProps = hasAnyProposal(p);
    const teaching = m.teaching || [];

    let actions = "";
    const hideApplies = this.surface !== "hex" && !this.showQuickActions;
    const hex = this.surface === "hex";
    if (hasProps && !m.local && !hideApplies) {
      const bits = [];
      // One button per suggested emTech
      for (const id of p.addTechIds || []) {
        const t = this.techById(id);
        if (!t) continue;
        const label = `${t.icon ? `${t.icon} ` : ""}${t.name || id}`;
        if (hex) {
          bits.push(
            `<button type="button" class="co-apply co-apply-tech" data-msg="${idx}" data-apply="tech" data-tech-id="${escapeHtml(id)}" title="Focus this emTech so you can Ask for ideas or mint a tile">Invent with ${escapeHtml(label)}</button>`
          );
        } else {
          bits.push(
            `<button type="button" class="co-apply co-apply-tech" data-msg="${idx}" data-apply="tech" data-tech-id="${escapeHtml(id)}" title="Add to stack — pays AP, Budget, and Will like a manual pick">Add ${escapeHtml(label)}</button>`
          );
        }
      }
      if (!hex && p.inventionName) {
        bits.push(
          `<button type="button" class="co-apply" data-msg="${idx}" data-apply="name">Apply name</button>`
        );
      }
      if (p.inventionHow) {
        bits.push(
          hex
            ? `<button type="button" class="co-apply" data-msg="${idx}" data-apply="how">Set as this pathway's how</button>`
            : `<button type="button" class="co-apply" data-msg="${idx}" data-apply="how">Apply how-it-works</button>`
        );
      }
      if (!hex && p.inventionImpact) {
        bits.push(
          `<button type="button" class="co-apply" data-msg="${idx}" data-apply="impact">Apply everyday life</button>`
        );
      }
      if (!hex && p.scrutiny) {
        bits.push(
          `<button type="button" class="co-apply" data-msg="${idx}" data-apply="scrutiny">Apply scrutiny</button>`
        );
      }
      // "Apply all" only on legacy when there are non-tech proposals too.
      const nonTechCount = hex
        ? 0
        : (p.inventionName ? 1 : 0) +
          (p.inventionHow ? 1 : 0) +
          (p.inventionImpact ? 1 : 0) +
          (p.scrutiny ? 1 : 0);
      if (nonTechCount > 0 && bits.length > 1) {
        bits.unshift(
          `<button type="button" class="co-apply co-apply-all" data-apply-all="${idx}" title="Applies story fields; techs still charge normally one by one">Apply all suggestions</button>`
        );
      }
      actions = bits.length
        ? `<div class="co-proposal-actions">${bits.join("")}</div>`
        : "";
    }

    let teach = "";
    if (teaching.length) {
      teach = `<div class="co-teaching">${teaching
        .map((t) => {
          const tech = this.techById(t.techId);
          const label = tech ? `${tech.icon} ${tech.name}` : t.techId;
          return `<div class="co-teach-item"><strong>${escapeHtml(label)}</strong> — ${escapeHtml(t.blurb)}</div>`;
        })
        .join("")}</div>`;
    }

    // Tutor / co-inventor: safe markdown (links, images, lists, bold)
    const html = formatMessage(m.content || "");

    return `<div class="co-msg assistant">
      <div class="co-bubble co-bubble-md">${html}${teach}${actions}</div>
    </div>`;
  }

  /**
   * @param {object} proposals
   * @param {string} kind
   * @param {{ techId?: string }} [extra]
   * @returns {object|void} result from applyProposals when available
   */
  applyPartial(proposals, kind, extra = {}) {
    const partial = emptyProposals();
    if (kind === "tech") {
      if (!extra.techId) return { addedTechIds: [] };
      partial.addTechIds = [extra.techId];
    } else if (kind === "techs") {
      // Legacy bulk kind — still routes through per-tech cost path in applyProposals
      partial.addTechIds = proposals.addTechIds || [];
      partial.removeTechIds = proposals.removeTechIds || [];
    } else if (kind === "name") {
      partial.inventionName = proposals.inventionName;
    } else if (kind === "how") {
      partial.inventionHow = proposals.inventionHow;
      if (this.surface === "hex" && proposals.addTechIds?.[0]) {
        partial.howTechId = proposals.addTechIds[0];
      }
    } else if (kind === "impact") {
      partial.inventionImpact = proposals.inventionImpact;
    } else if (kind === "scrutiny") {
      partial.scrutiny = proposals.scrutiny;
    }
    return this.applyProposals(partial);
  }
}

function emptyProposals() {
  return {
    addTechIds: [],
    removeTechIds: [],
    inventionName: null,
    inventionHow: null,
    inventionImpact: null,
    scrutiny: null,
  };
}

function hasAnyProposal(p) {
  return Boolean(
    p.addTechIds?.length ||
      p.removeTechIds?.length ||
      p.inventionName ||
      p.inventionHow ||
      p.inventionImpact ||
      p.scrutiny
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMessage(text) {
  return renderChatMarkdown(text || "");
}
