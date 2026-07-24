/**
 * Friends room client (PR9) — REST + WebSocket.
 * Stores tokens in sessionStorage.
 */

const SS_KEY = "future-forge:roomSession";

export function loadRoomSession() {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveRoomSession(session) {
  try {
    if (!session) sessionStorage.removeItem(SS_KEY);
    else sessionStorage.setItem(SS_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws/rooms`;
}

export class RoomClient {
  constructor() {
    this.session = loadRoomSession();
    this.snapshot = null;
    this.ws = null;
    this.handlers = new Set();
    this.reconnectTimer = null;
    this.intentionalClose = false;
  }

  on(fn) {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }

  emit(evt) {
    for (const fn of this.handlers) {
      try {
        fn(evt);
      } catch (e) {
        console.error("[room]", e);
      }
    }
  }

  async create(displayName) {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "create_failed");
    this.session = {
      code: data.code,
      playerToken: data.playerToken,
      hostToken: data.hostToken,
      playerId: data.playerId,
      displayName: displayName || "Host",
      isHost: true,
    };
    saveRoomSession(this.session);
    this.snapshot = data.snapshot;
    await this.connect();
    return data;
  }

  async join(code, displayName) {
    const prev = loadRoomSession();
    const body = {
      displayName,
      playerToken:
        prev?.code === String(code).toUpperCase() ? prev.playerToken : undefined,
    };
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "join_failed");
    this.session = {
      code: String(code).toUpperCase(),
      playerToken: data.playerToken,
      hostToken: data.hostToken || null,
      playerId: data.playerId,
      displayName: displayName || "Player",
      isHost: Boolean(data.hostToken),
    };
    saveRoomSession(this.session);
    this.snapshot = data.snapshot;
    await this.connect();
    return data;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (!this.session?.playerToken) {
        reject(new Error("no_session"));
        return;
      }
      this.intentionalClose = false;
      if (this.ws) {
        try {
          this.ws.close();
        } catch {
          /* ignore */
        }
      }
      const ws = new WebSocket(wsUrl());
      this.ws = ws;
      const t = setTimeout(() => {
        reject(new Error("ws_timeout"));
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }, 8000);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", token: this.session.playerToken }));
      };

      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "hello") {
          clearTimeout(t);
          this.snapshot = msg.snapshot;
          this.emit({ type: "hello", snapshot: msg.snapshot });
          resolve(msg);
          return;
        }
        if (msg.type === "snapshot") {
          // Prefer personalized if you is set
          if (msg.snapshot) this.snapshot = msg.snapshot;
          this.emit(msg);
          return;
        }
        if (msg.type === "patch" && (msg.mp || msg.sim)) {
          if (this.snapshot) {
            if (msg.simVersion && this.snapshot.simVersion && msg.simVersion > this.snapshot.simVersion + 1) {
              this.resync();
              return;
            }
            this.snapshot = {
              ...this.snapshot,
              simVersion: msg.simVersion,
              sim: msg.sim ?? this.snapshot.sim,
              mp: msg.mp ?? this.snapshot.mp,
              place: msg.place ?? msg.mp?.place ?? this.snapshot.place,
              forges: msg.forges ?? msg.mp?.forges ?? this.snapshot.forges,
              openTable: msg.openTable ?? msg.mp?.openTable ?? this.snapshot.openTable,
              ranking: msg.ranking !== undefined ? msg.ranking : this.snapshot.ranking,
              activeSeatId: msg.activeSeatId ?? msg.mp?.activeSeatId ?? this.snapshot.activeSeatId,
              fieldLocks: msg.fieldLocks || this.snapshot.fieldLocks,
              phase: msg.phase || (msg.mp ? "playing" : this.snapshot.phase),
              you: msg.you
                ? { ...(this.snapshot.you || {}), ...msg.you }
                : this.snapshot.you,
            };
          }
          this.emit(msg);
          return;
        }
        if (msg.type === "presence" || msg.type === "lobby" || msg.type === "settings" || msg.type === "locks") {
          if (this.snapshot) {
            if (msg.players) this.snapshot.players = msg.players;
            if (msg.missionMeta) this.snapshot.missionMeta = msg.missionMeta;
            if (msg.phase) this.snapshot.phase = msg.phase;
            if (msg.settings) this.snapshot.settings = msg.settings;
            // Always apply fieldLocks when present (including {} after unlock)
            if (msg.fieldLocks !== undefined) this.snapshot.fieldLocks = msg.fieldLocks;
          }
          this.emit(msg);
          return;
        }
        if (msg.type === "ai_pending" || msg.type === "ai_result") {
          if (this.snapshot && (msg.sim || msg.mp)) {
            this.snapshot = {
              ...this.snapshot,
              simVersion: msg.simVersion ?? this.snapshot.simVersion,
              sim: msg.sim ?? this.snapshot.sim,
              mp: msg.mp ?? this.snapshot.mp,
              place: msg.mp?.place ?? this.snapshot.place,
              forges: msg.mp?.forges ?? this.snapshot.forges,
              openTable: msg.mp?.openTable ?? this.snapshot.openTable,
              phase: "playing",
            };
          }
          this.emit(msg);
          return;
        }
        if (msg.type === "kicked" || msg.type === "room_ended") {
          this.leaveLocal();
          this.emit(msg);
          return;
        }
        this.emit(msg);
      };

      ws.onerror = () => {
        clearTimeout(t);
        // resolve may already have fired
      };

      ws.onclose = () => {
        this.ws = null;
        if (!this.intentionalClose && this.session) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {});
          }, 1500);
        }
      };
    });
  }

  async resync() {
    if (!this.session) return;
    try {
      const res = await fetch(
        `/api/rooms/${this.session.code}/snapshot?token=${encodeURIComponent(this.session.playerToken)}`
      );
      const data = await res.json();
      if (data.ok && data.snapshot) {
        this.snapshot = data.snapshot;
        this.emit({ type: "snapshot", snapshot: data.snapshot });
      }
    } catch {
      /* ignore */
    }
  }

  sendAction(action) {
    if (!this.ws || this.ws.readyState !== 1) throw new Error("not_connected");
    this.ws.send(JSON.stringify({ type: "action", action }));
  }

  /**
   * PR10: request room co-inventor AI (server reserves AP/quota then proxies).
   * @param {{ mode: string, userLabel?: string, prompt?: string, messages?: object[], reservedAp?: number, clientActionId?: string, context?: object }} payload
   * @returns {string} clientActionId
   */
  requestAi(payload = {}) {
    if (!this.ws || this.ws.readyState !== 1) throw new Error("not_connected");
    const clientActionId =
      payload.clientActionId || `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.ws.send(
      JSON.stringify({
        type: "request_ai",
        payload: { ...payload, clientActionId },
      })
    );
    return clientActionId;
  }

  /**
   * Promise wrapper for CoInventor transport — waits for matching ai_result.
   * @param {object} body — { mode, messages, context }
   * @returns {Promise<object>} co-invent style result
   */
  requestAiAsync(body = {}) {
    if (!this.ws || this.ws.readyState !== 1) {
      return Promise.reject(new Error("not_connected"));
    }
    const clientActionId = `co-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        off();
        reject(new Error("ai_timeout"));
      }, 90000);
      const off = this.on((evt) => {
        if (evt.type === "reject" && !evt.clientActionId) {
          // generic reject — ignore unless we just sent
        }
        if (evt.type === "ai_result" && evt.clientActionId === clientActionId) {
          clearTimeout(t);
          off();
          if (evt.ok === false) {
            reject(new Error(evt.error || "ai_failed"));
            return;
          }
          resolve({
            message: evt.result?.message || "",
            proposals: evt.result?.proposals || null,
            teaching: evt.result?.teaching || [],
            source: evt.result?.source || null,
            challengeSpeech: evt.result?.challengeSpeech,
            challengeQuestion: evt.result?.challengeQuestion,
            verdict: evt.result?.verdict,
            quality: evt.result?.quality,
            draftAnswer: evt.result?.draftAnswer,
          });
        }
        if (evt.type === "reject" && evt.error && evt.clientActionId === clientActionId) {
          clearTimeout(t);
          off();
          reject(new Error(evt.error));
        }
      });
      try {
        this.ws.send(
          JSON.stringify({
            type: "request_ai",
            payload: {
              mode: body.mode || "chat",
              messages: body.messages,
              context: body.context,
              reservedAp: body.reservedAp ?? 1,
              clientActionId,
              userLabel: body.userLabel,
              prompt: body.prompt,
            },
          })
        );
      } catch (e) {
        clearTimeout(t);
        off();
        reject(e);
      }
    });
  }

  async hostCmd(cmd, payload = {}) {
    if (!this.session?.isHost && !this.session?.hostToken) {
      throw new Error("not_host");
    }
    // Prefer WS
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(
        JSON.stringify({
          type: "host",
          cmd,
          hostToken: this.session.hostToken,
          payload,
        })
      );
      return { ok: true, via: "ws" };
    }
    const res = await fetch(`/api/rooms/${this.session.code}/host`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd,
        hostToken: this.session.hostToken,
        playerToken: this.session.playerToken,
        ...payload,
      }),
    });
    return res.json();
  }

  leaveLocal() {
    this.intentionalClose = true;
    clearTimeout(this.reconnectTimer);
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.session = null;
    this.snapshot = null;
    saveRoomSession(null);
  }
}
