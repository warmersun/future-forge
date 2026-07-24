/**
 * AI Co-Inventor client — brainstorms with the learner via /api/co-invent
 */

const QUICK_ACTIONS = [
  { mode: "spark", label: "Spark ideas", hint: "Frame the local mission" },
  { mode: "suggest-stack", label: "Suggest stack", hint: "Tech combo for this place" },
  {
    mode: "art-of-the-possible",
    label: "Art of the possible",
    hint: "Milestones, capabilities, unlocked use cases for this stack & year",
  },
  { mode: "draft-name", label: "Name it", hint: "Invention name" },
  { mode: "push-further", label: "Timing check", hint: "Wait vs claim fit for this year" },
  { mode: "explain-techs", label: "Teach me", hint: "Explain techs in the stack" },
];

export class CoInventor {
  /**
   * @param {object} opts
   * @param {() => object} opts.getContext — returns challenge, techs, draft fields
   * @param {(proposals: object) => void} opts.applyProposals
   * @param {(techId: string) => object|null} opts.techById
   * @param {(mode: string) => boolean|Promise<boolean>} [opts.beforeRequest] — return false to abort (e.g. no AP)
   * @param {(mode: string, ok: boolean) => void} [opts.afterRequest] — cleanup after AI call
   * @param {boolean} [opts.showQuickActions=true] — invent chips (spark, stack, …); off on Challenge
   * @param {string} [opts.placeholder] — compose box placeholder
   * @param {string} [opts.subtitle] — header subtitle default before health check
   */
  constructor(opts) {
    this.getContext = opts.getContext;
    this.applyProposals = opts.applyProposals;
    this.techById = opts.techById;
    this.beforeRequest = opts.beforeRequest || null;
    this.afterRequest = opts.afterRequest || null;
    this.showQuickActions = opts.showQuickActions !== false;
    this.placeholder =
      opts.placeholder ||
      "Brainstorm with your co-inventor… e.g. “What if we grew the seawalls instead of building them?”";
    this.subtitle = opts.subtitle || "Your creative partner for this challenge";
    this.messages = [];
    this.busy = false;
    this.available = null;
    this.root = null;
  }

  mount(root) {
    this.root = root;
    root.innerHTML = `
      <div class="co-header">
        <div>
          <div class="co-title">AI Co-Inventor</div>
          <div class="co-sub" id="co-status">${escapeHtml(this.subtitle)}</div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="co-clear" title="Clear chat">Clear</button>
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
      actions.innerHTML = QUICK_ACTIONS.map(
        (a) =>
          `<button type="button" class="co-chip" data-mode="${a.mode}" title="${a.hint}">${a.label}</button>`
      ).join("");
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

    root.querySelector("#co-clear").addEventListener("click", () => this.reset());

    this.checkHealth();
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
      }
    }
  }

  reset(seedWelcome = true) {
    this.messages = [];
    this.renderMessages();
    if (seedWelcome) this.seedWelcome();
  }

  seedWelcome() {
    const ctx = this.getContext();
    const title = ctx.challenge?.title || "this mission";
    const year = ctx.year ? ` (${ctx.year})` : "";
    this.pushAssistant(
      {
        message:
          `I'm your co-inventor for **${title}**${year}. ` +
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
    }

    this.busy = true;
    this.setBusyUi(true);
    const thinkingId = this.pushThinking();
    let requestOk = false;

    try {
      const ctx = this.getContext();
      const res = await fetch("/api/co-invent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
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
            inventionName: ctx.inventionName,
            inventionHow: ctx.inventionHow,
            inventionImpact: ctx.inventionImpact,
            storyFace: ctx.storyFace,
            writeBoth: ctx.writeBoth,
            year: ctx.year,
            turn: ctx.turn,
            place: ctx.place,
            pressure: ctx.pressure,
            availableTechs: ctx.availableTechs,
          },
        }),
      });

      const data = await res.json();
      this.removeThinking(thinkingId);

      if (!res.ok && data.error) {
        this.pushAssistant({
          message: data.message || data.error,
          proposals: emptyProposals(),
          teaching: [],
        });
        return;
      }

      // Store plain text for conversation history
      this.messages.push({
        role: "assistant",
        content: data.message || "",
        proposals: data.proposals,
        teaching: data.teaching,
      });
      this.renderMessages();
      requestOk = true;
    } catch (e) {
      this.removeThinking(thinkingId);
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

  setBusyUi(busy) {
    const send = this.root?.querySelector("#co-send");
    const input = this.root?.querySelector("#co-input");
    if (send) send.disabled = busy;
    if (input) input.disabled = busy;
    this.root?.querySelectorAll(".co-chip").forEach((b) => {
      b.disabled = busy;
    });
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
        this.applyPartial(msg.proposals, kind);
        btn.classList.add("applied");
        btn.textContent = btn.textContent.replace(/^Apply/, "Applied");
        btn.disabled = true;
      });
    });

    box.querySelectorAll("[data-apply-all]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.applyAll);
        const msg = this.messages[idx];
        if (!msg?.proposals) return;
        this.applyProposals(msg.proposals);
        btn.classList.add("applied");
        btn.textContent = "Applied to invention";
        btn.disabled = true;
        box.querySelectorAll(`[data-msg="${idx}"]`).forEach((b) => {
          b.classList.add("applied");
          b.disabled = true;
        });
      });
    });

    box.scrollTop = box.scrollHeight;
  }

  renderAssistant(m, idx) {
    const p = m.proposals || emptyProposals();
    const hasProps = hasAnyProposal(p);
    const teaching = m.teaching || [];

    let actions = "";
    if (hasProps && !m.local) {
      const bits = [];
      if (p.addTechIds?.length) {
        const names = p.addTechIds.map((id) => this.techById(id)?.name || id).join(", ");
        bits.push(
          `<button type="button" class="co-apply" data-msg="${idx}" data-apply="techs">Apply techs (${escapeHtml(names)})</button>`
        );
      }
      if (p.inventionName) {
        bits.push(
          `<button type="button" class="co-apply" data-msg="${idx}" data-apply="name">Apply name</button>`
        );
      }
      if (p.inventionHow) {
        bits.push(
          `<button type="button" class="co-apply" data-msg="${idx}" data-apply="how">Apply how-it-works</button>`
        );
      }
      if (p.inventionImpact) {
        bits.push(
          `<button type="button" class="co-apply" data-msg="${idx}" data-apply="impact">Apply everyday life</button>`
        );
      }
      if (p.scrutiny) {
        bits.push(
          `<button type="button" class="co-apply" data-msg="${idx}" data-apply="scrutiny">Apply scrutiny</button>`
        );
      }
      if (bits.length > 1) {
        bits.unshift(
          `<button type="button" class="co-apply co-apply-all" data-apply-all="${idx}">Apply all suggestions</button>`
        );
      }
      actions = `<div class="co-proposal-actions">${bits.join("")}</div>`;
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

    // light markdown: **bold** only
    const html = formatMessage(m.content || "");

    return `<div class="co-msg assistant">
      <div class="co-bubble">${html}${teach}${actions}</div>
    </div>`;
  }

  applyPartial(proposals, kind) {
    const partial = emptyProposals();
    if (kind === "techs") {
      partial.addTechIds = proposals.addTechIds || [];
      partial.removeTechIds = proposals.removeTechIds || [];
    } else if (kind === "name") {
      partial.inventionName = proposals.inventionName;
    } else if (kind === "how") {
      partial.inventionHow = proposals.inventionHow;
    } else if (kind === "impact") {
      partial.inventionImpact = proposals.inventionImpact;
    } else if (kind === "scrutiny") {
      partial.scrutiny = proposals.scrutiny;
    }
    this.applyProposals(partial);
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
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}
