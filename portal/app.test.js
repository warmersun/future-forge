import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  startPortal, accountPortalHost, clerkFrontendApiHost, isAllowedGameReturnUrl,
  portalBaseFromModuleUrl,
} from "./app.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const key = (host) => `pk_test_${Buffer.from(`${host}$`).toString("base64")}`;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeUi(initial) {
  const listeners = {};
  const nav = ["/", "/signin", "/subscribe"].map((route) => ({
    route, attrs: {}, getAttribute: () => route,
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
  }));
  const status = { textContent: "" };
  const mount = {};
  const signInMount = {};
  const app = { innerHTML: "" };
  const first = new URL(initial);
  const location = {
    href: first.href, origin: first.origin, pathname: first.pathname, search: first.search,
    replace(value) { this.replaced = value; },
  };
  const win = {
    location, listeners,
    addEventListener(name, fn) { listeners[name] = fn; },
    history: { pushState(_state, _title, url) { Object.assign(location, { href: url, ...Object.fromEntries(["pathname", "search", "origin"].map((p) => [p, new URL(url)[p]])) }); } },
    close() { this.closed = true; },
  };
  const doc = {
    title: "", head: { appendChild(script) { win.lastScript = script; script.onload(); } },
    createElement() { return { setAttribute() {} }; },
    getElementById(id) { return { app, status, "clerk-mount": mount, "signin-mount": signInMount }[id]; },
    querySelectorAll() { return nav; },
    addEventListener(name, fn) { listeners[name] = fn; },
  };
  return { doc, win, app, status, mount, signInMount, nav };
}

test("Clerk host and return URL allowlist reject redirects to arbitrary origins", () => {
  assert.equal(clerkFrontendApiHost(key("abc.clerk.accounts.dev")), "abc.clerk.accounts.dev");
  assert.equal(accountPortalHost(key("abc.clerk.accounts.dev")), "abc.accounts.dev");
  assert.equal(accountPortalHost(key("clerk.warmersun.com")), "accounts.warmersun.com");
  assert.throws(() => clerkFrontendApiHost(key("evil.com/path")));
  assert.throws(() => accountPortalHost(key("evil.com")));
  for (const url of ["https://ff.warmersun.com/game", "http://127.0.0.1:8765/", "https://node.ts.net/"]) assert.equal(isAllowedGameReturnUrl(url), true);
  for (const url of ["https://warmersun.com.evil.org", "https://evil.org", "javascript:alert(1)", "https://user@ff.warmersun.com/"]) assert.equal(isAllowedGameReturnUrl(url), false);
});

test("SPA renders home, navigates by history, and handles disabled Clerk", async (t) => {
  const ui = fakeUi("https://portal.example/");
  const previous = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ clerk: { enabled: false } }) });
  t.after(() => { globalThis.fetch = previous; });
  startPortal(ui);
  assert.match(ui.app.innerHTML, /Explore hosted access/);
  assert.doesNotMatch(ui.app.innerHTML, /Open Future Forge|ff\.warmersun\.com/);
  assert.equal(ui.nav[0].attrs["aria-current"], "page");
  ui.win.history.pushState(null, "", "https://portal.example/signin?device=XYZ");
  ui.win.listeners.popstate();
  await tick();
  assert.match(ui.status.textContent, /Sign in is off/);
  assert.equal(ui.nav[1].attrs["aria-current"], "page");
  ui.win.history.pushState(null, "", "https://portal.example/subscribe");
  ui.win.listeners.popstate();
  await tick();
  assert.match(ui.app.innerHTML, /\$49, billed monthly/);
  assert.doesNotMatch(ui.app.innerHTML, /Open the hosted app|ff\.warmersun\.com/);
  assert.match(ui.status.textContent, /Subscriptions are off/);
});

test("mounted portal keeps routes and API calls under its path", async (t) => {
  assert.equal(portalBaseFromModuleUrl("https://warmersun.com/portal/app.js"), "/portal");
  assert.equal(portalBaseFromModuleUrl("https://example.here.now/app.js"), "");
  const ui = fakeUi("https://warmersun.com/portal/");
  const calls = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ clerk: { enabled: false } }) };
  };
  t.after(() => { globalThis.fetch = previous; });
  startPortal({ ...ui, base: "/portal" });
  assert.match(ui.app.innerHTML, /href="\/portal\/subscribe"/);
  ui.win.history.pushState(null, "", "https://warmersun.com/portal/subscribe");
  ui.win.listeners.popstate();
  await tick();
  assert.equal(calls[0], "/portal/api/health");
  assert.equal(ui.nav[2].attrs["aria-current"], "page");
});

test("device callback completes with Clerk token then returns to allowed game URL", async (t) => {
  const ret = "https://ff.warmersun.com/play";
  const ui = fakeUi(`https://portal.example/signin?device=XYZ&return=${encodeURIComponent(ret)}`);
  const calls = [];
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  // "1" = Clerk sign-in already finished for this device flow, so the portal
  // completes the handshake instead of sending the user back to Clerk.
  globalThis.sessionStorage = { getItem() { return "1"; }, removeItem() {}, setItem() {} };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === "/api/health") return { ok: true, json: async () => ({ apiOrigin: "https://function.example", clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }) };
    return { ok: true, json: async () => ({ ok: true }) };
  };
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  ui.win.Clerk = { load: async () => {}, session: { getToken: async () => "token-123" } };
  startPortal(ui);
  await tick(); await tick();

  assert.equal(calls[1].url, "https://function.example/api/device/complete");
  assert.equal(calls[1].options.headers.Authorization, "Bearer token-123");
  assert.deepEqual(JSON.parse(calls[1].options.body), { code: "XYZ" });
  assert.equal(ui.win.location.replaced, ret);
});


test("pricing mounts Clerk table and returns to the portal, not an app host", async (t) => {
  const ui = fakeUi("https://portal.example/subscribe");
  const previous = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }) });
  t.after(() => { globalThis.fetch = previous; });
  let options;
  ui.win.Clerk = { load: async () => {}, mountPricingTable(_mount, opts) { options = opts; }, unmountPricingTable() {} };
  startPortal(ui);
  await tick(); await tick();
  assert.equal(options.for, "user");
  assert.equal(options.newSubscriptionRedirectUrl, "https://portal.example/");
  assert.equal(ui.status.textContent, "");
});

test("signin mounts Clerk's own form and preserves the device callback URL", async (t) => {
  const ui = fakeUi("https://portal.example/signin?device=ABC");
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  let bounced = false;
  globalThis.sessionStorage = {
    getItem() { return bounced ? "1" : null; },
    setItem() { bounced = true; }, removeItem() { bounced = false; },
  };
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url === "/api/health"
    ? { clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }
    : { ok: true } });
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  let signInOptions;
  ui.win.Clerk = { load: async () => {}, session: null, unmountSignIn() {},
    mountSignIn(mount, opts) { assert.equal(mount, ui.signInMount); signInOptions = opts; } };
  const rerender = startPortal(ui);
  await tick(); await tick();
  assert.equal(signInOptions.routing, "hash");
  assert.equal(signInOptions.forceRedirectUrl, "https://portal.example/signin?device=ABC");
  assert.equal(signInOptions.signUpForceRedirectUrl, signInOptions.forceRedirectUrl);
  assert.equal(ui.win.location.replaced, undefined);
  assert.equal(bounced, true);
  // Clerk's own form produced a session; the portal then binds the device code.
  ui.win.Clerk.session = { getToken: async () => "token-123" };
  rerender();
  await tick(); await tick();
  assert.match(ui.status.textContent, /Signed in/);
  assert.equal(bounced, false);
});

test("an existing browser session signs out before Clerk's form appears", async (t) => {
  const ui = fakeUi("https://portal.example/signin?device=ABC");
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  let bounced = false;
  globalThis.sessionStorage = { getItem() { return bounced ? "1" : null; },
    setItem() { bounced = true; }, removeItem() { bounced = false; } };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") },
  }) });
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  let signInOptions;
  ui.win.Clerk = { load: async () => {}, session: { getToken: async () => "token-123" },
    signOut: async ({ redirectUrl }) => {
      assert.equal(redirectUrl, "https://portal.example/signin?device=ABC");
      ui.win.Clerk.session = null;
    },
    mountSignIn(_mount, opts) { signInOptions = opts; }, unmountSignIn() {} };
  const rerender = startPortal(ui);
  await tick(); await tick();
  assert.equal(bounced, true);
  assert.equal(ui.win.location.replaced, "https://portal.example/signin?device=ABC");
  assert.equal(signInOptions, undefined);
  rerender();
  await tick(); await tick();
  assert.equal(signInOptions.forceRedirectUrl, "https://portal.example/signin?device=ABC");
});

test("unsafe return URL does not redirect after successful device handshake", async (t) => {
  const ui = fakeUi("https://portal.example/signin?device=ABC&return=https%3A%2F%2Fevil.example%2F");
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem() { return "1"; }, removeItem() {}, setItem() {} };
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url === "/api/health"
    ? { clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } } : { ok: true } });
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  ui.win.Clerk = { load: async () => {}, session: { getToken: async () => "token-123" } };
  startPortal(ui);
  await tick(); await tick();

  assert.equal(ui.win.location.replaced, undefined);
  assert.equal(ui.win.closed, true);
});

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("live portal serves only exact SPA routes/assets; API stays JSON", { timeout: 18000 }, async (t) => {
  const port = await availablePort();
  const child = spawn(process.execPath, ["portal/server.mjs"], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(port), FF_HOST: "127.0.0.1", DATABASE_URL: " ", DATABASE_URL_UNPOOLED: " ", FF_QUESTS_REMOTE_URL: "off", FF_TRENDS_REMOTE_URL: "off", FF_QUESTS_BUCKET: " " },
  });
  t.after(() => child.kill());
  let output = "";
  child.stderr.on("data", (data) => { output += data; });
  child.stdout.on("data", (data) => { output += data; });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) break;
    try { const res = await fetch(`${base}/api`); if (res.ok) { ready = true; break; } } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `server did not start: ${output.slice(-600)}`);
  for (const route of ["/", "/signin?device=XYZ", "/subscribe"]) {
    const res = await fetch(base + route);
    assert.equal(res.status, 200, route);
    assert.match(res.headers.get("content-type"), /text\/html/);
    assert.match(await res.text(), /src="\.\/app\.js\?v=20261019-clerk-native"/);
  }
  for (const [asset, mime] of [["/app.js", "text/javascript"], ["/app.css", "text/css"]]) {
    const res = await fetch(base + asset);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), new RegExp(mime));
    assert.ok((await res.text()).length > 100);
    const head = await fetch(base + asset, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  }
  const api = await fetch(base + "/api");
  assert.equal((await api.json()).service, "portal");
  const health = await fetch(base + "/api/health");
  assert.equal((await health.json()).service, "portal");
  for (const route of ["/signin.html", "/subscribe.html", "/portal/server.mjs", "/app.js.map", "/game", "/api/no-such-route"]) {
    const res = await fetch(base + route);
    assert.equal(res.status, 404, route);
    assert.doesNotMatch(res.headers.get("content-type") || "", /text\/html/);
  }
});
