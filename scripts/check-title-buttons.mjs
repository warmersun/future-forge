/**
 * Headless smoke: load app, click title buttons, assert screens change.
 * Usage: node scripts/check-title-buttons.mjs [baseUrl]
 */
import WebSocket from "ws";
import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";

const BASE = process.argv[2] || "http://127.0.0.1:8765";
const PORT = 9334;
const userData = `/tmp/chrome-ff-title-${process.pid}`;

const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userData}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] }
);

let chromeErr = "";
chrome.stderr.on("data", (d) => {
  chromeErr += d.toString();
});

try {
  let wsUrl = "";
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    try {
      const v = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) =>
        r.json()
      );
      wsUrl = v.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch {
      /* retry */
    }
  }
  if (!wsUrl) {
    throw new Error("Chrome CDP not ready: " + chromeErr.slice(0, 300));
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => {
    ws.on("open", r);
    ws.on("error", j);
  });

  let nextId = 1;
  const pending = new Map();
  const exceptions = [];
  const consoleLogs = [];

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id != null && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params?.exceptionDetails;
      exceptions.push(
        d?.exception?.description || d?.text || JSON.stringify(d || {})
      );
    }
    if (msg.method === "Runtime.consoleAPICalled") {
      const args = (msg.params?.args || [])
        .map((a) => a.value ?? a.description ?? "")
        .join(" ");
      consoleLogs.push(`${msg.params?.type || "log"}: ${args}`);
    }
  });

  function send(method, params = {}, sessionId) {
    const id = nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify(payload));
    });
  }

  const created = await send("Target.createTarget", { url: BASE + "/" });
  const targetId = created.result?.targetId;
  if (!targetId) throw new Error("no target: " + JSON.stringify(created));

  const attached = await send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const sessionId = attached.result?.sessionId;
  if (!sessionId) throw new Error("no session: " + JSON.stringify(attached));

  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send("Network.enable", {}, sessionId);

  // Wait for load event
  await new Promise((resolve) => {
    const t = setTimeout(resolve, 5000);
    const handler = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (
        msg.method === "Page.loadEventFired" ||
        (msg.method === "Page.frameStoppedLoading" && msg.sessionId === sessionId)
      ) {
        clearTimeout(t);
        ws.off("message", handler);
        resolve();
      }
    };
    ws.on("message", handler);
  });
  await sleep(1500);

  const evalRes = await send(
    "Runtime.evaluate",
    {
      expression: `(() => {
        const active = () => document.querySelector('.screen.active')?.id || null;
        const result = {
          titleText: document.getElementById('game-title')?.textContent || '',
          before: active(),
          hasStart: !!document.getElementById('btn-start'),
          hasSurprise: !!document.getElementById('btn-surprise'),
          hasFriends: !!document.getElementById('btn-friends'),
        };
        document.getElementById('btn-start')?.click();
        result.afterStart = active();
        document.getElementById('btn-global-back')?.click();
        result.afterGlobalBack = active();
        document.getElementById('btn-friends')?.click();
        result.afterFriends = active();
        document.getElementById('btn-friends-back')?.click();
        result.afterFriendsBack = active();
        return result;
      })()`,
      returnByValue: true,
    },
    sessionId
  );

  const value = evalRes.result?.result?.value;
  console.log(JSON.stringify({ value, exceptions, consoleLogs: consoleLogs.slice(0, 30) }, null, 2));

  const fail = [];
  if (!value?.hasStart || !value?.hasSurprise || !value?.hasFriends) {
    fail.push("missing title buttons in DOM");
  }
  if (value?.afterStart !== "screen-global") {
    fail.push(`Choose a theme did not open global (got ${value?.afterStart})`);
  }
  if (value?.afterFriends !== "screen-friends") {
    fail.push(`Play with friends did not open friends (got ${value?.afterFriends})`);
  }
  if (exceptions.length) {
    fail.push("JS exceptions: " + exceptions.join(" | "));
  }

  ws.close();
  if (fail.length) {
    console.error("FAIL:", fail.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("PASS: title buttons work");
  }
} finally {
  chrome.kill("SIGKILL");
}
