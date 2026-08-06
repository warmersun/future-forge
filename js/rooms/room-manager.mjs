/**
 * Friends coopetition rooms — REST create/join + WS + mp-session authority.
 * Personal invents, shared place, turn-based; AI quotas per active seat.
 */

import crypto from "node:crypto";
import { techById } from "../data.js";
import {
  createMpLobby,
  setMpQuest,
  startMpQuest,
  setFirstPlayer,
  applyMpAction,
  activeSeatId,
  publicMpState,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from "../sim/mp-session.js";
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

export class RoomManager {
  /**
   * @param {object} [opts]
   * @param {(body: object) => Promise<object>} [opts.coInventHandler]
   * @param {number} [opts.roomTtlMs]
   * @param {number} [opts.maxPlayers]
   */
  constructor(opts = {}) {
    /** @type {Map<string, object>} */
    this.rooms = new Map();
    this.roomTtlMs = opts.roomTtlMs ?? 4 * 60 * 60 * 1000;
    this.maxPlayersDefault = opts.maxPlayers ?? MAX_PLAYERS;
    this.rate = new Map();
    this.coInventHandler = opts.coInventHandler || null;
    /** Optional usage-metrics hooks (hosting cost tracking). */
    this.onRoomStart = typeof opts.onRoomStart === "function" ? opts.onRoomStart : null;
    this.onRoomEnd = typeof opts.onRoomEnd === "function" ? opts.onRoomEnd : null;
    this.onRoomPlayers = typeof opts.onRoomPlayers === "function" ? opts.onRoomPlayers : null;
  }

  _emitRoomStart(room) {
    try {
      this.onRoomStart?.(room.code, { playerCount: room.players?.length || 1 });
    } catch {
      /* ignore metrics errors */
    }
  }

  _emitRoomEnd(room) {
    try {
      const peak =
        room._playerCountPeak ||
        room.players?.length ||
        1;
      this.onRoomEnd?.(room.code, { playerCountPeak: peak });
    } catch {
      /* ignore metrics errors */
    }
  }

  _emitRoomPlayers(room) {
    try {
      const n = room.players?.length || 0;
      room._playerCountPeak = Math.max(room._playerCountPeak || 0, n);
      this.onRoomPlayers?.(room.code, n);
    } catch {
      /* ignore metrics errors */
    }
  }

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
        this._emitRoomEnd(room);
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

    const room = {
      code: code.toUpperCase(),
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
        mode: "friends_coopetition",
        apMax: 3,
        minPlayers: MIN_PLAYERS,
        maxPlayers: this.maxPlayersDefault,
        personalInventions: true,
        sharedPlace: true,
        openTable: true,
        turnBased: true,
        layerEmTechOnOthers: true,
        scrutinyCombat: false,
        deployStages: true,
        hostCanKick: true,
        hostCanResolveScrutiny: false,
        allowRejoinByToken: true,
        allowRejoinByName: true,
      },
      /** @type {object|null} mp-session */
      mp: null,
      simVersion: 0,
      createdAt: now,
      updatedAt: now,
      fieldLocks: new Map(),
      sockets: new Set(),
      questMeta: null,
      aiQuota: createRoomAiQuotaState(),
      _playerCountPeak: 1,
    };
    this.rooms.set(room.code, room);
    this._emitRoomStart(room);

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

    if (playerToken) {
      const seat = room.players.find((p) => p.playerToken === playerToken);
      if (seat) {
        seat.connected = true;
        if (room.mp?.invents?.[seat.id]) {
          room.mp.invents[seat.id].connected = true;
        }
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
        if (room.mp?.invents?.[seat.id]) {
          room.mp.invents[seat.id].connected = true;
        }
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

    if (room.mp) {
      return { ok: false, error: "already_started", status: 403 };
    }

    if (room.players.length >= (room.settings.maxPlayers || MAX_PLAYERS)) {
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
    this._emitRoomPlayers(room);
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
    // Rejoin mid-game: invent can receive seat-turns again
    if (room.mp?.invents?.[player.id]) {
      room.mp.invents[player.id].connected = true;
    }
    room.updatedAt = Date.now();
    this.broadcast(room, { type: "presence", players: publicPlayers(room) }, socket);
  }

  unbindSocket(socket) {
    for (const room of this.rooms.values()) {
      if (!room.sockets.has(socket)) continue;
      room.sockets.delete(socket);
      /** @type {object|null} */
      let left = null;
      for (const p of room.players) {
        if (p._socket === socket) {
          p.connected = false;
          p._socket = null;
          left = p;
        }
      }
      room.updatedAt = Date.now();
      this.broadcast(room, { type: "presence", players: publicPlayers(room) });

      // Mid-game disconnect handling (left alone / stuck active seat)
      if (room.mp?.place?.status === "playing" && left) {
        this.handlePlayerDisconnectDuringPlay(room, left);
      }
    }
  }

  /**
   * When someone drops mid-race: mark invent offline (sticky skip on later End turns),
   * skip their turn if they were active, and notify remaining players.
   */
  handlePlayerDisconnectDuringPlay(room, leftPlayer) {
    if (!room.mp) return;
    const connected = room.players.filter((p) => p.connected);
    const connectedIds = connected.map((p) => p.id);
    const activeId = activeSeatId(room.mp);

    // Sticky offline on invent — passToNext always skips invent.connected === false
    const leftInvent = room.mp.invents?.[leftPlayer.id];
    if (leftInvent) {
      leftInvent.connected = false;
      leftInvent.lastNews = leftInvent.lastNews || "Disconnected.";
    }
    // Bump version so clients hydrate invent.connected even when we don't advance turn
    room.mp.version = (room.mp.version || 0) + 1;

    let endResult = null;
    // If the active player left, force end_turn (skip offline seats)
    if (activeId === leftPlayer.id && connected.length >= 1) {
      const cur = activeId;
      if (room.mp.invents[cur]) {
        room.mp.invents[cur].apSpentThisTurn = Math.max(
          1,
          room.mp.invents[cur].apSpentThisTurn || 0
        );
      }
      endResult = applyMpAction(
        room.mp,
        {
          type: "end_turn",
          payload: { force: true, preferConnectedIds: connectedIds },
        },
        cur
      );
      if (endResult.ok) {
        room.mp = endResult.session;
      } else {
        endResult = null;
      }
    }

    // Always commit invent.connected=false (+ optional seat handoff) so later End turns skip them
    this._commitMp(
      room,
      {
        session: room.mp,
        events: [
          ...(endResult?.events || []),
          {
            type: "seat_skipped_offline",
            seatId: leftPlayer.id,
            displayName: leftPlayer.displayName,
            advanced: Boolean(endResult),
          },
        ],
      },
      leftPlayer,
      []
    );

    if (connected.length === 1) {
      const sole = connected[0];
      this.broadcast(room, {
        type: "alone",
        connectedCount: 1,
        playerId: sole.id,
        displayName: sole.displayName,
        leftDisplayName: leftPlayer.displayName,
        message: `${leftPlayer.displayName || "A player"} left. You're the only one still connected — you can keep playing alone or leave the room.`,
      });
    } else if (connected.length === 0) {
      this._emitRoomEnd(room);
      this.rooms.delete(room.code);
    } else {
      this.broadcast(room, {
        type: "player_left",
        playerId: leftPlayer.id,
        displayName: leftPlayer.displayName,
        connectedCount: connected.length,
        message: `${leftPlayer.displayName || "A player"} disconnected.`,
      });
    }
  }

  snapshotFor(room, playerId) {
    expireLocks(room);
    const you = room.players.find((p) => p.id === playerId) || null;
    const mp = room.mp ? publicMpState(room.mp) : null;
    // Prefer function on live session — never trust a missing field on publicMpState alone
    const activeId =
      (room.mp ? activeSeatId(room.mp) : null) || mp?.activeSeatId || null;
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
            isActive: you.id === activeId,
            invent: mp?.invents?.[you.id] || null,
          }
        : null,
      mp,
      place: mp?.place || null,
      invents: mp?.invents || null,
      openTable: mp?.openTable || null,
      ranking: mp?.ranking || null,
      nextQuestChooserId: this.nextQuestChooserId(room),
      activeSeatId: activeId,
      // Per-player invent + place shim for AI / UI helpers
      sim: mp && you ? inventPlaceShim(mp, you.id) : null,
      questMeta: room.questMeta,
      fieldLocks: locksPublic(room),
      phase: room.mp
        ? room.mp.place?.status === "won" ||
          room.mp.place?.status === "collapsed" ||
          room.mp.place?.status === "abandoned_by_vote"
          ? "outcome"
          : "playing"
        : room.questMeta
          ? "ready"
          : "lobby",
      questExit: room.mp?.questExit
        ? publicMpState(room.mp)?.questExit
        : null,
    };
  }

  /** Quest finished (full hold, collapse, or majority leave) — next-Quest chooser allowed */
  isQuestOutcome(room) {
    const st = room?.mp?.place?.status;
    return st === "won" || st === "collapsed" || st === "abandoned_by_vote";
  }

  /**
   * Who landed the solving deployment (fielded Scale that held the Quest).
   * Prefer place.solverSeatId; else invent with landedSolvingScale (scaledBySeatId or seat).
   */
  solvingSeatId(mp) {
    if (!mp?.place || mp.place.status !== "won") return null;
    if (mp.place.solverSeatId) return mp.place.solverSeatId;
    const invents = mp.invents || {};
    for (const [seatId, f] of Object.entries(invents)) {
      if (!f?.landedSolvingScale) continue;
      // Prefer the player who fielded the Scale (may be a helper)
      if (f.scaledBySeatId && invents[f.scaledBySeatId]) return f.scaledBySeatId;
      return seatId;
    }
    // Actor credit when helper scaled someone else's invent
    for (const [seatId, f] of Object.entries(invents)) {
      if (f?.landedSolvingScale) return seatId;
    }
    return null;
  }

  /** Who may pick the next Challenge (solver on win; host on collapse) */
  nextQuestChooserId(room) {
    if (room.nextQuestChooserId) return room.nextQuestChooserId;
    const solver = this.solvingSeatId(room.mp);
    if (solver) return solver;
    const rows = room.mp?.ranking?.rows;
    if (room.mp?.place?.status === "won" && rows?.[0]?.seatId) return rows[0].seatId;
    return room.hostPlayerId || null;
  }

  /** Assign next-Challenge chooser when a Challenge ends */
  refreshNextQuestChooser(room) {
    if (!this.isQuestOutcome(room)) {
      room.nextQuestChooserId = null;
      return;
    }
    if (room.mp?.place?.status === "won") {
      // Solver who landed the closing deployment — not merely rank #1
      room.nextQuestChooserId =
        this.solvingSeatId(room.mp) ||
        room.mp?.ranking?.rows?.[0]?.seatId ||
        room.hostPlayerId ||
        null;
    } else {
      // Collapse / majority leave → host picks next Challenge
      room.nextQuestChooserId = room.hostPlayerId || null;
    }
  }

  hostCommand(room, player, cmd, payload = {}) {
    const isHost =
      Boolean(player?.isHost) ||
      (payload?.hostToken && payload.hostToken === room.hostToken);
    const outcome = this.isQuestOutcome(room);
    const chooserId = this.nextQuestChooserId(room);
    const isRematchChooser = Boolean(player?.id && chooserId && player.id === chooserId);

    // Quest pick / start: host for lobby; after outcome only the next-Quest chooser
    const isSetQuest = cmd === "set_quest";
    const isStartQuest = cmd === "start_quest";
    if (isSetQuest || isStartQuest) {
      if (outcome) {
        if (!isRematchChooser) {
          return { ok: false, error: "not_quest_chooser" };
        }
      } else if (!isHost) {
        return { ok: false, error: "not_host" };
      }
    } else if (!isHost) {
      return { ok: false, error: "not_host" };
    }

    if (isSetQuest) {
      // Mid-Quest: locked. Lobby or post-outcome next Quest: ok.
      if (room.mp && !outcome) return { ok: false, error: "already_started" };
      const mission = payload.mission;
      const globalId = payload.globalId || mission?.globalId;
      if (!mission?.id) return { ok: false, error: "mission_required" };
      room.questMeta = { globalId, mission };
      room.updatedAt = Date.now();
      const phase = outcome ? "next_quest_ready" : "ready";
      const chooser = this.nextQuestChooserId(room);
      this.broadcast(room, {
        type: "lobby",
        questMeta: room.questMeta,
        phase,
        nextQuestChooserId: chooser,
      });
      return {
        ok: true,
        phase,
        snapshot: this.snapshotFor(room, player?.id),
      };
    }

    if (isStartQuest) {
      // Fresh start: no mp yet. Next Quest: only after previous Quest ended.
      if (room.mp && !outcome) return { ok: false, error: "already_started" };
      const connected = room.players.filter((p) => p.connected);
      if (connected.length < MIN_PLAYERS && room.players.length < MIN_PLAYERS) {
        return { ok: false, error: "min_players", min: MIN_PLAYERS };
      }
      // Prefer currently connected players for the new lobby; keep disconnected out of seats
      const seats = (connected.length >= MIN_PLAYERS ? connected : room.players).map(
        (p) => ({
          id: p.id,
          displayName: p.displayName,
          isHost: p.isHost,
        })
      );
      if (seats.length < MIN_PLAYERS) {
        return { ok: false, error: "min_players", min: MIN_PLAYERS };
      }

      const meta = room.questMeta || payload;
      const mission = meta.mission || payload.mission;
      if (!mission) return { ok: false, error: "mission_required" };
      if (payload.mission) {
        room.questMeta = {
          globalId: payload.globalId || mission.globalId,
          mission,
        };
      }

      let mp = createMpLobby(seats, {
        mode: "friends_coopetition",
        apMax: room.settings.apMax || 3,
        settings: {
          deployStages: true,
          multiplayer: true,
        },
      });
      mp = setMpQuest(
        mp,
        mission,
        room.questMeta?.globalId || mission.globalId
      );
      // Solver/host who picks next Quest goes first when possible
      const first =
        outcome && isRematchChooser
          ? player.id
          : "host";
      mp = setFirstPlayer(mp, first === "host" ? "host" : first);
      const started = startMpQuest(mp);
      if (!started.ok) return { ok: false, error: started.error || "start_failed" };

      room.mp = started.session;
      room.simVersion = room.mp.version || 1;
      room.nextQuestChooserId = null;
      room.questMeta = {
        globalId: room.questMeta?.globalId || mission.globalId,
        mission,
      };
      room.updatedAt = Date.now();

      for (const p of room.players) {
        if (p._socket && p._socket.readyState === 1) {
          safeSend(p._socket, {
            type: "snapshot",
            snapshot: this.snapshotFor(room, p.id),
          });
        }
      }
      // First start vs rematch: clients key off this to enter play once
      this.broadcast(room, {
        type: outcome ? "next_quest_started" : "quest_started",
        phase: "playing",
        code: room.code,
        simVersion: room.simVersion,
      });
      return { ok: true, simVersion: room.simVersion, rematch: Boolean(outcome) };
    }

    if (cmd === "set_settings") {
      if (room.mp) return { ok: false, error: "already_started" };
      const allowed = ["maxPlayers", "scrutinyCombat", "deployStages", "apMax"];
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
      if (room.mp) return { ok: false, error: "cannot_kick_after_start" };
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

    if (cmd === "force_end_turn") {
      if (!room.mp) return { ok: false, error: "not_started" };
      const active = activeSeatId(room.mp);
      if (!active) return { ok: false, error: "no_active" };
      const connectedIds = room.players.filter((p) => p.connected).map((p) => p.id);
      const r = applyMpAction(
        room.mp,
        {
          type: "end_turn",
          payload: {
            force: true,
            preferConnectedIds: connectedIds.length ? connectedIds : undefined,
          },
        },
        active
      );
      if (!r.ok) return { ok: false, error: r.error || "rejected" };
      return this._commitMp(room, r, player, [{ type: "force_end_turn", by: player.id }]);
    }

    return { ok: false, error: "unknown_cmd" };
  }

  /**
   * Apply a game action from a player (must be active seat for most actions).
   */
  applyPlayerAction(room, player, action) {
    if (!room.mp) return { ok: false, error: "not_started" };
    if (!player) return { ok: false, error: "no_player" };
    expireLocks(room);

    const type = action?.type;

    // Soft locks only apply when writing your own invent (optional UX)
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

    // Leave-Quest vote: any seated player; denominator = currently connected seats
    const voteOpts = {};
    if (type === "vote_leave_quest" || type === "unvote_leave_quest") {
      voteOpts.eligibleIds = room.players
        .filter((p) => p.connected)
        .map((p) => p.id);
      if (!voteOpts.eligibleIds.length) {
        voteOpts.eligibleIds = (room.mp.seatOrder || []).slice();
      }
    }

    // Skip offline seats on End turn / Wait so handoff reaches a connected player
    if (
      (type === "end_turn" || type === "wait") &&
      action &&
      typeof action === "object"
    ) {
      const connectedIds = room.players
        .filter((p) => p.connected)
        .map((p) => p.id);
      if (connectedIds.length) {
        action = {
          ...action,
          payload: {
            ...(action.payload || {}),
            preferConnectedIds:
              action.payload?.preferConnectedIds || connectedIds,
          },
        };
      }
    }
    const result = applyMpAction(room.mp, action, player.id, voteOpts);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error || "rejected",
        activeSeatId: activeSeatId(room.mp),
      };
    }
    return this._commitMp(room, result, player, result.events || []);
  }

  _commitMp(room, result, player, extraEvents = []) {
    room.mp = result.session;
    room.simVersion = room.mp.version || room.simVersion + 1;
    room.updatedAt = Date.now();
    // When race ends, freeze rematch chooser (winner, or host on collapse)
    this.refreshNextQuestChooser(room);
    const events = [...(result.events || []), ...extraEvents];
    const patch = {
      type: "patch",
      simVersion: room.simVersion,
      events,
      actorId: player?.id,
      mp: publicMpState(room.mp),
      place: publicMpState(room.mp)?.place,
      invents: publicMpState(room.mp)?.invents,
      openTable: publicMpState(room.mp)?.openTable,
      ranking: room.mp.ranking,
      nextQuestChooserId: this.nextQuestChooserId(room),
      activeSeatId: activeSeatId(room.mp),
      fieldLocks: locksPublic(room),
      questExit: publicMpState(room.mp)?.questExit || null,
            phase:
        room.mp.place?.status === "won" ||
        room.mp.place?.status === "collapsed" ||
        room.mp.place?.status === "abandoned_by_vote"
          ? "outcome"
          : "playing",
    };
    // Personalized sim shim per client
    for (const p of room.players) {
      if (p._socket && p._socket.readyState === 1) {
        const payload = {
          ...patch,
          sim: inventPlaceShim(publicMpState(room.mp), p.id),
          you: {
            id: p.id,
            displayName: p.displayName,
            isHost: p.isHost,
            isActive: p.id === activeSeatId(room.mp),
            invent: room.mp.invents[p.id] || null,
          },
        };
        try {
          const bytes = JSON.stringify(payload).length;
          if (bytes > 50000 || (room._patchLogN = (room._patchLogN || 0) + 1) <= 3) {
            console.log(`[rooms] patch ${room.code} -> ${p.displayName} ${bytes}B events=${(events||[]).map(e=>e.type).join(',')}`);
          }
          if (bytes > 200000) console.warn(`[rooms] HUGE patch ${bytes}B`);
        } catch {}
        safeSend(p._socket, payload);
      }
    }
    return { ok: true, ...patch, sim: inventPlaceShim(publicMpState(room.mp), player?.id) };
  }

  lockField(room, player, field, ttlSec = 30) {
    if (!["inventionName", "inventionHow", "inventionImpact"].includes(field)) {
      return { ok: false, error: "bad_field" };
    }
    // Per-player field key so open-table doesn't block others
    const key = `${player.id}:${field}`;
    expireLocks(room);
    const until = Date.now() + Math.min(120, Math.max(5, Number(ttlSec) || 30)) * 1000;
    room.fieldLocks.set(key, {
      playerId: player.id,
      displayName: player.displayName,
      until,
      field,
    });
    room.updatedAt = Date.now();
    const msg = { type: "locks", fieldLocks: locksPublic(room) };
    this.broadcast(room, msg);
    return { ok: true, fieldLocks: locksPublic(room) };
  }

  unlockField(room, player, field) {
    const key = `${player.id}:${field}`;
    const existing = room.fieldLocks.get(key);
    if (existing && existing.playerId !== player.id && !player.isHost) {
      return { ok: false, error: "not_owner" };
    }
    room.fieldLocks.delete(key);
    // also clear unscoped keys
    room.fieldLocks.delete(field);
    this.broadcast(room, { type: "locks", fieldLocks: locksPublic(room) });
    return { ok: true, fieldLocks: locksPublic(room) };
  }

  async requestAi(room, player, payload = {}) {
    if (!room.mp) return { ok: false, error: "not_started" };
    if (!player) return { ok: false, error: "no_player" };
    if (activeSeatId(room.mp) !== player.id) {
      return { ok: false, error: "not_active_seat" };
    }
    if (!room.aiQuota) room.aiQuota = createRoomAiQuotaState();

    const mode = payload.mode || "chat";
    const clientActionId =
      payload.clientActionId ||
      `ai-${player.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const reservedAp = payload.reservedAp ?? 1;

    const slice = inventPlaceShim(publicMpState(room.mp), player.id);
    if (!slice) return { ok: false, error: "no_forge" };

    const reserved = reserveRoomAiJob(
      slice,
      room.aiQuota,
      player.id,
      { mode, reservedAp, clientActionId, playerId: player.id },
      { features: { actionPoints: true, multiplayer: true }, apMax: slice.apMax }
    );

    if (!reserved.ok) {
      return { ok: false, error: reserved.error || "ai_rejected" };
    }
    if (reserved.idempotent) {
      return { ok: true, idempotent: true, clientActionId };
    }

    applySliceToChallenge(room.mp, player.id, reserved.sim);
    room.simVersion = (room.mp.version || 0) + 1;
    room.mp.version = room.simVersion;
    room.updatedAt = Date.now();

    this.broadcast(room, {
      type: "ai_pending",
      simVersion: room.simVersion,
      mp: publicMpState(room.mp),
      sim: inventPlaceShim(publicMpState(room.mp), player.id),
      clientActionId,
      mode,
      playerId: player.id,
      displayName: player.displayName,
    });

    if (!this.coInventHandler) {
      return {
        ok: true,
        pending: true,
        clientActionId,
        needsHandler: true,
        simVersion: room.simVersion,
      };
    }

    try {
      const messages =
        Array.isArray(payload.messages) && payload.messages.length
          ? payload.messages
          : [
              {
                role: "user",
                content: payload.userLabel || payload.prompt || "[Room AI]",
              },
            ];
      const body = {
        mode,
        messages,
        clientSessionId: payload.clientSessionId || null,
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

  completeAiJob(room, player, clientActionId, outcome = {}) {
    if (!room.mp) return { ok: false, error: "not_started" };
    if (!room.aiQuota) room.aiQuota = createRoomAiQuotaState();
    const slice = inventPlaceShim(publicMpState(room.mp), player.id);
    if (!slice) return { ok: false, error: "no_forge" };

    if (outcome.ok === false) {
      const rejected = rejectRoomAiJob(slice, room.aiQuota, clientActionId, {
        features: { actionPoints: true },
        apMax: slice.apMax,
      });
      applySliceToChallenge(room.mp, player.id, rejected.sim);
      room.simVersion = (room.mp.version || 0) + 1;
      room.mp.version = room.simVersion;
      room.updatedAt = Date.now();
      const msg = {
        type: "ai_result",
        ok: false,
        error: outcome.error || "ai_failed",
        clientActionId,
        mode: outcome.mode || null,
        playerId: player?.id,
        simVersion: room.simVersion,
        mp: publicMpState(room.mp),
        sim: inventPlaceShim(publicMpState(room.mp), player?.id),
        events: rejected.events,
      };
      this.broadcast(room, msg);
      return msg;
    }

    const result = outcome.result || {};
    applyAiProposalsToChallenge(room.mp, player.id, result.proposals);

    const slice2 = inventPlaceShim(publicMpState(room.mp), player.id);
    const resolved = resolveRoomAiJob(slice2, room.aiQuota, clientActionId, {
      features: { actionPoints: true },
    });
    applySliceToChallenge(room.mp, player.id, resolved.sim);
    room.simVersion = (room.mp.version || 0) + 1;
    room.mp.version = room.simVersion;
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
      mp: publicMpState(room.mp),
      sim: inventPlaceShim(publicMpState(room.mp), player?.id),
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
      field: v.field || k,
    };
  }
  return out;
}

function canEditField(room, player, field) {
  expireLocks(room);
  const key = `${player.id}:${field}`;
  const lock = room.fieldLocks.get(key) || room.fieldLocks.get(field);
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

/** Merge place + personal invent into a solo-like sim slice for AI / UI. */
function inventPlaceShim(mp, playerId) {
  if (!mp?.place || !playerId) return null;
  const f = mp.invents?.[playerId];
  if (!f) return null;
  // Personal invent calendar for feasibility / AI timing (not shared place baseline)
  const year = f.year != null ? f.year : mp.place.year;
  const waits = f.waits != null ? f.waits : mp.place.waits || 0;
  return {
    year,
    turn: mp.place.turn,
    waits,
    pressure: { ...(mp.place.pressure || {}) },
    mission: mp.place.mission,
    globalId: mp.place.globalId,
    lastNews: mp.place.lastNews,
    ap: f.ap,
    apMax: f.apMax,
    budget: f.budget,
    will: f.will,
    inventionName: f.inventionName,
    inventionHow: f.inventionHow,
    inventionImpact: f.inventionImpact,
    selectedTechIds: (f.stack || []).map((x) => x.techId),
    challengePassed: f.challengePassed,
    challengeVerdict: f.challengeVerdict,
    challengeAnswer: f.challengeAnswer,
    hadChallengeAttempt: f.hadChallengeAttempt,
    deployStage: f.deployStage,
    abandoned: f.abandoned,
    pendingAi: f.pendingAi || null,
    turnPhase: f.pendingAi ? "ai_pending" : f.turnPhase || "act",
    featureFlags: {
      actionPoints: true,
      budgetWill: true,
      multiplayer: true,
      deployStages: true,
    },
    apSpentThisTurn: f.apSpentThisTurn || 0,
  };
}

function applySliceToChallenge(mp, playerId, slice) {
  const f = mp.invents[playerId];
  if (!f || !slice) return;
  f.ap = slice.ap;
  f.pendingAi = slice.pendingAi || null;
  if (slice.turnPhase === "ai_pending") {
    /* keep invent turnPhase */
  } else if (slice.turnPhase) {
    f.turnPhase = slice.turnPhase === "act" ? f.turnPhase : slice.turnPhase;
  }
  if (slice.inventionName != null) f.inventionName = slice.inventionName;
  if (slice.inventionHow != null) f.inventionHow = slice.inventionHow;
  if (slice.inventionImpact != null) f.inventionImpact = slice.inventionImpact;
}

function applyAiProposalsToChallenge(mp, playerId, proposals) {
  if (!proposals || typeof proposals !== "object") return;
  const f = mp.invents[playerId];
  if (!f) return;
  if (proposals.inventionName && !String(f.inventionName || "").trim()) {
    f.inventionName = String(proposals.inventionName).slice(0, 120);
  }
  if (proposals.inventionHow) {
    f.inventionHow = String(proposals.inventionHow).slice(0, 4000);
  }
  if (proposals.inventionImpact) {
    f.inventionImpact = String(proposals.inventionImpact).slice(0, 4000);
  }
}

function buildRoomAiContext(room, player, payload) {
  const mp = publicMpState(room.mp);
  const f = mp?.invents?.[player.id];
  // AI feasibility / timing must use the invent owner's personal year
  const inventYear = f?.year != null ? f.year : mp?.place?.year;
  const mission = mp?.place?.mission;
  return {
    year: inventYear,
    place: mission?.place,
    globalTheme: { id: mp?.place?.globalId },
    mission,
    inventionName: f?.inventionName,
    inventionHow: f?.inventionHow,
    inventionImpact: f?.inventionImpact,
    selectedTechIds: (f?.stack || []).map((x) => x.techId),
    pressure: mp?.place?.pressure,
    grounding: mission?.grounding || null,
    roomCode: room.code,
    playerId: player.id,
    displayName: player.displayName,
    openTable: mp?.openTable,
    ...(payload.context || {}),
  };
}

// silence unused in case techById needed later for host tools
void techById;
