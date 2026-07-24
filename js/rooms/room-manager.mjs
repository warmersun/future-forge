/**
 * In-memory friends co-op rooms (PR9–PR10).
 * REST create/join + WS snapshot/patch + room AI proxy with quotas.
 */

import crypto from "node:crypto";
import { applyAction } from "../sim/actions.js";
import { createSimState, cloneSimState, friendsFeatureFlags } from "../sim/state.js";
import { techById } from "../data.js";
import {
  createRoomAiQuotaState,
  reserveRoomAiJob,
  resolveRoomAiJob,
  rejectRoomAiJob,
} from "../sim/ai_jobs.js";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function randomToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function randomRoomCode(len = 6) {
  let out = "";
  const buf = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += CROCKFORD[buf[i] % CROCKFORD.length];
  return out;
}

/**
 * @typedef {object} Player
 * @property {string} id
 * @property {string} displayName
 * @property {string} playerToken
 * @property {boolean} connected
 * @property {boolean} isHost
 * @property {number} joinedAt
 * @property {string|null} role
 */

/**
 * @typedef {object} Room
 * @property {string} code
 * @property {string} hostToken
 * @property {string} hostPlayerId
 * @property {Player[]} players
 * @property {object} settings
 * @property {object|null} sim
 * @property {number} simVersion
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {Map<string, object>} fieldLocks — field → { playerId, displayName, until }
 * @property {Set<object>} sockets — WS sockets bound to this room
 */

export class RoomManager {
  /**
   * @param {object} [opts]
   * @param {(body: object) => Promise<object>} [opts.coInventHandler] — server injects handleCoInvent
   * @param {number} [opts.roomTtlMs]
   * @param {number} [opts.maxPlayers]
   */
  constructor(opts = {}) {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    this.roomTtlMs = opts.roomTtlMs ?? 4 * 60 * 60 * 1000;
    this.maxPlayersDefault = opts.maxPlayers ?? 5;
    /** simple rate: key → { count, resetAt } */
    this.rate = new Map();
    /** @type {null | ((body: object) => Promise<object>)} */
    this.coInventHandler = opts.coInventHandler || null;
  }

  /** @param {string} key @param {number} limit @param {number} windowMs */
  checkRate(key, limit, windowMs) {
    const now = Date.now();
    let e = this.rate.get(key);
    if (!e || now >= e.resetAt) {
      e = { count: 0, resetAt: now + windowMs };
      this.rate.set(key, e);
    }
    e.count += 1;
    return e.count <= limit;
  }

  sweep() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.updatedAt > this.roomTtlMs) {
        this.rooms.delete(code);
      }
    }
  }

  createRoom({ displayName, ip } = {}) {
    this.sweep();
    if (ip && !this.checkRate(`create:${ip}`, 5, 60 * 60 * 1000)) {
      return { ok: false, error: "rate_limited", status: 429 };
    }
    const name = cleanName(displayName) || "Host";
    let code = randomRoomCode(6);
    while (this.rooms.has(code)) code = randomRoomCode(6);

    const hostToken = randomToken(16);
    const playerToken = randomToken(16);
    const playerId = randomToken(8);
    const now = Date.now();

    /** @type {Room} */
    const room = {
      code,
      hostToken,
      hostPlayerId: playerId,
      players: [
        {
          id: playerId,
          displayName: name,
          playerToken,
          connected: false,
          isHost: true,
          joinedAt: now,
          role: "host",
        },
      ],
      settings: {
        mode: "friends_coop",
        apMax: 3,
        maxPlayers: this.maxPlayersDefault,
        sharedInvention: true,
        roleLocks: false,
        scrutinyCombat: false,
        deployStages: false,
        freeWrite: true,
        allowWait: true,
        hostCanKick: true,
        hostCanResolveScrutiny: false,
        allowRejoinByToken: true,
        allowRejoinByName: true,
      },
      sim: null,
      simVersion: 0,
      createdAt: now,
      updatedAt: now,
      fieldLocks: new Map(),
      sockets: new Set(),
      missionMeta: null, // { globalId, mission } before start
      aiQuota: createRoomAiQuotaState(),
    };
    this.rooms.set(code.toUpperCase(), room);
    room.code = code.toUpperCase();

    return {
      ok: true,
      code: room.code,
      hostToken,
      playerToken,
      playerId,
      snapshot: this.snapshotFor(room, playerId),
    };
  }

  joinRoom(code, { displayName, playerToken, ip } = {}) {
    this.sweep();
    const room = this.rooms.get(String(code || "").toUpperCase());
    if (!room) return { ok: false, error: "room_not_found", status: 404 };
    if (ip && !this.checkRate(`join:${ip}`, 10, 60 * 1000)) {
      return { ok: false, error: "rate_limited", status: 429 };
    }
    if (ip && !this.checkRate(`join-code:${room.code}:${ip}`, 5, 60 * 1000)) {
      return { ok: false, error: "rate_limited", status: 429 };
    }

    // Rejoin by token
    if (playerToken) {
      const seat = room.players.find((p) => p.playerToken === playerToken);
      if (seat) {
        seat.connected = true;
        room.updatedAt = Date.now();
        return {
          ok: true,
          playerToken: seat.playerToken,
          playerId: seat.id,
          hostToken: seat.isHost ? room.hostToken : undefined,
          snapshot: this.snapshotFor(room, seat.id),
          rejoined: true,
        };
      }
    }

    const name = cleanName(displayName);
    if (!name) return { ok: false, error: "name_required", status: 400 };

    // Rejoin by name if disconnected
    if (room.settings.allowRejoinByName) {
      const seat = room.players.find(
        (p) => p.displayName.toLowerCase() === name.toLowerCase()
      );
      if (seat) {
        if (seat.connected) {
          return { ok: false, error: "name_in_use", status: 409 };
        }
        seat.playerToken = randomToken(16);
        seat.connected = true;
        seat.displayName = name;
        room.updatedAt = Date.now();
        return {
          ok: true,
          playerToken: seat.playerToken,
          playerId: seat.id,
          hostToken: seat.isHost ? room.hostToken : undefined,
          snapshot: this.snapshotFor(room, seat.id),
          rejoined: true,
        };
      }
    }

    if (room.players.length >= (room.settings.maxPlayers || 5)) {
      return { ok: false, error: "room_full", status: 403 };
    }

    const playerId = randomToken(8);
    const token = randomToken(16);
    room.players.push({
      id: playerId,
      displayName: name,
      playerToken: token,
      connected: true,
      isHost: false,
      joinedAt: Date.now(),
      role: "polymath",
    });
    room.updatedAt = Date.now();
    this.broadcast(room, { type: "presence", players: publicPlayers(room) });

    return {
      ok: true,
      playerToken: token,
      playerId,
      snapshot: this.snapshotFor(room, playerId),
      rejoined: false,
    };
  }

  findByPlayerToken(token) {
    if (!token) return null;
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.playerToken === token);
      if (player) return { room, player };
    }
    return null;
  }

  bindSocket(room, player, socket) {
    player.connected = true;
    player._socket = socket;
    room.sockets.add(socket);
    room.updatedAt = Date.now();
    this.broadcast(room, { type: "presence", players: publicPlayers(room) }, socket);
  }

  unbindSocket(socket) {
    for (const room of this.rooms.values()) {
      if (!room.sockets.has(socket)) continue;
      room.sockets.delete(socket);
      for (const p of room.players) {
        if (p._socket === socket) {
          p.connected = false;
          p._socket = null;
        }
      }
      room.updatedAt = Date.now();
      this.broadcast(room, { type: "presence", players: publicPlayers(room) });
    }
  }

  snapshotFor(room, playerId) {
    expireLocks(room);
    const you = room.players.find((p) => p.id === playerId) || null;
    return {
      simVersion: room.simVersion,
      code: room.code,
      settings: { ...room.settings },
      players: publicPlayers(room),
      you: you
        ? {
            id: you.id,
            displayName: you.displayName,
            isHost: you.isHost,
            role: you.role,
          }
        : null,
      sim: room.sim ? cloneSimState(room.sim) : null,
      missionMeta: room.missionMeta,
      fieldLocks: locksPublic(room),
      phase: room.sim ? "playing" : room.missionMeta ? "ready" : "lobby",
    };
  }

  /**
   * Host sets mission (before start) or updates settings.
   */
  hostCommand(room, player, cmd, payload = {}) {
    const isHost =
      Boolean(player?.isHost) ||
      (payload?.hostToken && payload.hostToken === room.hostToken);
    if (!isHost) return { ok: false, error: "not_host" };

    if (cmd === "set_mission") {
      if (room.sim) return { ok: false, error: "already_started" };
      const mission = payload.mission;
      const globalId = payload.globalId || mission?.globalId;
      if (!mission?.id) return { ok: false, error: "mission_required" };
      room.missionMeta = { globalId, mission };
      room.updatedAt = Date.now();
      this.broadcast(room, {
        type: "lobby",
        missionMeta: room.missionMeta,
        phase: "ready",
      });
      return { ok: true, snapshot: this.snapshotFor(room, player?.id) };
    }

    if (cmd === "start_mission") {
      if (room.sim) return { ok: false, error: "already_started" };
      const meta = room.missionMeta || payload;
      const mission = meta.mission || payload.mission;
      if (!mission) return { ok: false, error: "mission_required" };
      const global = meta.globalId ? { id: meta.globalId } : { id: mission.globalId };
      room.sim = createSimState(mission, global, {
        features: friendsFeatureFlags({
          scrutinyCombat: Boolean(room.settings.scrutinyCombat),
          deployStages: Boolean(room.settings.deployStages),
        }),
        apMax: room.settings.apMax || 3,
      });
      room.simVersion = 1;
      room.missionMeta = { globalId: global.id, mission };
      room.updatedAt = Date.now();
      this.broadcast(room, {
        type: "snapshot",
        snapshot: this.snapshotFor(room, null),
      });
      // send personalized snapshots
      for (const p of room.players) {
        if (p._socket && p._socket.readyState === 1) {
          safeSend(p._socket, {
            type: "snapshot",
            snapshot: this.snapshotFor(room, p.id),
          });
        }
      }
      return { ok: true, simVersion: room.simVersion };
    }

    if (cmd === "set_settings") {
      if (room.sim) return { ok: false, error: "already_started" };
      const allowed = ["maxPlayers", "scrutinyCombat", "deployStages", "roleLocks", "apMax"];
      for (const k of allowed) {
        if (payload[k] !== undefined) room.settings[k] = payload[k];
      }
      room.updatedAt = Date.now();
      this.broadcast(room, { type: "settings", settings: room.settings });
      return { ok: true, settings: room.settings };
    }

    if (cmd === "kick") {
      if (!room.settings.hostCanKick) return { ok: false, error: "kick_disabled" };
      const targetId = payload.playerId;
      if (!targetId || targetId === room.hostPlayerId) {
        return { ok: false, error: "cannot_kick" };
      }
      const idx = room.players.findIndex((p) => p.id === targetId);
      if (idx < 0) return { ok: false, error: "not_found" };
      const [gone] = room.players.splice(idx, 1);
      if (gone._socket) {
        safeSend(gone._socket, { type: "kicked" });
        try {
          gone._socket.close();
        } catch {
          /* ignore */
        }
      }
      room.updatedAt = Date.now();
      this.broadcast(room, { type: "presence", players: publicPlayers(room) });
      return { ok: true };
    }

    if (cmd === "end_room") {
      for (const p of room.players) {
        if (p._socket) {
          safeSend(p._socket, { type: "room_ended" });
          try {
            p._socket.close();
          } catch {
            /* ignore */
          }
        }
      }
      this.rooms.delete(room.code);
      return { ok: true, ended: true };
    }

    return { ok: false, error: "unknown_cmd" };
  }

  /**
   * Apply a sync game action from a player.
   */
  applyPlayerAction(room, player, action) {
    if (!room.sim) return { ok: false, error: "not_started" };
    if (!player) return { ok: false, error: "no_player" };
    expireLocks(room);

    const type = action?.type;
    // Soft field locks for writes
    if (type === "write_commit" || type === "buffer_write") {
      const field = action.payload?.field;
      if (field && !canEditField(room, player, field)) {
        return { ok: false, error: "field_locked", lock: locksPublic(room)[field] };
      }
    }
    if (type === "lock_field") {
      return this.lockField(room, player, action.payload?.field, action.payload?.ttlSec);
    }
    if (type === "unlock_field") {
      return this.unlockField(room, player, action.payload?.field);
    }

    // Apply invention text writes into sim before/with action
    if (type === "buffer_write" || type === "write_commit") {
      const field = action.payload?.field;
      const value = action.payload?.value;
      if (field && ["inventionName", "inventionHow", "inventionImpact"].includes(field)) {
        room.sim[field] = String(value ?? "").slice(0, field === "inventionName" ? 120 : 4000);
      }
      if (type === "buffer_write") {
        // no AP; just broadcast soft patch
        room.simVersion += 1;
        room.updatedAt = Date.now();
        const patch = {
          type: "patch",
          simVersion: room.simVersion,
          events: [{ type: "buffer_write", field, playerId: player.id }],
          sim: cloneSimState(room.sim),
          fieldLocks: locksPublic(room),
        };
        this.broadcast(room, patch);
        return { ok: true, ...patch };
      }
    }

    const result = applyAction(room.sim, action, {
      features: room.sim.featureFlags || friendsFeatureFlags(),
      apMax: room.sim.apMax,
      techById,
    });
    if (!result.ok) {
      return { ok: false, error: result.error || "rejected" };
    }
    room.sim = result.sim;
    room.simVersion += 1;
    room.updatedAt = Date.now();
    const patch = {
      type: "patch",
      simVersion: room.simVersion,
      events: result.events || [],
      sim: cloneSimState(room.sim),
      fieldLocks: locksPublic(room),
      actorId: player.id,
    };
    this.broadcast(room, patch);
    return { ok: true, ...patch };
  }

  lockField(room, player, field, ttlSec = 30) {
    if (!["inventionName", "inventionHow", "inventionImpact"].includes(field)) {
      return { ok: false, error: "bad_field" };
    }
    expireLocks(room);
    const existing = room.fieldLocks.get(field);
    if (existing && existing.playerId !== player.id && existing.until > Date.now()) {
      return {
        ok: false,
        error: "field_locked",
        lock: {
          field,
          playerId: existing.playerId,
          displayName: existing.displayName,
          until: existing.until,
        },
      };
    }
    const until = Date.now() + Math.min(120, Math.max(5, Number(ttlSec) || 30)) * 1000;
    room.fieldLocks.set(field, {
      playerId: player.id,
      displayName: player.displayName,
      until,
    });
    room.updatedAt = Date.now();
    const msg = { type: "locks", fieldLocks: locksPublic(room) };
    this.broadcast(room, msg);
    return { ok: true, fieldLocks: locksPublic(room) };
  }

  unlockField(room, player, field) {
    const existing = room.fieldLocks.get(field);
    if (existing && existing.playerId !== player.id && !player.isHost) {
      return { ok: false, error: "not_owner" };
    }
    room.fieldLocks.delete(field);
    this.broadcast(room, { type: "locks", fieldLocks: locksPublic(room) });
    return { ok: true, fieldLocks: locksPublic(room) };
  }

  /**
   * PR10: request co-invent AI for the room (async).
   * Reserves AP+quota, broadcasts ai_pending, proxies to coInventHandler, then resolve/reject.
   * @param {Room} room
   * @param {Player} player
   * @param {object} payload — { mode, messages?, userLabel?, clientActionId, reservedAp? }
   */
  async requestAi(room, player, payload = {}) {
    if (!room.sim) return { ok: false, error: "not_started" };
    if (!player) return { ok: false, error: "no_player" };
    if (!room.aiQuota) room.aiQuota = createRoomAiQuotaState();

    const mode = payload.mode || "chat";
    const clientActionId =
      payload.clientActionId || `ai-${player.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const reservedAp = payload.reservedAp ?? 1;

    const reserved = reserveRoomAiJob(
      room.sim,
      room.aiQuota,
      player.id,
      { mode, reservedAp, clientActionId, playerId: player.id },
      { features: room.sim.featureFlags || friendsFeatureFlags(), apMax: room.sim.apMax }
    );

    if (!reserved.ok) {
      return { ok: false, error: reserved.error || "ai_rejected" };
    }

    if (reserved.idempotent) {
      return { ok: true, idempotent: true, clientActionId };
    }

    room.sim = reserved.sim;
    room.simVersion += 1;
    room.updatedAt = Date.now();

    this.broadcast(room, {
      type: "ai_pending",
      simVersion: room.simVersion,
      sim: cloneSimState(room.sim),
      clientActionId,
      mode,
      playerId: player.id,
      displayName: player.displayName,
    });

    if (!this.coInventHandler) {
      // No handler (unit tests): leave pending; caller may complete via completeAiJob
      return {
        ok: true,
        pending: true,
        clientActionId,
        needsHandler: true,
        simVersion: room.simVersion,
      };
    }

    try {
      const body = {
        mode,
        messages: payload.messages || [
          { role: "user", content: payload.userLabel || payload.prompt || "[Room AI]" },
        ],
        context: buildRoomAiContext(room, player, payload),
      };
      const result = await this.coInventHandler(body);
      return this.completeAiJob(room, player, clientActionId, {
        ok: true,
        result,
        mode,
      });
    } catch (e) {
      return this.completeAiJob(room, player, clientActionId, {
        ok: false,
        error: e.message || "ai_failed",
        mode,
      });
    }
  }

  /**
   * Finish AI job: resolve (success) or reject (refund). Testable without network.
   */
  completeAiJob(room, player, clientActionId, outcome = {}) {
    if (!room.sim) return { ok: false, error: "not_started" };
    if (!room.aiQuota) room.aiQuota = createRoomAiQuotaState();

    if (outcome.ok === false) {
      const rejected = rejectRoomAiJob(room.sim, room.aiQuota, clientActionId, {
        features: room.sim.featureFlags || friendsFeatureFlags(),
        apMax: room.sim.apMax,
      });
      room.sim = rejected.sim;
      room.simVersion += 1;
      room.updatedAt = Date.now();
      const msg = {
        type: "ai_result",
        ok: false,
        error: outcome.error || "ai_failed",
        clientActionId,
        mode: outcome.mode || null,
        playerId: player?.id,
        simVersion: room.simVersion,
        sim: cloneSimState(room.sim),
        events: rejected.events,
      };
      this.broadcast(room, msg);
      return msg; // ok: false on the message; job completed with refund
    }

    // Apply proposals lightly onto shared sim when present
    const result = outcome.result || {};
    applyAiProposalsToSim(room.sim, result.proposals);

    const resolved = resolveRoomAiJob(room.sim, room.aiQuota, clientActionId, {
      features: room.sim.featureFlags || friendsFeatureFlags(),
    });
    room.sim = resolved.sim;
    room.simVersion += 1;
    room.updatedAt = Date.now();
    const msg = {
      type: "ai_result",
      ok: true,
      clientActionId,
      mode: outcome.mode || result.mode || null,
      playerId: player?.id,
      displayName: player?.displayName,
      result: {
        message: result.message || "",
        proposals: result.proposals || null,
        teaching: result.teaching || [],
        source: result.source || null,
        challengeSpeech: result.challengeSpeech,
        challengeQuestion: result.challengeQuestion,
        verdict: result.verdict,
        quality: result.quality,
        draftAnswer: result.draftAnswer,
      },
      simVersion: room.simVersion,
      sim: cloneSimState(room.sim),
      events: resolved.events,
    };
    this.broadcast(room, msg);
    return msg;
  }

  broadcast(room, msg, exceptSocket = null) {
    const data = JSON.stringify(msg);
    for (const p of room.players) {
      const s = p._socket;
      if (!s || s === exceptSocket) continue;
      if (s.readyState === 1) {
        try {
          s.send(data);
        } catch {
          /* ignore */
        }
      }
    }
  }

  stats() {
    return { rooms: this.rooms.size };
  }
}

function cleanName(n) {
  return String(n || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
}

function publicPlayers(room) {
  return room.players.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    connected: Boolean(p.connected),
    isHost: Boolean(p.isHost),
    role: p.role || null,
  }));
}

function expireLocks(room) {
  const now = Date.now();
  for (const [k, v] of room.fieldLocks) {
    if (!v || v.until <= now) room.fieldLocks.delete(k);
  }
}

function locksPublic(room) {
  expireLocks(room);
  const out = {};
  for (const [k, v] of room.fieldLocks) {
    out[k] = {
      playerId: v.playerId,
      displayName: v.displayName,
      until: v.until,
    };
  }
  return out;
}

function canEditField(room, player, field) {
  expireLocks(room);
  const lock = room.fieldLocks.get(field);
  if (!lock) return true;
  return lock.playerId === player.id;
}

function safeSend(socket, obj) {
  try {
    if (socket.readyState === 1) socket.send(JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

function buildRoomAiContext(room, player, payload) {
  const sim = room.sim;
  return {
    year: sim.year,
    place: sim.mission?.place,
    globalTheme: { id: sim.globalId },
    mission: sim.mission,
    inventionName: sim.inventionName,
    inventionHow: sim.inventionHow,
    inventionImpact: sim.inventionImpact,
    selectedTechIds: sim.selectedTechIds,
    pressure: sim.pressure,
    roomCode: room.code,
    playerId: player.id,
    displayName: player.displayName,
    ...(payload.context || {}),
  };
}

function applyAiProposalsToSim(sim, proposals) {
  if (!proposals || typeof proposals !== "object") return;
  if (proposals.inventionName && !String(sim.inventionName || "").trim()) {
    sim.inventionName = String(proposals.inventionName).slice(0, 120);
  }
  if (proposals.inventionHow) {
    sim.inventionHow = String(proposals.inventionHow).slice(0, 4000);
  }
  if (proposals.inventionImpact) {
    sim.inventionImpact = String(proposals.inventionImpact).slice(0, 4000);
  }
  // Tech adds still go through select_tech so AP/budget rules apply — skip silent stack mutation
}
