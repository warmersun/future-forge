/**
 * Friends room UI — lobby + shared invent + room AI (PR9–11) + hotseat entry (PR12).
 */

import { techById, GLOBALS } from "../data.js";
import { briefForGlobal } from "../problem-briefs.js";
import { techCost } from "../sim/economy.js";
import { RoomClient } from "./client.js";
import {
  createHotseatSession,
  activeSeat,
  activeInvent,
  getOpenTable,
  setHotseatQuest,
  startHotseatQuest,
  hotseatApplyAction,
} from "./hotseat.js";
import { paintFieldLockElements } from "./locks-ui.js";
import { MpSidePanel } from "./mp-side.js";
import { paintScenarioBrief } from "./mission-picker.js";
import {
  paintTechFilters,
  paintTechLibrary,
  paintSelectedStack,
} from "./tech-library.js";
import { describeMarketEffects } from "../sim/market-news.js";

/**
 * @param {{
 *   showScreen: Function,
 *   flashToast: Function,
 *   $: Function,
 *   $$: Function,
 *   escapeHtml: Function,
 *   beginMissionPick?: Function,
 *   clearMissionPickSession?: Function,
 *   openWaitConfirm?: Function,
 *   queueMarketNewsModal?: Function,
 * }} api
 */
export function initFriendsUi(api) {
  const {
    showScreen,
    flashToast,
    $,
    $$,
    escapeHtml,
    beginMissionPick,
    clearMissionPickSession,
    enterHotseatPlay,
    leaveHotseat,
    enterRoomPlay,
    leaveRoomPlay,
    queueMarketNewsModal,
    openWaitConfirm,
  } = api;
  const client = new RoomClient();
  let bufferTimers = {};
  /** @type {import('./hotseat.js').HotseatSession|null} */
  let hotseat = null;
  let hsWired = false;
  /** @type {MpSidePanel|null} */
  let hsSide = null;
  /** @type {MpSidePanel|null} */
  let roomSide = null;
  let roomSideMounted = false;
  /** Prevent host freeze: enterRoomPlay only once per race */
  let roomPlayEnteredFor = "";

  /** Room host mission pick (from solo screens) */
  let roomPick = { globalId: null, mission: null };
  /** Domain filter for hotseat / room tech library */
  let hsDomainFilter = "all";
  let mpDomainFilter = "all";
  let hsVisionFingerprint = "";
  /** Last market news id shown (modal + banner) for MP surfaces */
  let lastMarketNewsId = null;

  function setHubStatus(msg) {
    const el = $("#friends-hub-status");
    if (el) el.textContent = msg || "";
  }

  /**
   * Compact market banner + optional modal when a full seat-round rolls new prices.
   * @param {string} bannerId
   * @param {object|null|undefined} news
   * @param {number} [round]
   */
  function paintMarketBanner(bannerId, news, round) {
    const host = $(bannerId);
    if (!host) return;
    if (!news) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    const desc = describeMarketEffects(news, {
      techName: (id) => techById(id)?.name || id,
    });
    host.hidden = false;
    host.dataset.tone = news.tone || "mixed";
    host.innerHTML = `
      <button type="button" class="market-news-banner-btn" data-market-open="1" title="Open market bulletin">
        <span class="market-news-banner-thumb" aria-hidden="true">
          <span class="market-news-banner-icon">${escapeHtml(news.icon || "📰")}</span>
        </span>
        <span class="market-news-banner-text">
          <span class="market-news-banner-kicker">Market · Round ${escapeHtml(
            String(news.round ?? round ?? 1)
          )}</span>
          <strong>${escapeHtml(news.headline || "Market shift")}</strong>
          <span class="market-news-banner-effects">
            ${escapeHtml(desc.scope)} · ${desc.effects.map(escapeHtml).join(" · ")}
          </span>
        </span>
      </button>`;
    host.querySelector("[data-market-open]")?.addEventListener("click", () => {
      if (typeof queueMarketNewsModal === "function") {
        queueMarketNewsModal(news, { force: true });
      }
    });
    if (news.id && news.id !== lastMarketNewsId) {
      lastMarketNewsId = news.id;
      if (typeof queueMarketNewsModal === "function") {
        queueMarketNewsModal(news, { force: true });
      }
    }
  }

  function setLobbyStatus(msg) {
    const el = $("#room-lobby-status");
    if (el) el.textContent = msg || "";
  }

  function setPlayStatus(msg) {
    const el = $("#mp-status");
    if (el) el.textContent = msg || "";
  }

  /** @type {{ port?: number, lanIps?: string[], lanUrls?: string[] } | null} */
  let lanJoinInfo = null;
  let lanJoinInfoPromise = null;

  async function ensureLanJoinInfo() {
    if (lanJoinInfo) return lanJoinInfo;
    if (lanJoinInfoPromise) return lanJoinInfoPromise;
    lanJoinInfoPromise = fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        lanJoinInfo = {
          port: data.port || 8765,
          lanIps: Array.isArray(data.lanIps) ? data.lanIps : [],
          lanUrls: Array.isArray(data.lanUrls) ? data.lanUrls : [],
        };
        // Fallback: if server omitted URLs but we have port, still empty list
        if (!lanJoinInfo.lanUrls.length && lanJoinInfo.lanIps.length) {
          lanJoinInfo.lanUrls = lanJoinInfo.lanIps.map(
            (ip) => `http://${ip}:${lanJoinInfo.port}`
          );
        }
        return lanJoinInfo;
      })
      .catch(() => {
        lanJoinInfo = { port: 8765, lanIps: [], lanUrls: [] };
        return lanJoinInfo;
      });
    return lanJoinInfoPromise;
  }

  function renderRoomConnectInfo(code) {
    const codeBig = $("#room-connect-code");
    if (codeBig) codeBig.textContent = code || "————";

    const ul = $("#room-connect-urls");
    const hint = $("#room-connect-hint");
    if (!ul) return;

    const urls = lanJoinInfo?.lanUrls || [];
    const port = lanJoinInfo?.port || 8765;

    if (!lanJoinInfo) {
      ul.innerHTML = `<li class="muted">Loading network address…</li>`;
      return;
    }

    if (!urls.length) {
      ul.innerHTML = `<li class="muted">No private LAN IP found on this machine. Check Wi‑Fi, or share <code>http://&lt;host-ip&gt;:${port}</code> manually.</li>`;
      if (hint) {
        hint.textContent =
          "On the host, run npm start and note the “LAN” lines in the terminal. Friends open that URL, then Join with the room code.";
      }
      return;
    }

    ul.innerHTML = urls
      .map(
        (u) =>
          `<li><a class="room-connect-url" href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(
            u
          )}</a></li>`
      )
      .join("");
    if (hint) {
      hint.textContent =
        "Same local network only (not the public Internet). They open the link → Play with friends → Join → room code + name.";
    }
  }

  function buildJoinInfoText(code) {
    const c = (code || "").toUpperCase();
    const urls = lanJoinInfo?.lanUrls || [];
    const lines = [
      "Future Forge — join my room",
      `Room code: ${c}`,
      "",
      "On the same Wi‑Fi, open:",
      ...(urls.length ? urls : ["(ask host for their LAN IP and port)"]),
      "",
      "Then: Play with friends → Join → enter code and your name.",
    ];
    return lines.join("\n");
  }

  function renderLobby() {
    const snap = client.snapshot;
    if (!snap) return;
    const code = snap.code || client.session?.code || "————";
    const codeEl = $("#room-code-display");
    if (codeEl) codeEl.textContent = code;
    renderRoomConnectInfo(code);
    // Refresh LAN IPs in background (first paint may be "loading")
    ensureLanJoinInfo().then(() => renderRoomConnectInfo(code));
    const list = $("#room-player-list");
    if (list) {
      list.innerHTML = (snap.players || [])
        .map(
          (p) =>
            `<li class="${p.connected ? "is-online" : "is-offline"}">
              <strong>${escapeHtml(p.displayName)}</strong>
              ${p.isHost ? '<span class="tag">host</span>' : ""}
              <span class="muted">${p.connected ? "online" : "away"}</span>
            </li>`
        )
        .join("");
    }
    const you = $("#room-you-line");
    if (you && snap.you) {
      you.textContent = `You are ${snap.you.displayName}${snap.you.isHost ? " (host)" : ""}.`;
    }
    const hostBox = $("#room-host-controls");
    if (hostBox) hostBox.hidden = !snap.you?.isHost;
    const guestBox = $("#room-guest-mission");
    if (guestBox) guestBox.hidden = Boolean(snap.you?.isHost);

    const briefMission = roomPick.mission || snap.questMeta?.mission || null;
    const briefGid = roomPick.globalId || snap.questMeta?.globalId || briefMission?.globalId;
    paintScenarioBrief($("#room-scenario-brief"), briefMission, {
      escapeHtml,
      globalId: briefGid,
      heading: briefMission ? "Selected Quest" : "Quest",
    });

    const summary = $("#room-mission-summary");
    if (summary) {
      if (snap.questMeta?.mission) {
        const m = snap.questMeta.mission;
        summary.textContent = `Ready: ${m.title} · ${m.place}`;
      } else if (roomPick.mission) {
        summary.textContent = `Selected: ${roomPick.mission.title} · ${roomPick.mission.place}. Start when the party is ready.`;
      } else {
        summary.textContent = snap.you?.isHost
          ? "Use the same crisis → Quest screens as solo play, then start the Quest."
          : "Waiting for host to pick a crisis and a Quest…";
      }
    }

    const startBtn = $("#btn-room-start");
    if (startBtn) {
      startBtn.disabled = !(roomPick.mission || snap.questMeta?.mission);
    }

    if (snap.phase === "playing" || snap.mp?.place) {
      // Same workshop + Challenge screen as hotseat (not invent-inline challenge)
      tryEnterRoomPlayOnce("lobby-render");
    }
  }

  function roomRaceKey() {
    const s = client.snapshot;
    if (!s) return "";
    return `${s.code || ""}|${s.simVersion || s.mp?.version || 0}|${
      s.place?.mission?.id || s.mp?.place?.mission?.id || ""
    }`;
  }

  /** Host was freezing: every snapshot/presence re-entered full room play setup. */
  function tryEnterRoomPlayOnce(reason = "") {
    if (typeof enterRoomPlay !== "function") {
      showScreen("room-play");
      renderPlay();
      return;
    }
    const key = roomRaceKey();
    if (!key) return;
    if (roomPlayEnteredFor === key) return;
    roomPlayEnteredFor = key;
    try {
      enterRoomPlay(client);
    } catch (e) {
      console.error("[friends] enterRoomPlay", reason, e);
      roomPlayEnteredFor = "";
    }
  }

  function currentHostMission() {
    if (roomPick.mission) {
      return { globalId: roomPick.globalId, mission: roomPick.mission };
    }
    const snap = client.snapshot;
    if (snap?.questMeta?.mission) {
      return {
        globalId: snap.questMeta.globalId,
        mission: snap.questMeta.mission,
      };
    }
    return { globalId: null, mission: null };
  }

  function launchRoomMissionPick() {
    if (typeof beginMissionPick !== "function") {
      flashToast("Mission pick unavailable");
      return;
    }
    beginMissionPick({
      onSelect: async (mission, global) => {
        roomPick = {
          globalId: global?.id || mission.globalId,
          mission,
        };
        try {
          await client.hostCmd("set_quest", {
            globalId: roomPick.globalId,
            mission,
          });
          if (client.snapshot) {
            client.snapshot.questMeta = {
              globalId: roomPick.globalId,
              mission,
            };
            client.snapshot.phase = "ready";
          }
          setLobbyStatus(`Mission set: ${mission.title}`);
        } catch (e) {
          flashToast(e.message || "Could not set mission");
        }
        showScreen("room-lobby");
        renderLobby();
      },
      onCancel: () => {
        showScreen("room-lobby");
        renderLobby();
      },
    });
  }

  function launchHotseatMissionPick() {
    if (typeof beginMissionPick !== "function") {
      flashToast("Mission pick unavailable");
      return;
    }
    const raw = $("#hotseat-names")?.value || "Alex, Bea";
    const names = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const seatNames = names.length >= 2 ? names : ["Alex", "Bea"];
    beginMissionPick({
      onSelect: (mission, global) => {
        if (typeof enterHotseatPlay === "function") {
          lastMarketNewsId = null;
          const ok = enterHotseatPlay(seatNames, mission, global);
          if (!ok) showScreen("friends");
          return;
        }
        flashToast("Hotseat bridge unavailable");
        showScreen("friends");
      },
      onCancel: () => {
        leaveHotseat?.();
        showScreen("friends");
      },
    });
  }

  function mpSend(action) {
    try {
      client.sendAction(action);
    } catch (e) {
      flashToast(e.message || "Not connected");
    }
  }

  function ensureRoomSide() {
    if (roomSideMounted && roomSide) return roomSide;
    roomSide = new MpSidePanel({
      mode: "room",
      toast: flashToast,
      getPlace: () => client.snapshot?.place || client.snapshot?.mp?.place || null,
      getInvent: () => {
        const snap = client.snapshot;
        const id = snap?.you?.id || client.session?.playerId;
        return (
          snap?.you?.invent ||
          snap?.mp?.invents?.[id] ||
          null
        );
      },
      canAct: () => {
        const snap = client.snapshot;
        const id = snap?.you?.id || client.session?.playerId;
        return Boolean(id && snap?.activeSeatId === id && snap?.place?.status === "playing");
      },
      /** Shared Imagine cache key so all clients see the same invent frame */
      visionSessionId: (invent) => {
        const code = client.snapshot?.code || client.session?.code || "room";
        const seat = invent?.seatId || client.snapshot?.you?.id || "seat";
        return `room-${String(code).slice(0, 24)}-seat-${String(seat).slice(0, 40)}`;
      },
      applyField: (field, value) => {
        try {
          client.sendAction({ type: "buffer_write", payload: { field, value } });
          client.sendAction({
            type: "write_commit",
            payload: { field, value, changed: true },
          });
        } catch (e) {
          flashToast(e.message || "Not connected");
        }
      },
      // AP reserved server-side via transport — no client payAp
      transport: (body) => client.requestAiAsync(body),
    });
    roomSide.mount(
      $("#mp-vision-root"),
      $("#mp-co-inventor-root"),
      $("#mp-side-panel")
    );
    roomSideMounted = true;
    $("#btn-mp-regen-vision")?.addEventListener("click", () => {
      const snap = client.snapshot;
      const me = snap?.you?.id;
      const invent = snap?.you?.invent || snap?.mp?.invents?.[me];
      roomSide?.syncVision({
        force: true,
        immediate: true,
        followOnly: false,
        sessionId: roomSide.opts.visionSessionId?.(invent),
      });
    });
    return roomSide;
  }

  function renderPlay() {
    const snap = client.snapshot;
    const mp = snap?.mp;
    const place = snap?.place || mp?.place;
    const myId = snap?.you?.id || client.session?.playerId;
    const invent = snap?.you?.invent || mp?.invents?.[myId] || null;
    if (!place && !snap?.sim) return;

    ensureRoomSide();

    const code = $("#mp-room-code");
    if (code) code.textContent = snap.code || "";

    // HUD year = your invent calendar (or active invent), not a shared global clock
    const inventYear =
      invent?.year ??
      place?.year ??
      snap?.sim?.year ??
      2026;
    const pressure = place?.pressure || snap?.sim?.pressure || {};
    const mission = place?.mission || snap?.sim?.mission;
    const activeId = snap?.activeSeatId || mp?.activeSeatId;
    const activeName =
      (snap?.players || []).find((p) => p.id === activeId)?.displayName || "—";

    const mpYear = $("#mp-hud-year");
    if (mpYear) {
      mpYear.textContent = String(inventYear);
      mpYear.title = "Click for year foresight";
      mpYear.style.cursor = "pointer";
    }
    $("#mp-hud-turn").textContent = `Round ${mp?.round || 1}`;
    if (invent) {
      $("#mp-hud-ap").textContent = `AP ${invent.ap}/${invent.apMax}`;
      $("#mp-hud-budget").textContent = `Budget ${invent.budget}$`;
      $("#mp-hud-will").textContent = `Will ${invent.will}`;
    } else if (snap?.sim) {
      $("#mp-hud-ap").textContent = `AP ${snap.sim.ap}/${snap.sim.apMax}`;
      $("#mp-hud-budget").textContent = `Budget ${snap.sim.budget}$`;
      $("#mp-hud-will").textContent = `Will ${snap.sim.will}`;
    }

    const badge = $("#mp-active-badge");
    if (badge) {
      const mine = myId && activeId === myId;
      badge.textContent = mine ? `Your turn · ${activeName}` : `Active: ${activeName}`;
    }
    const activePill = $("#mp-room-active-player");
    if (activePill) {
      activePill.hidden = false;
      activePill.removeAttribute("hidden");
      activePill.innerHTML = `<strong>${escapeHtml(activeName)}</strong><span class="mp-active-label"> · turn</span>`;
      activePill.title = `${activeName}'s turn`;
    }

    $("#mp-mission-title").textContent = mission?.title || "Friends race";
    $("#mp-mission-place").textContent = mission
      ? `${mission.place} · collapse ${mission.collapseYear}`
      : "";
    const sceneEl = $("#mp-mission-scene");
    if (sceneEl) sceneEl.textContent = mission?.scene || "";
    const gLabel = $("#mp-play-global-label");
    if (gLabel) {
      gLabel.textContent = place?.globalId
        ? `Friends · ${place.globalId}`
        : "Friends race";
    }
    $("#mp-news").textContent = place?.lastNews || snap?.sim?.lastNews || "";
    paintMarketBanner(
      "#mp-market-news-banner",
      place?.marketNews || null,
      mp?.round
    );

    const box = $("#mp-pressure");
    if (box) {
      box.innerHTML = Object.entries(pressure)
        .map(([k, v]) => {
          const level = v >= 4 ? "hot" : v >= 2 ? "warm" : "cool";
          return `<span class="meter ${level}"><b>${escapeHtml(k)}</b> ${"●".repeat(v)}${"○".repeat(
            Math.max(0, 5 - v)
          )}</span>`;
        })
        .join("");
    }

    paintScenarioBrief($("#mp-scenario-brief"), mission, {
      escapeHtml,
      globalId: place?.globalId || mission?.globalId || snap?.mp?.place?.globalId,
      heading: "Challenge",
    });

    const plist = $("#mp-player-list");
    if (plist) {
      plist.innerHTML = (snap.players || [])
        .map((p) => {
          const f = mp?.invents?.[p.id];
          const tags = [];
          if (p.id === activeId) tags.push('<span class="tag">active</span>');
          if (p.isHost) tags.push('<span class="tag">host</span>');
          if (f?.abandoned) tags.push('<span class="tag">abandoned</span>');
          if (f?.deployStage === "new_normal" || f?.deployStage === "scaled")
            tags.push('<span class="tag">deployed</span>');
          else if (f?.deployStage === "pilot_ok") tags.push('<span class="tag">pilot</span>');
          return `<li class="${p.connected ? "is-online" : "is-offline"} ${
            p.id === activeId ? "is-active-seat" : ""
          }"><strong>${escapeHtml(p.displayName)}</strong>
            <span class="muted sm">B${f?.budget ?? "—"} W${f?.will ?? "—"}</span>
            ${tags.join(" ")}</li>`;
        })
        .join("");
    }

    // Open table
    const table = $("#mp-open-table");
    if (table) {
      const rows = snap.openTable || mp?.openTable || [];
      table.innerHTML = rows
        .map((row) => {
          const stack = (row.stack || [])
            .map((x) => {
              const name = x.tech?.name || x.techId;
              const helper =
                x.addedBy && x.addedBy !== row.seatId
                  ? ` <em class="muted">(+${escapeHtml(
                      (snap.players || []).find((s) => s.id === x.addedBy)?.displayName || "?"
                    )})</em>`
                  : "";
              return `<span class="mp-chip sm">${escapeHtml(x.tech?.icon || "")} ${escapeHtml(
                name
              )}${helper}</span>`;
            })
            .join(" ");
          return `<article class="hs-invent-card ${row.active ? "is-active" : ""} ${
            row.abandoned ? "is-abandoned" : ""
          }">
            <header><strong>${escapeHtml(row.displayName)}</strong>
              ${row.active ? '<span class="tag">turn</span>' : ""}
              ${row.abandoned ? '<span class="tag">abandoned</span>' : ""}
            </header>
            <p class="hs-invent-name">${escapeHtml(row.inventionName || "— unnamed —")}</p>
            <p class="muted sm">${escapeHtml((row.inventionHow || "").slice(0, 100))}${
              (row.inventionHow || "").length > 100 ? "…" : ""
            }</p>
            <div class="hs-invent-stack">${stack || '<span class="muted">No techs</span>'}</div>
            <p class="muted sm">Stage: ${escapeHtml(row.deployStage || "none")}</p>
          </article>`;
        })
        .join("");
    }

    // Your invent fields
    if (invent) {
      syncField("mp-invention-name", invent.inventionName, "inventionName");
      syncField("mp-invention-how", invent.inventionHow, "inventionHow");
      syncField("mp-invention-impact", invent.inventionImpact, "inventionImpact");
      const ans = $("#mp-challenge-answer");
      if (ans && document.activeElement !== ans) {
        ans.value = invent.challengeAnswer || "";
      }
      const disabled =
        Boolean(invent.abandoned) ||
        snap.phase === "outcome" ||
        place?.status === "won" ||
        place?.status === "collapsed" ||
        place?.status === "abandoned_by_vote";
      for (const id of [
        "mp-invention-name",
        "mp-invention-how",
        "mp-invention-impact",
        "mp-challenge-answer",
      ]) {
        const el = $(`#${id}`);
        if (el) el.disabled = disabled || (myId && activeId !== myId);
      }
    }

    paintLocks(snap.fieldLocks || {});
    paintStack(invent, myId);
    paintTechTray(invent, place, mp, myId);
    paintLayerTarget(mp, myId);
    paintMpPhase(invent, place, myId, activeId);
    paintMpOutcome(snap);

    const isActive = myId && activeId === myId;
    const playing = place?.status === "playing" || snap.phase === "playing";
    const setDis = (id, on) => {
      const el = $(id);
      if (el) el.disabled = !on;
    };
    setDis("#btn-mp-end-turn", playing && isActive);
    const endBtn = $("#btn-mp-end-turn");
    if (endBtn) {
      endBtn.textContent = isActive ? "End turn →" : "Waiting…";
      endBtn.title = isActive
        ? "End your seat-turn (pass to next player)"
        : "Not your turn";
    }
    // Leave Quest vote (n/m) — any connected player while Quest is playing
    const leaveChallengeBtn = $("#btn-mp-leave-challenge");
    if (leaveChallengeBtn) {
      const fe =
        snap.questExit ||
        snap.mp?.questExit ||
        (mp?.questExit
          ? {
              yes: Object.keys(mp.questExit.votes || {}).filter((id) => mp.questExit.votes[id])
                .length,
              total: (mp.seatOrder || Object.keys(mp.invents || {})).length,
              votes: mp.questExit.votes || {},
              resolved: mp.questExit.resolved,
            }
          : null);
      const connected = (snap.players || []).filter((p) => p.connected !== false);
      const total =
        fe?.total != null
          ? fe.total
          : connected.length || (mp?.seatOrder || []).length || 0;
      const yes =
        fe?.yes != null
          ? fe.yes
          : Object.keys(fe?.votes || {}).filter((id) => fe.votes[id]).length;
      const iVoted = Boolean(myId && (fe?.votes?.[myId] || mp?.questExit?.votes?.[myId]));
      leaveChallengeBtn.hidden = false;
      leaveChallengeBtn.disabled = !playing || Boolean(fe?.resolved);
      leaveChallengeBtn.textContent = `Leave Quest (${yes}/${total})`;
      leaveChallengeBtn.title = iVoted
        ? "You voted to leave this Quest — click to revoke (until majority)"
        : "Vote to leave this Quest (strict majority). Does not leave the room.";
      leaveChallengeBtn.classList.toggle("is-voted", iVoted);
      leaveChallengeBtn.dataset.voted = iVoted ? "1" : "0";
    }
    // Wait only on *your* invent calendar — not while layer-helping someone else
    const layerTarget = $("#mp-layer-target")?.value || myId;
    const waitOnOwn = !layerTarget || layerTarget === myId;
    setDis("#btn-mp-wait", playing && isActive && waitOnOwn);
    const waitBtn = $("#btn-mp-wait");
    if (waitBtn) {
      waitBtn.title =
        !isActive
          ? "Not your turn"
          : !waitOnOwn
            ? "Wait is only for your own invent — switch stack target to your stack first"
            : "Wait +2 years on your invent (ends seat-turn; others keep their year)";
    }
    setDis("#btn-mp-ai", playing && isActive && invent && !invent.abandoned);
    setDis(
      "#btn-mp-challenge",
      playing && isActive && invent && !invent.abandoned && !invent.challengePassed
    );
    setDis(
      "#btn-mp-submit-challenge",
      playing && isActive && invent && !invent.abandoned && !invent.challengePassed
    );
    setDis(
      "#btn-mp-pilot",
      playing &&
        isActive &&
        invent &&
        invent.challengePassed &&
        invent.deployStage === "none" &&
        !invent.pilotFailedThisTurn
    );
    setDis(
      "#btn-mp-scale",
      playing &&
        isActive &&
        invent &&
        invent.deployStage === "pilot_ok" &&
        !invent.scaleFailedThisTurn
    );
    setDis(
      "#btn-mp-abandon",
      playing &&
        isActive &&
        invent &&
        !invent.abandoned &&
        invent.deployStage !== "scaled" &&
        invent.deployStage !== "new_normal"
    );

    // Shared room vision — content-gated inside syncVision (no force-on-techs)
    try {
      const me = myId;
      const followOnly = false; // this panel shows *your* invent
      roomSide?.syncVision({
        immediate: false,
        followOnly,
        sessionId: roomSide.opts.visionSessionId?.(invent),
      });
    } catch {
      /* vision optional */
    }
  }

  function paintMpPhase(invent, place, myId, activeId) {
    const phase = $("#mp-phase-hint");
    if (!phase) return;
    if (place?.status === "won") {
      phase.textContent = "Place held — see ranking.";
      return;
    }
    if (place?.status === "collapsed") {
      phase.textContent = "Collapsed — nobody wins.";
      return;
    }
    if (myId && activeId !== myId) {
      phase.textContent = "Waiting for the active player…";
      return;
    }
    if (!invent) {
      phase.textContent = "";
      return;
    }
    if (invent.abandoned) phase.textContent = "You abandoned — layer emTech on others or Wait.";
    else if (!invent.challengePassed)
      phase.textContent = "Your turn: write → stack → Face challenge → Pilot → Scale.";
    else if (invent.challengeLocked && !invent.challengePassed)
      phase.textContent =
        myId && invent.seatId === myId
          ? "Challenge failed — invent locked. Face challenge again, or Reopen invent to rework."
          : "Challenge failed — only the owner can retry (invent stays locked).";
    else if (invent.deployStage === "none" && invent.challengePassed)
      phase.textContent = "Deploy ready — Attempt Pilot (does not change the place).";
    else if (invent.deployStage === "pilot_ok")
      phase.textContent = "Scale ready — Scale to update the shared crisis!";
    else if (invent.deployStage === "scaled" || invent.deployStage === "new_normal")
      phase.textContent =
        myId && activeId === myId
          ? "This invent is fielded. Help another invent or End turn."
          : "This invent is fielded (Scale → New normal).";
    else if (invent.pilotFailedThisTurn && invent.challengePassed && invent.deployStage === "none")
      phase.textContent = "Pilot failed this seat-turn — End turn; others may still Pilot this invent.";
    else if (invent.scaleFailedThisTurn && invent.deployStage === "pilot_ok")
      phase.textContent = "Scale failed this seat-turn — End turn; others may still Scale this invent.";
    else phase.textContent = "";
  }

  function paintMpOutcome(snap) {
    const wrap = $("#mp-outcome");
    const body = $("#mp-outcome-body");
    if (!wrap || !body) return;
    const place = snap.place || snap.mp?.place;
    const show =
      place?.status === "won" ||
      place?.status === "collapsed" ||
      snap.phase === "outcome";
    wrap.hidden = !show;
    if (!show) return;
    if (place?.status === "collapsed") {
      body.innerHTML = `<p><strong>The place fell.</strong> No champion.</p>`;
      return;
    }
    const rows = snap.ranking?.rows || snap.mp?.ranking?.rows || [];
    body.innerHTML = `<p><strong>Crisis held!</strong></p>
      <ol class="hs-rank-list">
      ${rows
        .map(
          (r) =>
            `<li><strong>#${r.rank} ${escapeHtml(r.displayName)}</strong> — ${r.score} pts
            <span class="muted sm">(impact ${Math.round((r.impactNorm || 0) * 100)} · craft ${Math.round(
              (r.craftNorm || 0) * 100
            )} · help ${Math.round((r.contributionNorm || 0) * 100)} · race ${Math.round(
              (r.raceNorm || 0) * 100
            )})</span></li>`
        )
        .join("")}
      </ol>`;
  }

  function paintLayerTarget(mp, myId) {
    const sel = $("#mp-layer-target");
    if (!sel || !mp?.seatOrder) return;
    const cur = sel.value;
    sel.innerHTML = mp.seatOrder
      .map((id) => {
        const s = mp.seats?.find((x) => x.id === id);
        const label =
          id === myId
            ? `${s?.displayName || "Me"} (my stack)`
            : `${s?.displayName || id} (layer help)`;
        return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
      })
      .join("");
    if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
    else if (myId) sel.value = myId;
  }

  function syncField(id, value, fieldKey) {
    const el = $(`#${id}`);
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.value !== (value || "")) el.value = value || "";
    el.dataset.field = fieldKey;
  }

  function paintLocks(locks) {
    // Per-player lock keys: prefer scoped; fieldLockLabels may show generic
    paintFieldLockElements(locks || {}, {
      inventionName: $("#mp-lock-name"),
      inventionHow: $("#mp-lock-how"),
      inventionImpact: $("#mp-lock-impact"),
    });
  }

  function paintStack(invent, myId) {
    const box = $("#mp-stack");
    if (!box) return;
    const snap = client.snapshot;
    const mp = snap?.mp;
    const targetId = $("#mp-layer-target")?.value || myId;
    const target = mp?.invents?.[targetId] || invent;
    const seatNames = Object.fromEntries(
      (snap?.players || []).map((p) => [p.id, p.displayName])
    );
    const activeId = snap?.activeSeatId;
    const isActive = myId && activeId === myId;
    const canEdit =
      isActive &&
      !invent?.abandoned &&
      snap?.place?.status !== "won" &&
      snap?.place?.status !== "collapsed";

    paintSelectedStack(box, {
      stack: target?.stack || [],
      ownerSeatId: targetId,
      seatNames,
      disabled: !canEdit,
      escapeHtml,
      onRemove: (techId) => {
        mpSend({
          type: "deselect_tech",
          payload: { techId, targetSeatId: targetId },
        });
      },
    });
  }

  function paintTechTray(invent, place, mp, myId) {
    // Full solo-style library (same as hotseat) — not a tiny tray
    const listEl = $("#mp-tech-list");
    const filterRow = $("#mp-filter-row");
    const targetId = $("#mp-layer-target")?.value || myId;
    const target = mp?.invents?.[targetId] || invent;
    const snap = client.snapshot;
    const activeId = snap?.activeSeatId || mp?.activeSeatId;
    const isActive = myId && activeId === myId;
    const playing =
      place?.status === "playing" || snap?.phase === "playing";
    const canEdit =
      playing &&
      isActive &&
      !invent?.abandoned &&
      place?.status !== "won" &&
      place?.status !== "collapsed";

    const hint = $("#mp-layer-hint");
    if (hint) {
      hint.textContent =
        targetId === myId ? "Add to your stack" : "Layer help on their stack (you pay)";
    }

    paintTechFilters(filterRow, {
      domainFilter: mpDomainFilter,
      escapeHtml,
      onFilter: (d) => {
        mpDomainFilter = d;
        paintTechTray(invent, place, mp, myId);
      },
    });

    paintTechLibrary(listEl, {
      selectedIds: (target?.stack || []).map((x) => x.techId),
      suggested: place?.mission?.suggested || [],
      domainFilter: mpDomainFilter,
      disabled: !canEdit,
      market: place?.marketNews || null,
      ap: invent?.ap,
      budget: invent?.budget,
      will: invent?.will,
      escapeHtml,
      onToggle: (techId) => {
        const tech = techById(techId);
        const onStack = (target?.stack || []).some((x) => x.techId === techId);
        const targetSeatId = $("#mp-layer-target")?.value || myId;
        if (onStack) {
          mpSend({
            type: "deselect_tech",
            payload: { techId, targetSeatId },
          });
        } else {
          // Client-side afford gate — never paint selected on deny (server still re-checks)
          const cost = techCost(tech, { market: place?.marketNews || null });
          if ((invent?.ap ?? 0) < 1) {
            flashToast("No AP left — End Turn or Wait.", { resource: "ap" });
            return;
          }
          if ((invent?.budget ?? 0) < (cost.budget || 0)) {
            flashToast(`Not enough Budget (need ${cost.budget}$).`, { resource: "budget" });
            return;
          }
          if ((invent?.will ?? 0) < (cost.will || 0)) {
            flashToast(`Not enough Will (need ${cost.will}).`, { resource: "will" });
            return;
          }
          if (targetSeatId === myId) {
            mpSend({ type: "select_tech", payload: { techId, tech } });
          } else {
            mpSend({
              type: "layer_tech",
              payload: { techId, targetSeatId, tech },
            });
          }
        }
      },
    });

    // Hide legacy tray if present
    const tray = $("#mp-tech-tray");
    if (tray) tray.hidden = true;
  }

  function scheduleBuffer(field, value) {
    clearTimeout(bufferTimers[field]);
    bufferTimers[field] = setTimeout(() => {
      try {
        client.sendAction({
          type: "buffer_write",
          payload: { field, value },
        });
      } catch {
        /* offline */
      }
    }, 400);
  }

  function wireFields() {
    for (const [id, field] of [
      ["mp-invention-name", "inventionName"],
      ["mp-invention-how", "inventionHow"],
      ["mp-invention-impact", "inventionImpact"],
    ]) {
      const el = $(`#${id}`);
      if (!el || el._mpWired) continue;
      el._mpWired = true;
      el.addEventListener("focus", () => {
        try {
          client.sendAction({ type: "lock_field", payload: { field, ttlSec: 45 } });
        } catch {
          /* ignore */
        }
      });
      el.addEventListener("input", () => scheduleBuffer(field, el.value));
      el.addEventListener("blur", () => {
        try {
          client.sendAction({
            type: "write_commit",
            payload: { field, value: el.value, changed: true },
          });
          client.sendAction({ type: "unlock_field", payload: { field } });
        } catch {
          /* ignore */
        }
      });
    }
    const layerSel = $("#mp-layer-target");
    if (layerSel && !layerSel._mpWired) {
      layerSel._mpWired = true;
      layerSel.addEventListener("change", () => renderPlay());
    }
  }

  function setAiPending(on, text) {
    const el = $("#mp-ai-pending");
    const tx = $("#mp-ai-pending-text");
    if (el) el.hidden = !on;
    if (tx && text) tx.textContent = text;
    const btn = $("#btn-mp-ai");
    if (btn) btn.disabled = Boolean(on);
  }

  function appendAiLog(line) {
    const log = $("#mp-ai-log");
    if (!log) return;
    const p = document.createElement("p");
    p.textContent = line;
    log.prepend(p);
    while (log.children.length > 6) log.lastChild.remove();
  }

  client.on((evt) => {
    if (evt.type === "hello" || evt.type === "snapshot" || evt.type === "lobby" || evt.type === "presence") {
      const phase = client.snapshot?.phase;
      if (phase === "playing") {
        // Once per race only — repeated enterRoomPlay froze the host on Start race
        tryEnterRoomPlayOnce(evt.type);
      } else if (phase === "outcome") {
        // Soft re-enter for outcome handling (same key unless version bumped)
        tryEnterRoomPlayOnce(`outcome-${evt.type}`);
      } else if (client.snapshot) {
        roomPlayEnteredFor = "";
        showScreen("room-lobby");
        renderLobby();
      }
    }
    if (evt.type === "next_quest_started" || evt.type === "quest_started") {
      roomPlayEnteredFor = "";
      lastMarketNewsId = null;
      tryEnterRoomPlayOnce(evt.type);
    }
    // Soft locks + settings must refresh labels even when no sim patch arrives
    if (evt.type === "locks") {
      if (client.snapshot && evt.fieldLocks) {
        client.snapshot.fieldLocks = evt.fieldLocks;
      }
      paintLocks(client.snapshot?.fieldLocks || evt.fieldLocks || {});
      return;
    }
    if (evt.type === "settings") {
      if (client.snapshot?.phase === "playing" || client.snapshot?.phase === "outcome") {
        /* workshop is driven by room bridge */
      } else renderLobby();
    }
    if (evt.type === "patch") {
      // When using workshop bridge, enterRoomPlay's subscription hydrates; still keep legacy render
      if (typeof enterRoomPlay !== "function") renderPlay();
      const last = (evt.events || [])[0];
      if (last?.type === "wait") {
        const y =
          last.year ??
          client.snapshot?.mp?.invents?.[last.seatId]?.year ??
          client.snapshot?.place?.year;
        setPlayStatus(`Wait → invent year ${y} (your invent only)`);
      }
      if (last?.type === "end_turn" || last?.type === "seat_turn_start") {
        const who = (client.snapshot?.players || []).find(
          (p) => p.id === client.snapshot?.activeSeatId
        );
        setPlayStatus(who ? `Active: ${who.displayName}` : "Turn passed.");
      }
      if (last?.type === "tech_added" || last?.type === "tech_layered") setPlayStatus("Stack updated.");
      if (last?.type === "scale_ok") setPlayStatus(last.solved ? "Place solved!" : "Scale landed (partial).");
      if (last?.type === "quest_won") setPlayStatus("Race over — ranking ready.");
      if (last?.type === "collapsed") setPlayStatus("Place collapsed — nobody wins.");
    }
    if (evt.type === "ai_pending") {
      setAiPending(true, `${evt.displayName || "Someone"} asked the co-inventor…`);
      setPlayStatus("AI pending — AP reserved.");
      renderPlay();
    }
    if (evt.type === "ai_result") {
      setAiPending(false);
      renderPlay();
      if (evt.ok === false) {
        flashToast(evt.error || "AI failed (AP refunded if reserved)");
        setPlayStatus(evt.error || "AI failed");
        appendAiLog(`✗ ${evt.error || "failed"}`);
      } else {
        const msg = evt.result?.message || "Co-inventor replied.";
        appendAiLog(`✦ ${evt.displayName || "AI"}: ${String(msg).slice(0, 180)}`);
        setPlayStatus("Co-inventor finished.");
        flashToast("Co-inventor finished");
      }
    }
    if (evt.type === "reject") {
      const err = evt.error || "Action rejected";
      // Prefer game.js map when available (pilot_required → human copy)
      const friendly =
        typeof window !== "undefined" && typeof window.mpFriendlyError === "function"
          ? window.mpFriendlyError(err)
          : err === "player_rate_quota"
            ? "AI rate limit — wait a minute"
            : err === "player_session_quota"
              ? "Session AI quota reached"
              : err === "room_quota"
                ? "Room AI budget exhausted"
                : err === "pose_judge_busy"
                  ? "Another pose/judge is in flight"
                  : err === "no_ap"
                    ? "No AP for that action"
                    : err === "field_locked"
                      ? "Someone else is editing that field"
                      : err === "pilot_required"
                        ? "Pilot this invention successfully before Scale."
                        : err === "challenge_required"
                          ? "This invent must pass Challenge before Pilot."
                          : err === "not_active_seat"
                            ? "Not your turn — wait for the active player."
                            : err;
      flashToast(friendly);
      setPlayStatus(friendly);
      setAiPending(false);
    }
    if (evt.type === "alone") {
      flashToast(
        evt.message ||
          "You're the only one still connected — you can keep playing alone or leave the room."
      );
    }
    if (evt.type === "player_left" && evt.message) {
      flashToast(evt.message);
    }
    if (evt.type === "kicked") {
      flashToast("You were kicked from the room.");
      showScreen("friends");
    }
    if (evt.type === "room_ended") {
      flashToast("Host ended the room.");
      showScreen("friends");
    }
  });

  // Hub buttons
  $("#btn-friends")?.addEventListener("click", () => {
    showScreen("friends");
    setHubStatus("");
  });
  $("#btn-friends-back")?.addEventListener("click", () => {
    clearMissionPickSession?.();
    showScreen("title");
  });
  $("#btn-friends-create")?.addEventListener("click", async () => {
    const name = $("#friends-create-name")?.value?.trim() || "Host";
    setHubStatus("Creating room…");
    try {
      const data = await client.create(name);
      setHubStatus("");
      flashToast(`Room ${data.code} created`);
      showScreen("room-lobby");
      renderLobby();
    } catch (e) {
      setHubStatus(e.message || "Create failed");
      flashToast(e.message || "Create failed");
    }
  });
  $("#btn-friends-join")?.addEventListener("click", async () => {
    const name = $("#friends-join-name")?.value?.trim() || "Player";
    const code = $("#friends-join-code")?.value?.trim() || "";
    if (!code) {
      flashToast("Enter a room code");
      return;
    }
    setHubStatus("Joining…");
    try {
      await client.join(code, name);
      setHubStatus("");
      flashToast(`Joined ${code.toUpperCase()}`);
      showScreen("room-lobby");
      renderLobby();
    } catch (e) {
      setHubStatus(e.message || "Join failed");
      flashToast(e.message || "Join failed");
    }
  });

  $("#btn-copy-room-code")?.addEventListener("click", async () => {
    const code = client.session?.code || "";
    try {
      await navigator.clipboard.writeText(code);
      flashToast(`Copied ${code}`);
    } catch {
      flashToast(code);
    }
  });

  $("#btn-copy-join-info")?.addEventListener("click", async () => {
    await ensureLanJoinInfo();
    const code = client.session?.code || $("#room-code-display")?.textContent || "";
    const text = buildJoinInfoText(code);
    try {
      await navigator.clipboard.writeText(text);
      flashToast("Copied join info (code + LAN address)");
    } catch {
      flashToast(text.slice(0, 80) + "…");
    }
  });

  $("#btn-room-leave")?.addEventListener("click", () => {
    client.leaveLocal();
    roomSide?.destroy();
    roomSide = null;
    roomSideMounted = false;
    if (typeof leaveRoomPlay === "function") leaveRoomPlay();
    showScreen("friends");
  });
  $("#btn-mp-leave")?.addEventListener("click", () => {
    if (!confirm("Leave the room? Others can keep playing this game without you.")) return;
    client.leaveLocal();
    roomSide?.destroy();
    roomSide = null;
    roomSideMounted = false;
    roomPlayEnteredFor = "";
    if (typeof leaveRoomPlay === "function") leaveRoomPlay();
    showScreen("friends");
  });

  $("#btn-mp-leave-challenge")?.addEventListener("click", () => {
    const snap = client.snapshot;
    const myId = snap?.you?.id || client.session?.playerId;
    const fe = snap?.questExit || snap?.mp?.questExit;
    const iVoted = Boolean(myId && fe?.votes?.[myId]);
    mpSend({ type: iVoted ? "unvote_leave_quest" : "vote_leave_quest" });
  });

  $("#btn-room-pick-mission")?.addEventListener("click", () => {
    if (!client.snapshot?.you?.isHost) {
      flashToast("Only the host picks the mission");
      return;
    }
    launchRoomMissionPick();
  });

  $("#btn-room-start")?.addEventListener("click", async () => {
    const n = client.snapshot?.players?.length || 0;
    if (n < 2) {
      flashToast("Need at least 2 players to start");
      return;
    }
    let meta = client.snapshot?.questMeta;
    if (!meta?.mission) {
      const cur = currentHostMission();
      if (!cur.mission) {
        flashToast("Pick a theme and Quest card first");
        return;
      }
      await client.hostCmd("set_quest", cur);
      meta = cur;
    }
    try {
      setLobbyStatus("Starting Quest…");
      const startBtn = $("#btn-room-start");
      if (startBtn) startBtn.disabled = true;
      await client.hostCmd("start_quest", meta);
      // WS snapshot / quest_started will call tryEnterRoomPlayOnce — don't double-enter here
    } catch (e) {
      flashToast(e.message || "Start failed");
      const startBtn = $("#btn-room-start");
      if (startBtn) startBtn.disabled = false;
    }
  });

  $("#btn-mp-end-turn")?.addEventListener("click", () => mpSend({ type: "end_turn" }));
  $("#btn-mp-wait")?.addEventListener("click", () => {
    const snap = client.snapshot;
    const myId = snap?.you?.id || client.session?.playerId;
    const layerTarget = $("#mp-layer-target")?.value || myId;
    if (myId && layerTarget && layerTarget !== myId) {
      flashToast(
        "Wait is only for your own invent — switch stack target to your stack first"
      );
      return;
    }
    const invent = snap?.you?.invent;
    const place = snap?.place || snap?.mp?.place;
    const run = () => mpSend({ type: "wait" });
    if (typeof openWaitConfirm === "function") {
      openWaitConfirm(run, {
        multiparty: true,
        year: invent?.year ?? place?.year,
        waits: invent?.waits ?? 0,
        pressure: place?.pressure,
        mission: place?.mission,
      });
    } else run();
  });
  $("#btn-mp-challenge")?.addEventListener("click", () => mpSend({ type: "enter_challenge" }));
  $("#btn-mp-submit-challenge")?.addEventListener("click", () => {
    const answer = $("#mp-challenge-answer")?.value || "";
    const invent = client.snapshot?.you?.invent;
    if (invent && invent.turnPhase !== "scrutiny") {
      mpSend({ type: "enter_challenge" });
    }
    setTimeout(() => mpSend({ type: "submit_challenge", payload: { answer } }), 50);
  });
  $("#btn-mp-pilot")?.addEventListener("click", () =>
    mpSend({ type: "attempt_pilot", payload: { feasibilityLevel: "yellow" } })
  );
  $("#btn-mp-scale")?.addEventListener("click", () =>
    mpSend({ type: "attempt_scale", payload: { feasibilityLevel: "yellow" } })
  );
  $("#btn-mp-abandon")?.addEventListener("click", () => {
    if (!confirm("Abandon your invention and only help others?")) return;
    mpSend({ type: "abandon" });
  });

  $("#btn-mp-ai")?.addEventListener("click", () => {
    const snap = client.snapshot;
    const invent = snap?.you?.invent;
    const place = snap?.place || snap?.mp?.place;
    if (!invent) return;
    try {
      setAiPending(true, "Asking co-inventor…");
      client.requestAi({
        mode: "chat",
        userLabel:
          `My invention "${invent.inventionName || "untitled"}" in ${place?.mission?.place || "this place"}. ` +
          `How: ${String(invent.inventionHow || "").slice(0, 400)}. ` +
          `Suggest one concrete improvement for my stack or how-it-works.`,
        reservedAp: 1,
      });
    } catch (e) {
      setAiPending(false);
      flashToast(e.message || "Not connected");
    }
  });

  /* —— Hotseat (rev 6 coopetition) —— */
  function setHsStatus(msg) {
    const el = $("#hs-status");
    if (el) el.textContent = msg || "";
  }

  function hsAct(action, okMsg) {
    if (!hotseat?.place) {
      flashToast("Start the mission first");
      return;
    }
    const r = hotseatApplyAction(hotseat, action);
    if (!r.ok) {
      const err = r.error || "rejected";
      const friendly = {
        not_active_seat: "Not your turn — pass the device",
        retry_next_turn: "Already tried this turn — End Turn and come back",
        challenge_required: "Face the challenge first",
        pilot_required: "Pilot successfully before Scale",
        abandoned: "You abandoned this invention",
        no_ap: "Not enough AP",
        no_budget: "Not enough Budget",
        end_turn_noop: "Do something first (write, tech, or attempt)",
        race_over: "Race is over — the place is solved",
        run_over: "Run is over",
      }[err] || err;
      flashToast(friendly);
      return false;
    }
    hotseat = r.session;
    if (okMsg) flashToast(okMsg);
    const ev = r.events || [];
    renderHotseat();
    if (
      ev.some((e) =>
        ["pilot_ok", "scale_ok", "tech_added", "tech_layered", "buffer_write", "challenge_pass"].includes(
          e.type
        )
      )
    ) {
      scheduleHsVision({
        immediate: ev.some((e) => e.type === "pilot_ok" || e.type === "scale_ok" || e.type === "tech_added"),
        force: true,
      });
    }
    return true;
  }

  function ensureHsSide() {
    if (hsSide) return hsSide;
    hsSide = new MpSidePanel({
      mode: "hotseat",
      toast: flashToast,
      getPlace: () => hotseat?.place || null,
      getInvent: () => activeInvent(hotseat),
      canAct: () => {
        if (!hotseat?.place || hotseat.place.status !== "playing") return false;
        const f = activeInvent(hotseat);
        return Boolean(f && !f.abandoned);
      },
      applyField: (field, value) => {
        if (!hotseat?.place) return;
        const r = hotseatApplyAction(hotseat, {
          type: "buffer_write",
          payload: { field, value },
        });
        if (r.ok) {
          hotseat = r.session;
          const c = hotseatApplyAction(hotseat, {
            type: "write_commit",
            payload: { field, value, changed: true },
          });
          if (c.ok) hotseat = c.session;
          renderHotseat();
          scheduleHsVision({ force: true });
        }
      },
      applyProposals: (proposals) => {
        if (!proposals || !hotseat?.place) return;
        for (const [field, value] of [
          ["inventionName", proposals.inventionName],
          ["inventionHow", proposals.inventionHow],
          ["inventionImpact", proposals.inventionImpact],
        ]) {
          if (value == null || value === "") continue;
          const r = hotseatApplyAction(hotseat, {
            type: "buffer_write",
            payload: { field, value: String(value) },
          });
          if (r.ok) hotseat = r.session;
        }
        const ids = proposals.selectedTechIds || proposals.techIds || [];
        for (const techId of ids) {
          const r = hotseatApplyAction(hotseat, {
            type: "select_tech",
            payload: { techId, tech: techById(techId) },
          });
          if (r.ok) hotseat = r.session;
        }
        renderHotseat();
        scheduleHsVision({ force: true, immediate: true });
        flashToast("Applied co-inventor suggestions");
      },
      payAp: (amount) => {
        if (!hotseat?.place) return false;
        const r = hotseatApplyAction(hotseat, {
          type: "pay_ap",
          payload: { amount: amount || 1 },
        });
        if (!r.ok) return false;
        hotseat = r.session;
        const f = activeInvent(hotseat);
        if (f) $("#hs-hud-ap").textContent = `AP ${f.ap}/${f.apMax}`;
        return true;
      },
      refundAp: (amount) => {
        if (!hotseat?.place) return;
        const r = hotseatApplyAction(hotseat, {
          type: "refund_ap",
          payload: { amount: amount || 1 },
        });
        if (r.ok) {
          hotseat = r.session;
          const f = activeInvent(hotseat);
          if (f) $("#hs-hud-ap").textContent = `AP ${f.ap}/${f.apMax}`;
        }
      },
    });
    hsSide.mount($("#hs-vision-root"), $("#hs-co-inventor-root"), $("#hs-side-panel"));
    $("#btn-hs-regen-vision")?.addEventListener("click", () => {
      scheduleHsVision({ force: true, immediate: true });
    });
    return hsSide;
  }

  function scheduleHsVision(opts = {}) {
    try {
      ensureHsSide();
      const invent = activeInvent(hotseat);
      const place = hotseat?.place;
      if (!place) return;
      const fp = [
        invent?.year ?? place.year,
        JSON.stringify(place.pressure || {}),
        invent?.deployStage,
        (invent?.stack || []).map((x) => x.techId).join(","),
        (invent?.inventionName || "").slice(0, 40),
        (invent?.inventionHow || "").slice(0, 80),
        (invent?.inventionImpact || "").slice(0, 80),
      ].join("|");
      if (!opts.force && fp === hsVisionFingerprint && hsSide?.vision?.currentUrl) return;
      hsVisionFingerprint = fp;
      hsSide.syncVision({
        immediate: Boolean(opts.immediate),
        force: Boolean(opts.force),
      });
    } catch (e) {
      console.warn("[hotseat vision]", e);
    }
  }

  function paintHsSeatList(listEl, seat) {
    if (!listEl || !hotseat) return;
    const order = hotseat.seatOrder || hotseat.seats.map((s) => s.id);
    const place = hotseat.place;
    listEl.innerHTML = order
      .map((id) => {
        const s = hotseat.seats.find((x) => x.id === id);
        const f = hotseat.invents?.[id];
        const isActive = id === seat?.id;
        const tags = [];
        if (isActive) tags.push('<span class="tag">active</span>');
        if (f?.abandoned) tags.push('<span class="tag">abandoned</span>');
        if (f?.deployStage === "new_normal" || f?.deployStage === "scaled")
          tags.push('<span class="tag">deployed</span>');
        else if (f?.deployStage === "pilot_ok") tags.push('<span class="tag">pilot</span>');
        else if (f?.challengePassed) tags.push('<span class="tag">challenged</span>');
        const y = f?.year != null ? f.year : place?.year;
        return `<li class="${isActive ? "is-online" : "is-offline"}">
            <strong>${escapeHtml(s?.displayName || id)}</strong>
            ${place ? `<span class="muted sm">${y ?? "—"} · B${f?.budget ?? "—"} W${f?.will ?? "—"}</span>` : ""}
            ${tags.join(" ")}
          </li>`;
      })
      .join("");
  }

  function renderHotseat() {
    if (!hotseat) return;
    const seat = activeSeat(hotseat);
    const invent = activeInvent(hotseat);
    const place = hotseat.place;
    const badge = $("#hs-active-seat");
    if (badge) {
      badge.textContent = seat ? `R${hotseat.round || 1} · ${seat.displayName}` : "Seat —";
    }

    document.getElementById("screen-hotseat")?.classList.toggle("is-setup", !place);
    const play = $("#hs-play");
    if (play) play.hidden = !place;

    paintHsSeatList($("#hs-seat-list-play"), seat);

    if (!place) {
      // Mission not started — should be on solo global/mission pick screens
      return;
    }

    ensureHsSide();

    // Active seat invent calendar (personal — Wait only advances their invent year)
    const inventYear = invent?.year != null ? invent.year : place.year;
    const hsYear = $("#hs-hud-year");
    if (hsYear) {
      hsYear.textContent = String(inventYear);
      hsYear.title = "Click for year foresight";
      hsYear.style.cursor = "pointer";
    }
    $("#hs-hud-turn").textContent = `Round ${hotseat.round || 1}`;
    if (invent) {
      $("#hs-hud-ap").textContent = `AP ${invent.ap}/${invent.apMax}`;
      $("#hs-hud-budget").textContent = `Budget ${invent.budget}$`;
      $("#hs-hud-will").textContent = `Will ${invent.will}`;
    }

    const m = place.mission;
    const globalId = place.globalId || m?.globalId || hotseat.questMeta?.globalId;
    const global =
      GLOBALS.find((g) => g.id === globalId) ||
      (m?.globalId ? GLOBALS.find((g) => g.id === m.globalId) : null);
    const setText = (id, text) => {
      const el = $(id);
      if (el) el.textContent = text || "";
    };
    setText(
      "hs-play-global-label",
      global ? `Global · ${global.title}` : "Hotseat race"
    );
    setText("hs-play-mission-title", m?.title || "Hotseat race");
    setText("hs-play-mission-place", m?.place || "");
    // Quest description (solo workshop uses m.scene here)
    const sceneEl = $("#hs-play-mission-scene");
    if (sceneEl) {
      const scene = m?.scene || m?.problem || m?.description || "";
      sceneEl.textContent = scene;
      sceneEl.hidden = !scene;
    }
    setText(
      "hs-play-stakeholder",
      m?.stakeholder ? `Stakeholder: ${m.stakeholder}` : ""
    );
    setText("hs-news", place.lastNews || "");
    paintMarketBanner(
      "#hs-market-news-banner",
      place.marketNews || null,
      hotseat?.round
    );

    // Theme-level problem brief (same content as solo mission-pick screen)
    const briefRoot = $("#hs-play-problem-brief");
    const brief = global ? briefForGlobal(global) : null;
    if (briefRoot) {
      if (brief) {
        briefRoot.hidden = false;
        setText("hs-brief-state", brief.currentState || "");
        setText("hs-brief-causes", brief.rootCauses || "");
        setText("hs-brief-warnings", brief.warnings || "");
      } else {
        briefRoot.hidden = true;
      }
    }

    const box = $("#hs-pressure");
    if (box) {
      box.innerHTML = Object.entries(place.pressure || {})
        .map(([k, v]) => {
          const level = v >= 4 ? "hot" : v >= 2 ? "warm" : "cool";
          return `<span class="meter ${level}"><b>${escapeHtml(k)}</b> ${"●".repeat(v)}${"○".repeat(
            Math.max(0, 5 - v)
          )}</span>`;
        })
        .join("");
    }

    const table = $("#hs-open-table");
    if (table) {
      const rows = getOpenTable(hotseat);
      table.innerHTML =
        `<h3 class="mp-section-label">Open table</h3>` +
        rows
          .map((row) => {
            const stack = (row.stack || [])
              .map((x) => {
                const name = x.tech?.name || x.techId;
                return `<span class="tech-chip">${escapeHtml(x.tech?.icon || "")} ${escapeHtml(name)}</span>`;
              })
              .join(" ");
            return `<article class="hs-invent-card ${row.active ? "is-active" : ""} ${
              row.abandoned ? "is-abandoned" : ""
            }">
              <header><strong>${escapeHtml(row.displayName)}</strong>
                ${row.active ? '<span class="tag">your turn</span>' : ""}
              </header>
              <p class="hs-invent-name">${escapeHtml(row.inventionName || "— unnamed —")}</p>
              <div class="hs-invent-stack">${stack || '<span class="muted">No techs</span>'}</div>
            </article>`;
          })
          .join("");
    }

    const canEdit = place.status === "playing" && invent && !invent.abandoned;

    if (invent) {
      for (const [id, val] of [
        ["hs-invention-name", invent.inventionName],
        ["hs-invention-how", invent.inventionHow],
        ["hs-invention-impact", invent.inventionImpact],
      ]) {
        const el = $(`#${id}`);
        if (el && document.activeElement !== el && el.value !== (val || "")) el.value = val || "";
        if (el) el.disabled = !canEdit;
      }
      const ans = $("#hs-challenge-answer");
      if (ans && document.activeElement !== ans) {
        ans.value = invent.challengeAnswer || "";
        ans.disabled = !canEdit;
      }
    }

    const layerSel = $("#hs-layer-target");
    if (layerSel && invent) {
      const cur = layerSel.value;
      layerSel.innerHTML = (hotseat.seatOrder || [])
        .map((id) => {
          const s = hotseat.seats.find((x) => x.id === id);
          const label =
            id === invent.seatId
              ? `${s?.displayName || id} (my stack)`
              : `${s?.displayName || id} (layer help)`;
          return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
        })
        .join("");
      if (cur && [...layerSel.options].some((o) => o.value === cur)) layerSel.value = cur;
      else layerSel.value = invent.seatId;
      layerSel.disabled = !canEdit;
    }

    const targetId = $("#hs-layer-target")?.value || invent?.seatId;
    const targetInvent = hotseat.invents?.[targetId] || invent;
    const seatNames = Object.fromEntries((hotseat.seats || []).map((s) => [s.id, s.displayName]));

    paintSelectedStack($("#hs-selected-techs"), {
      stack: targetInvent?.stack || [],
      ownerSeatId: targetId,
      seatNames,
      disabled: !canEdit,
      escapeHtml,
      onRemove: (techId) => {
        hsAct({ type: "deselect_tech", payload: { techId, targetSeatId: targetId } });
        scheduleHsVision({ force: true, immediate: true });
      },
    });

    paintTechFilters($("#hs-filter-row"), {
      domainFilter: hsDomainFilter,
      escapeHtml,
      onFilter: (d) => {
        hsDomainFilter = d;
        renderHotseat();
      },
    });
    paintTechLibrary($("#hs-tech-list"), {
      selectedIds: (targetInvent?.stack || []).map((x) => x.techId),
      suggested: place.mission?.suggested || [],
      domainFilter: hsDomainFilter,
      disabled: !canEdit,
      market: place?.marketNews || null,
      ap: invent?.ap,
      budget: invent?.budget,
      will: invent?.will,
      escapeHtml,
      onToggle: (techId) => {
        const onStack = (targetInvent?.stack || []).some((x) => x.techId === techId);
        if (onStack) {
          hsAct({ type: "deselect_tech", payload: { techId, targetSeatId: targetId } });
        } else {
          const tech = techById(techId);
          const cost = techCost(tech, { market: place?.marketNews || null });
          if ((invent?.ap ?? 0) < 1) {
            flashToast("No AP left — End Turn or Wait.", { resource: "ap" });
            return;
          }
          if ((invent?.budget ?? 0) < (cost.budget || 0)) {
            flashToast(`Not enough Budget (need ${cost.budget}$).`, { resource: "budget" });
            return;
          }
          if ((invent?.will ?? 0) < (cost.will || 0)) {
            flashToast(`Not enough Will (need ${cost.will}).`, { resource: "will" });
            return;
          }
          if (targetId === invent.seatId) {
            hsAct({ type: "select_tech", payload: { techId, tech } });
          } else {
            hsAct(
              {
                type: "layer_tech",
                payload: { techId, targetSeatId: targetId, tech },
              },
              "Layered emTech (you paid)"
            );
          }
        }
        scheduleHsVision({ force: true, immediate: true });
      },
    });

    const hint = $("#hs-layer-hint");
    if (hint && invent) {
      const tName = hotseat.seats.find((s) => s.id === targetId)?.displayName || "stack";
      hint.textContent = targetId === invent.seatId ? "Your stack" : `Layering on ${tName}`;
    }

    const playing = Boolean(canEdit);
    const setDis = (id, on) => {
      const el = $(id);
      if (el) el.disabled = !on;
    };
    setDis("#btn-hs-challenge", playing && !invent.challengePassed && invent.turnPhase !== "scrutiny");
    setDis(
      "#btn-hs-submit-challenge",
      playing && (invent.turnPhase === "scrutiny" || !invent.challengePassed)
    );
    setDis(
      "#btn-hs-pilot",
      playing && invent.challengePassed && invent.deployStage === "none" && !invent.pilotFailedThisTurn
    );
    setDis(
      "#btn-hs-scale",
      playing && invent.deployStage === "pilot_ok" && !invent.scaleFailedThisTurn
    );
    setDis(
      "#btn-hs-abandon",
      playing &&
        invent.deployStage !== "scaled" &&
        invent.deployStage !== "new_normal"
    );
    setDis("#btn-hs-end-turn", place.status === "playing");
    // Wait only when stack target is the active seat's own invent
    const hsLayerTarget = $("#hs-layer-target")?.value || invent?.seatId;
    const hsWaitOwn =
      place.status === "playing" &&
      (!hsLayerTarget || hsLayerTarget === invent?.seatId);
    setDis("#btn-hs-wait", hsWaitOwn);
    const hsWaitBtn = $("#btn-hs-wait");
    if (hsWaitBtn) {
      hsWaitBtn.title = !hsWaitOwn
        ? "Wait is only for your own invent — switch stack target to your stack first"
        : "Wait +2 years on your invent (ends seat-turn)";
    }

    const phase = $("#hs-phase-hint");
    if (phase && invent) {
      if (place.status === "won") phase.textContent = "Place held — see ranking.";
      else if (place.status === "collapsed") phase.textContent = "Collapsed — nobody wins.";
      else if (invent.abandoned) phase.textContent = "You abandoned — layer on others or Wait.";
      else if (!invent.challengePassed)
        phase.textContent = "Add emTech on the left → write story → Face challenge → Pilot → Scale.";
      else if (invent.deployStage === "none")
        phase.textContent = "Challenge cleared — attempt Pilot (personal).";
      else if (invent.deployStage === "pilot_ok")
        phase.textContent = "Pilot ok — Scale to update the shared crisis!";
      else if (invent.deployStage === "scaled" || invent.deployStage === "new_normal")
        phase.textContent = "This invent is fielded. Help another invent or End turn / Pass device.";
      else phase.textContent = "";
    }

    const outcome = $("#hs-outcome");
    if (outcome) {
      const showOut = place.status === "won" || place.status === "collapsed";
      outcome.hidden = !showOut;
      if (showOut) renderHsOutcome();
    }

    scheduleHsVision();
  }

  function renderHsOutcome() {
    const el = $("#hs-outcome-body");
    if (!el || !hotseat?.place) return;
    if (hotseat.place.status === "collapsed") {
      el.innerHTML = `<p><strong>The place fell.</strong> No champion.</p><p class="muted">${escapeHtml(
        hotseat.place.lastNews || ""
      )}</p>`;
      return;
    }
    const rows = hotseat.ranking?.rows || [];
    el.innerHTML = `<p><strong>Crisis held!</strong> Friendly ranking:</p>
      <ol class="hs-rank-list">
      ${rows
        .map(
          (r) =>
            `<li><strong>#${r.rank} ${escapeHtml(r.displayName)}</strong> — ${r.score} pts
            <span class="muted sm">(impact ${Math.round(r.impactNorm * 100)} · craft ${Math.round(
              r.craftNorm * 100
            )} · help ${Math.round(r.contributionNorm * 100)} · race ${Math.round(
              r.raceNorm * 100
            )})</span></li>`
        )
        .join("")}
      </ol>`;
  }

  function wireHotseatFields() {
    if (hsWired) return;
    hsWired = true;
    for (const [id, field] of [
      ["hs-invention-name", "inventionName"],
      ["hs-invention-how", "inventionHow"],
      ["hs-invention-impact", "inventionImpact"],
    ]) {
      const el = $(`#${id}`);
      if (!el) continue;
      el.addEventListener("input", () => {
        if (!hotseat?.place) return;
        const r = hotseatApplyAction(hotseat, {
          type: "buffer_write",
          payload: { field, value: el.value },
        });
        if (!r.ok) {
          flashToast(r.error === "not_active_seat" ? "Not your turn" : r.error);
          return;
        }
        hotseat = r.session;
        scheduleHsVision();
      });
      el.addEventListener("blur", () => {
        if (!hotseat?.place) return;
        const r = hotseatApplyAction(hotseat, {
          type: "write_commit",
          payload: { field, value: el.value, changed: true },
        });
        if (r.ok) {
          hotseat = r.session;
          scheduleHsVision({ force: true });
        }
      });
    }
    $("#hs-layer-target")?.addEventListener("change", () => {
      if (hotseat?.place) renderHotseat();
    });
  }

  $("#btn-hotseat-start")?.addEventListener("click", () => {
    // Solo crisis → Quest screens, then real workshop via hotseat bridge
    launchHotseatMissionPick();
  });

  $("#btn-hs-rotate")?.addEventListener("click", () => {
    if (!hotseat?.place) return;
    hsAct({ type: "end_turn" }, `Now playing: next seat`);
  });

  $("#btn-hs-leave")?.addEventListener("click", () => {
    hotseat = null;
    hsSide?.destroy();
    hsSide = null;
    showScreen("friends");
  });

  $("#btn-hs-end-turn")?.addEventListener("click", () => {
    const nextName = (() => {
      if (!hotseat?.seatOrder) return "";
      const n = hotseat.seatOrder.length;
      const i = (hotseat.activeIndex + 1) % n;
      const id = hotseat.seatOrder[i];
      return hotseat.seats.find((s) => s.id === id)?.displayName || "";
    })();
    hsAct({ type: "end_turn" }, nextName ? `Passed to ${nextName}` : "Turn ended");
  });

  $("#btn-hs-wait")?.addEventListener("click", () => {
    const invent = activeInvent(hotseat);
    const place = hotseat?.place;
    const hsLayerTarget = $("#hs-layer-target")?.value || invent?.seatId;
    if (invent?.seatId && hsLayerTarget && hsLayerTarget !== invent.seatId) {
      flashToast(
        "Wait is only for your own invent — switch stack target to your stack first"
      );
      return;
    }
    const run = () =>
      hsAct({ type: "wait" }, "Wait — your invent +2 years, turn passed");
    if (typeof openWaitConfirm === "function") {
      openWaitConfirm(run, {
        multiparty: true,
        year: invent?.year ?? place?.year,
        waits: invent?.waits ?? 0,
        pressure: place?.pressure,
        mission: place?.mission,
      });
    } else run();
  });

  $("#btn-hs-challenge")?.addEventListener("click", () => {
    hsAct({ type: "enter_challenge" }, "Challenge started — write your answer");
  });

  $("#btn-hs-submit-challenge")?.addEventListener("click", () => {
    const answer = $("#hs-challenge-answer")?.value || "";
    // enter if needed
    if (activeInvent(hotseat)?.turnPhase !== "scrutiny") {
      const ent = hotseatApplyAction(hotseat, { type: "enter_challenge" });
      if (ent.ok) hotseat = ent.session;
    }
    hsAct({ type: "submit_challenge", payload: { answer } }, "Challenge submitted");
  });

  $("#btn-hs-pilot")?.addEventListener("click", () => {
    hsAct({ type: "attempt_pilot", payload: { feasibilityLevel: "yellow" } });
  });

  $("#btn-hs-scale")?.addEventListener("click", () => {
    hsAct({ type: "attempt_scale", payload: { feasibilityLevel: "yellow" } });
  });

  $("#btn-hs-abandon")?.addEventListener("click", () => {
    if (!confirm("Abandon your invention and only help others?")) return;
    hsAct({ type: "abandon" }, "Abandoned — you can layer on others");
  });

  // Resume room session if present
  if (client.session?.playerToken) {
    client
      .connect()
      .then(() => {
        if (client.snapshot?.phase === "playing") {
          tryEnterRoomPlayOnce("resume");
        } else if (client.snapshot) {
          showScreen("room-lobby");
          renderLobby();
        }
      })
      .catch(() => {
        /* stay on title */
      });
  }

  return { client, getHotseat: () => hotseat };
}
