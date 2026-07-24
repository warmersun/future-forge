/**
 * Friends room UI — lobby + shared invent + room AI (PR9–11) + hotseat entry (PR12).
 */

import { GLOBALS, localScenariosForGlobal, techById } from "../data.js";
import { RoomClient } from "./client.js";
import {
  createHotseatSession,
  activeSeat,
  rotateSeat,
  setHotseatMission,
  startHotseatMission,
  hotseatApplyAction,
} from "./hotseat.js";

/**
 * @param {{ showScreen: Function, flashToast: Function, $: Function, $$: Function, escapeHtml: Function }} api
 */
export function initFriendsUi(api) {
  const { showScreen, flashToast, $, $$, escapeHtml } = api;
  const client = new RoomClient();
  let bufferTimers = {};
  /** @type {import('./hotseat.js').HotseatSession|null} */
  let hotseat = null;
  let hsWired = false;

  function setHubStatus(msg) {
    const el = $("#friends-hub-status");
    if (el) el.textContent = msg || "";
  }

  function setLobbyStatus(msg) {
    const el = $("#room-lobby-status");
    if (el) el.textContent = msg || "";
  }

  function setPlayStatus(msg) {
    const el = $("#mp-status");
    if (el) el.textContent = msg || "";
  }

  function renderLobby() {
    const snap = client.snapshot;
    if (!snap) return;
    const codeEl = $("#room-code-display");
    if (codeEl) codeEl.textContent = snap.code || client.session?.code || "————";
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
    const summary = $("#room-mission-summary");
    if (summary) {
      if (snap.missionMeta?.mission) {
        const m = snap.missionMeta.mission;
        summary.textContent = `${m.title} · ${m.place}`;
      } else {
        summary.textContent = snap.you?.isHost
          ? "Pick a theme and mission, then start."
          : "Waiting for host to pick a mission…";
      }
    }
    if (snap.you?.isHost) fillHostSelects();
    if (snap.phase === "playing" && snap.sim) {
      showScreen("room-play");
      renderPlay();
    }
  }

  function fillHostSelects() {
    const themeSel = $("#room-theme-select");
    const missionSel = $("#room-mission-select");
    if (!themeSel || !missionSel) return;
    if (!themeSel.options.length) {
      themeSel.innerHTML = GLOBALS.map(
        (g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.title)}</option>`
      ).join("");
      themeSel.addEventListener("change", () => populateMissions(themeSel.value));
      populateMissions(themeSel.value || GLOBALS[0]?.id);
    }
  }

  function populateMissions(globalId) {
    const missionSel = $("#room-mission-select");
    if (!missionSel) return;
    const g = GLOBALS.find((x) => x.id === globalId) || GLOBALS[0];
    const list = localScenariosForGlobal(g, { count: 4, salt: 0 });
    missionSel.innerHTML = list
      .map(
        (m) =>
          `<option value="${escapeHtml(m.id)}">${escapeHtml(m.title)} — ${escapeHtml(m.place)}</option>`
      )
      .join("");
    missionSel._missions = list;
  }

  function currentHostMission() {
    const themeSel = $("#room-theme-select");
    const missionSel = $("#room-mission-select");
    const list = missionSel?._missions || [];
    const m = list.find((x) => x.id === missionSel?.value) || list[0];
    return { globalId: themeSel?.value, mission: m };
  }

  function renderPlay() {
    const snap = client.snapshot;
    const sim = snap?.sim;
    if (!sim) return;
    const code = $("#mp-room-code");
    if (code) code.textContent = snap.code || "";
    $("#mp-hud-year").textContent = String(sim.year);
    $("#mp-hud-turn").textContent = `Turn ${sim.turn}`;
    $("#mp-hud-ap").textContent = `AP ${sim.ap}/${sim.apMax}`;
    $("#mp-hud-budget").textContent = `Budget ${sim.budget}$`;
    $("#mp-hud-will").textContent = `Will ${sim.will}`;
    $("#mp-mission-title").textContent = sim.mission?.title || "Shared invention";
    $("#mp-mission-place").textContent = sim.mission
      ? `${sim.mission.place} · collapse ${sim.mission.collapseYear}`
      : "";
    $("#mp-news").textContent = sim.lastNews || sim.waitReport || "";

    // Pressure
    const box = $("#mp-pressure");
    if (box) {
      box.innerHTML = Object.entries(sim.pressure || {})
        .map(([k, v]) => {
          const level = v >= 4 ? "hot" : v >= 2 ? "warm" : "cool";
          return `<span class="meter ${level}"><b>${escapeHtml(k)}</b> ${"●".repeat(v)}${"○".repeat(
            Math.max(0, 5 - v)
          )}</span>`;
        })
        .join("");
    }

    // Players
    const plist = $("#mp-player-list");
    if (plist) {
      plist.innerHTML = (snap.players || [])
        .map(
          (p) =>
            `<li class="${p.connected ? "is-online" : "is-offline"}"><strong>${escapeHtml(
              p.displayName
            )}</strong>${p.isHost ? " · host" : ""}</li>`
        )
        .join("");
    }

    // Fields — avoid clobbering active focus
    syncField("mp-invention-name", sim.inventionName, "inventionName");
    syncField("mp-invention-how", sim.inventionHow, "inventionHow");
    syncField("mp-invention-impact", sim.inventionImpact, "inventionImpact");

    paintLocks(snap.fieldLocks || {});
    paintStack(sim);
    paintTechTray(sim);
  }

  function syncField(id, value, fieldKey) {
    const el = $(`#${id}`);
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.value !== (value || "")) el.value = value || "";
    el.dataset.field = fieldKey;
  }

  function paintLocks(locks) {
    for (const [field, hintId] of [
      ["inventionName", "mp-lock-name"],
      ["inventionHow", "mp-lock-how"],
      ["inventionImpact", "mp-lock-impact"],
    ]) {
      const el = $(`#${hintId}`);
      if (!el) continue;
      const lock = locks[field];
      if (lock && lock.until > Date.now()) {
        el.textContent = `${lock.displayName} is editing…`;
      } else {
        el.textContent = "";
      }
    }
  }

  function paintStack(sim) {
    const box = $("#mp-stack");
    if (!box) return;
    const techs = (sim.selectedTechIds || []).map(techById).filter(Boolean);
    if (!techs.length) {
      box.innerHTML = `<span class="muted">No techs yet — pick from the tray (1 AP + Budget each).</span>`;
      return;
    }
    box.innerHTML = techs
      .map(
        (t) =>
          `<button type="button" class="mp-chip" data-tech-id="${escapeHtml(t.id)}" title="Remove">${escapeHtml(
            t.icon || ""
          )} ${escapeHtml(t.name)}</button>`
      )
      .join("");
    box.querySelectorAll(".mp-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          client.sendAction({ type: "deselect_tech", payload: { techId: btn.dataset.techId } });
        } catch (e) {
          flashToast(e.message || "Not connected");
        }
      });
    });
  }

  function paintTechTray(sim) {
    const tray = $("#mp-tech-tray");
    if (!tray) return;
    const selected = new Set(sim.selectedTechIds || []);
    // Show a compact set: mission suggested + a few staples
    const suggested = sim.mission?.suggested || [];
    const ids = [...new Set([...suggested, "ai", "iot", "solar", "networks", "drones", "battery"])].slice(
      0,
      14
    );
    tray.innerHTML = ids
      .map((id) => {
        const t = techById(id);
        if (!t || selected.has(id)) return "";
        return `<button type="button" class="mp-tech-btn" data-tech-id="${escapeHtml(id)}">${escapeHtml(
          t.icon || ""
        )} ${escapeHtml(t.name)}</button>`;
      })
      .filter(Boolean)
      .join("");
    tray.querySelectorAll(".mp-tech-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tech = techById(btn.dataset.techId);
        try {
          client.sendAction({
            type: "select_tech",
            payload: { techId: btn.dataset.techId, tech },
          });
        } catch (e) {
          flashToast(e.message || "Not connected");
        }
      });
    });
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
      if (client.snapshot?.phase === "playing") {
        showScreen("room-play");
        wireFields();
        renderPlay();
      } else {
        showScreen("room-lobby");
        renderLobby();
      }
    }
    if (evt.type === "patch") {
      renderPlay();
      const last = (evt.events || [])[0];
      if (last?.type === "wait") setPlayStatus(`Wait → year ${client.snapshot?.sim?.year}`);
      if (last?.type === "end_turn") setPlayStatus("End turn — AP refilled for everyone.");
      if (last?.type === "tech_added") setPlayStatus("Stack updated.");
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
      const friendly =
        err === "player_rate_quota"
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
                    : err;
      flashToast(friendly);
      setPlayStatus(friendly);
      setAiPending(false);
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
  $("#btn-friends-back")?.addEventListener("click", () => showScreen("title"));
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

  $("#btn-room-leave")?.addEventListener("click", () => {
    client.leaveLocal();
    showScreen("friends");
  });
  $("#btn-mp-leave")?.addEventListener("click", () => {
    client.leaveLocal();
    showScreen("friends");
  });

  $("#btn-room-set-mission")?.addEventListener("click", async () => {
    const { globalId, mission } = currentHostMission();
    if (!mission) {
      flashToast("Pick a mission");
      return;
    }
    try {
      await client.hostCmd("set_mission", { globalId, mission });
      setLobbyStatus(`Mission set: ${mission.title}`);
      // optimistic
      if (client.snapshot) {
        client.snapshot.missionMeta = { globalId, mission };
        client.snapshot.phase = "ready";
      }
      renderLobby();
    } catch (e) {
      flashToast(e.message || "Failed");
    }
  });

  $("#btn-room-start")?.addEventListener("click", async () => {
    let meta = client.snapshot?.missionMeta;
    if (!meta?.mission) {
      const cur = currentHostMission();
      if (!cur.mission) {
        flashToast("Set a mission first");
        return;
      }
      await client.hostCmd("set_mission", cur);
      meta = cur;
    }
    try {
      await client.hostCmd("start_mission", meta);
      setLobbyStatus("Starting…");
    } catch (e) {
      flashToast(e.message || "Start failed");
    }
  });

  $("#btn-mp-end-turn")?.addEventListener("click", () => {
    try {
      client.sendAction({ type: "end_turn" });
    } catch (e) {
      flashToast(e.message);
    }
  });
  $("#btn-mp-wait")?.addEventListener("click", () => {
    const sim = client.snapshot?.sim;
    if (!sim?.mission) return;
    try {
      client.sendAction({
        type: "wait",
        payload: {
          mission: sim.mission,
          techs: (sim.selectedTechIds || []).map(techById).filter(Boolean),
          stretchLevel: "yellow",
        },
      });
    } catch (e) {
      flashToast(e.message);
    }
  });

  $("#btn-mp-ai")?.addEventListener("click", () => {
    const sim = client.snapshot?.sim;
    if (!sim) return;
    try {
      setAiPending(true, "Asking co-inventor…");
      client.requestAi({
        mode: "chat",
        userLabel:
          `Shared invention "${sim.inventionName || "untitled"}" in ${sim.mission?.place || "this place"}. ` +
          `How: ${String(sim.inventionHow || "").slice(0, 400)}. ` +
          `Suggest one concrete improvement for the stack or how-it-works.`,
        reservedAp: 1,
      });
    } catch (e) {
      setAiPending(false);
      flashToast(e.message || "Not connected");
    }
  });

  /* —— Hotseat (PR12) —— */
  function setHsStatus(msg) {
    const el = $("#hs-status");
    if (el) el.textContent = msg || "";
  }

  function renderHotseat() {
    if (!hotseat) return;
    const seat = activeSeat(hotseat);
    const badge = $("#hs-active-seat");
    if (badge) badge.textContent = seat ? `Active: ${seat.displayName}` : "Seat —";
    const list = $("#hs-seat-list");
    if (list) {
      list.innerHTML = hotseat.seats
        .map(
          (s, i) =>
            `<li class="${i === hotseat.activeIndex ? "is-online" : "is-offline"}">
              <strong>${escapeHtml(s.displayName)}</strong>
              ${i === hotseat.activeIndex ? '<span class="tag">active</span>' : ""}
            </li>`
        )
        .join("");
    }
    const setup = $("#hs-setup");
    if (setup) setup.hidden = Boolean(hotseat.sim);
    const sim = hotseat.sim;
    if (!sim) {
      fillHsSelects();
      return;
    }
    $("#hs-hud-year").textContent = String(sim.year);
    $("#hs-hud-turn").textContent = `Turn ${sim.turn}`;
    $("#hs-hud-ap").textContent = `AP ${sim.ap}/${sim.apMax}`;
    $("#hs-hud-budget").textContent = `Budget ${sim.budget}$`;
    $("#hs-hud-will").textContent = `Will ${sim.will}`;
    $("#hs-mission-title").textContent = sim.mission?.title || "Hotseat invention";
    $("#hs-mission-place").textContent = sim.mission
      ? `${sim.mission.place} · pass device to take turns`
      : "";
    $("#hs-news").textContent = sim.lastNews || "";
    const box = $("#hs-pressure");
    if (box) {
      box.innerHTML = Object.entries(sim.pressure || {})
        .map(([k, v]) => {
          const level = v >= 4 ? "hot" : v >= 2 ? "warm" : "cool";
          return `<span class="meter ${level}"><b>${escapeHtml(k)}</b> ${"●".repeat(v)}${"○".repeat(
            Math.max(0, 5 - v)
          )}</span>`;
        })
        .join("");
    }
    for (const [id, val] of [
      ["hs-invention-name", sim.inventionName],
      ["hs-invention-how", sim.inventionHow],
      ["hs-invention-impact", sim.inventionImpact],
    ]) {
      const el = $(`#${id}`);
      if (el && document.activeElement !== el && el.value !== (val || "")) el.value = val || "";
    }
    const stack = $("#hs-stack");
    if (stack) {
      const techs = (sim.selectedTechIds || []).map(techById).filter(Boolean);
      stack.innerHTML = techs.length
        ? techs
            .map(
              (t) =>
                `<button type="button" class="mp-chip" data-tech-id="${escapeHtml(t.id)}">${escapeHtml(
                  t.icon || ""
                )} ${escapeHtml(t.name)}</button>`
            )
            .join("")
        : `<span class="muted">No techs yet.</span>`;
      stack.querySelectorAll(".mp-chip").forEach((btn) => {
        btn.onclick = () => {
          const r = hotseatApplyAction(hotseat, {
            type: "deselect_tech",
            payload: { techId: btn.dataset.techId },
          });
          if (!r.ok) {
            flashToast(r.error === "not_active_seat" ? "Not your turn — pass the device" : r.error);
            return;
          }
          hotseat = r.session;
          renderHotseat();
        };
      });
    }
    const tray = $("#hs-tech-tray");
    if (tray) {
      const selected = new Set(sim.selectedTechIds || []);
      const ids = [
        ...new Set([...(sim.mission?.suggested || []), "ai", "iot", "solar", "networks", "drones"]),
      ].slice(0, 12);
      tray.innerHTML = ids
        .map((id) => {
          const t = techById(id);
          if (!t || selected.has(id)) return "";
          return `<button type="button" class="mp-tech-btn" data-tech-id="${escapeHtml(id)}">${escapeHtml(
            t.icon || ""
          )} ${escapeHtml(t.name)}</button>`;
        })
        .filter(Boolean)
        .join("");
      tray.querySelectorAll(".mp-tech-btn").forEach((btn) => {
        btn.onclick = () => {
          const tech = techById(btn.dataset.techId);
          const r = hotseatApplyAction(hotseat, {
            type: "select_tech",
            payload: { techId: btn.dataset.techId, tech },
          });
          if (!r.ok) {
            flashToast(r.error === "not_active_seat" ? "Not your turn — pass the device" : r.error);
            return;
          }
          hotseat = r.session;
          renderHotseat();
        };
      });
    }
  }

  function fillHsSelects() {
    const themeSel = $("#hs-theme-select");
    const missionSel = $("#hs-mission-select");
    if (!themeSel || !missionSel) return;
    if (!themeSel.options.length) {
      themeSel.innerHTML = GLOBALS.map(
        (g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.title)}</option>`
      ).join("");
      themeSel.onchange = () => {
        const g = GLOBALS.find((x) => x.id === themeSel.value) || GLOBALS[0];
        const list = localScenariosForGlobal(g, { count: 4, salt: 0 });
        missionSel.innerHTML = list
          .map(
            (m) =>
              `<option value="${escapeHtml(m.id)}">${escapeHtml(m.title)} — ${escapeHtml(m.place)}</option>`
          )
          .join("");
        missionSel._missions = list;
      };
      themeSel.onchange();
    }
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
        if (!hotseat?.sim) return;
        const r = hotseatApplyAction(hotseat, {
          type: "buffer_write",
          payload: { field, value: el.value },
        });
        if (!r.ok) {
          flashToast(r.error === "not_active_seat" ? "Not your turn" : r.error);
          return;
        }
        hotseat = r.session;
      });
      el.addEventListener("blur", () => {
        if (!hotseat?.sim) return;
        const r = hotseatApplyAction(hotseat, {
          type: "write_commit",
          payload: { field, value: el.value, changed: true },
        });
        if (r.ok) hotseat = r.session;
      });
    }
  }

  $("#btn-hotseat-start")?.addEventListener("click", () => {
    const raw = $("#hotseat-names")?.value || "Alex, Bea";
    const names = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    hotseat = createHotseatSession(names.length >= 2 ? names : ["Alex", "Bea"]);
    showScreen("hotseat");
    wireHotseatFields();
    renderHotseat();
    setHsStatus("Pick a mission, then begin. Pass the device between seats.");
  });

  $("#btn-hs-begin")?.addEventListener("click", () => {
    if (!hotseat) return;
    const themeSel = $("#hs-theme-select");
    const missionSel = $("#hs-mission-select");
    const list = missionSel?._missions || [];
    const m = list.find((x) => x.id === missionSel?.value) || list[0];
    if (!m) {
      flashToast("Pick a mission");
      return;
    }
    hotseat = setHotseatMission(hotseat, m, themeSel?.value);
    const started = startHotseatMission(hotseat);
    if (!started.ok) {
      flashToast(started.error || "Start failed");
      return;
    }
    hotseat = started.session;
    renderHotseat();
    setHsStatus(`Active: ${activeSeat(hotseat).displayName}`);
  });

  $("#btn-hs-rotate")?.addEventListener("click", () => {
    if (!hotseat) return;
    hotseat = rotateSeat(hotseat, 1);
    renderHotseat();
    const s = activeSeat(hotseat);
    setHsStatus(`Passed to ${s.displayName}`);
    flashToast(`Now playing: ${s.displayName}`);
  });

  $("#btn-hs-leave")?.addEventListener("click", () => {
    hotseat = null;
    showScreen("friends");
  });

  $("#btn-hs-end-turn")?.addEventListener("click", () => {
    if (!hotseat?.sim) return;
    const r = hotseatApplyAction(hotseat, { type: "end_turn" });
    if (!r.ok) {
      flashToast(r.error === "not_active_seat" ? "Not your turn" : r.error);
      return;
    }
    hotseat = r.session;
    renderHotseat();
    setHsStatus("End turn — AP refilled.");
  });

  $("#btn-hs-wait")?.addEventListener("click", () => {
    if (!hotseat?.sim?.mission) return;
    const r = hotseatApplyAction(hotseat, {
      type: "wait",
      payload: {
        mission: hotseat.sim.mission,
        techs: (hotseat.sim.selectedTechIds || []).map(techById).filter(Boolean),
        stretchLevel: "yellow",
      },
    });
    if (!r.ok) {
      flashToast(r.error === "not_active_seat" ? "Not your turn" : r.error);
      return;
    }
    hotseat = r.session;
    renderHotseat();
    setHsStatus(`Wait → year ${hotseat.sim.year}`);
  });

  // Resume room session if present
  if (client.session?.playerToken) {
    client
      .connect()
      .then(() => {
        if (client.snapshot?.phase === "playing") {
          showScreen("room-play");
          wireFields();
          renderPlay();
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
