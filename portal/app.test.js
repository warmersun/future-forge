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
import { isAllowedGameReturnUrl as gameReturnAllowed } from "../js/cloud/portal-origin.js";

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
  const signInMount = { childElementCount: 0 };
  const signedIn = { hidden: true };
  const account = { textContent: "" };
  const signOut = { onclick: null };
  const app = { innerHTML: "", querySelector(sel) { return /data-route=/.test(app.innerHTML) ? {} : null; } };
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
    body: { classList: { added: [], add(name) { this.added.push(name); } } },
    createElement() { return { setAttribute() {} }; },
    getElementById(id) { return { app, status, "clerk-mount": mount, "signin-mount": signInMount,
      "signed-in": signedIn, account, "sign-out": signOut }[id]; },
    querySelectorAll() { return nav; },
    addEventListener(name, fn) { listeners[name] = fn; },
  };
  return { doc, win, app, status, mount, signInMount, signedIn, account, signOut, nav };
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

test("standalone SPA and game share the default-on private-LAN return policy", () => {
  const lan = "http://192.168.1.140:8765";
  const cases = [
    [`${lan}/?quest=lesson#play`, [], true], [`${lan}/?quest=lesson#play`, [lan], true],
    ["http://10.0.0.1:9000/", [], true],
    ["http://172.16.0.1/", ["http://172.16.0.1"], true],
    ["http://192.168.1.141:8765/", [lan], true], ["http://192.168.1.140:8766/", [lan], true],
    ["http://public.example/", ["http://public.example"], false],
    ["http://warmersun.com/", ["http://warmersun.com"], false],
    ["http://169.254.0.1/", ["http://169.254.0.1"], false],
    ["http://172.32.0.1/", ["http://172.32.0.1"], false],
    ["https://custom.example/game", ["https://custom.example"], true],
    [`${lan}/`, [`${lan}/path`, "javascript:alert(1)", null], true],
    ...["http://user:pass@192.168.1.140:8765/", "http://@192.168.1.140:8765/",
      "http:/192.168.1.140:8765/", "http://192.168.1.140:8765\\evil", "http://192.168.1.140:8765/%zz",
      "http://192.168.1.140:8765/\n", "http://0xc0a8018c:8765/", "ftp://192.168.1.140:8765/",
      "//192.168.1.140:8765/", "javascript:alert(1)"].map((href) => [href, [lan], false]),
  ];
  for (const [href, extras, expected] of cases) {
    assert.equal(isAllowedGameReturnUrl(href, extras), expected, href);
    assert.equal(gameReturnAllowed(href, extras), expected, href);
  }
});

test("LAN navigation waits for health configuration and preserves device completion", async (t) => {
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  globalThis.sessionStorage = { getItem() { return "1"; }, removeItem() {}, setItem() {} };
  const lan = "http://192.168.1.140:8765";
  const ret = `${lan}/?quest=lesson-1#play`;
  for (const device of ["", "XYZ"]) {
    const ui = fakeUi(`https://portal.example/signin?${device ? `device=${device}&` : ""}return=${encodeURIComponent(ret)}`);
    const calls = [];
    let resolveHealth;
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url === "/api/health") return new Promise((resolve) => { resolveHealth = resolve; });
      return { ok: true, json: async () => ({ ok: true }) };
    };
    ui.win.Clerk = { load: async () => {}, session: { getToken: async () => "token-123" } };
    startPortal(ui);
    await tick();
    assert.equal(ui.win.location.replaced, undefined);
    resolveHealth({ ok: true, json: async () => ({ apiOrigin: "https://function.example", gameDeviceOrigins: [lan],
      clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }) });
    await tick(); await tick();
    assert.equal(ui.win.location.replaced, ret);
    assert.equal(calls.length, device ? 2 : 1);
    if (device) {
      assert.equal(calls[1].url, "https://function.example/api/device/complete");
      assert.deepEqual(JSON.parse(calls[1].options.body), { code: device });
      assert.equal(calls[1].options.headers.Authorization, "Bearer token-123");
    }
  }
});

test("SPA accepts private-LAN returns by default and rejects malformed health allowlists", async (t) => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  const lan = "http://192.168.1.140:8765";
  const cases = [
    // [gameDeviceOrigins, ret, allowed]
    [undefined, `${lan}/`, true],
    [lan, `${lan}/`, true],
    [{ origin: lan }, `${lan}/`, true],
    [["http://192.168.1.141:8765"], `${lan}/`, true],
    [[`${lan}/path`], `${lan}/`, true],
    [["http://public.example"], "http://public.example/", false],
    [[lan], "http://user@192.168.1.140:8765/", false],
    [[lan], "http:/192.168.1.140:8765/", false],
    [[lan], "javascript:alert(1)", false],
  ];
  for (const [gameDeviceOrigins, ret, allowed] of cases) {
    globalThis.fetch = async (url) => ({ ok: true, json: async () => url === "/api/health"
      ? { gameDeviceOrigins, clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }
      : { ok: true, signedIn: true, subscription: { entitled: false } } });
    const ui = fakeUi(`https://portal.example/signin?return=${encodeURIComponent(ret)}`);
    ui.win.Clerk = { load: async () => {}, session: { getToken: async () => "token-123" } };
    startPortal(ui);
    await tick(); await tick();
    assert.equal(ui.win.location.replaced, allowed ? ret : undefined, ret);
    assert.equal(ui.signedIn.hidden, allowed, ret);
  }
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

test("published portal bootstraps pricing directly from its configured API origin", async (t) => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  const ui = fakeUi("https://warmersun.com/portal/subscribe");
  ui.doc.querySelector = () => ({ getAttribute: () => "https://cloud.warmersun.com" });
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    assert.equal(url, "https://cloud.warmersun.com/api/health");
    return { ok: true, json: async () => ({ apiOrigin: "https://cloud.warmersun.com",
      clerk: { enabled: true, publishableKey: key("clerk.warmersun.com") } }) };
  };
  let pricingOptions;
  ui.win.Clerk = { load: async () => {}, mountPricingTable(_mount, options) { pricingOptions = options; } };
  startPortal({ ...ui, base: "/portal" });
  await tick(); await tick();
  assert.deepEqual(calls, ["https://cloud.warmersun.com/api/health"]);
  assert.equal(pricingOptions.for, "user");
  assert.equal(ui.status.textContent, "");
});

test("portal bootstrap origin rejects non-origin and insecure configuration before fetching", async (t) => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  globalThis.fetch = async () => { assert.fail("invalid bootstrap configuration must not fetch"); };
  for (const origin of ["http://cloud.warmersun.com", "https://cloud.warmersun.com/path",
    "https://user@cloud.warmersun.com", "https://cloud.warmersun.com?redirect=evil", "javascript:alert(1)"]) {
    const ui = fakeUi("https://warmersun.com/portal/subscribe");
    ui.doc.querySelector = () => ({ getAttribute: () => origin });
    startPortal({ ...ui, base: "/portal" });
    await tick();
    assert.match(ui.status.textContent, /Invalid portal bootstrap origin/);
  }
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

test("Clerk's own hash re-entry does not remount the form a second time", async (t) => {
  // Clerk's hash routing pushes #/sso-callback and fires popstate. render() must
  // leave the mounted form alone; remounting it fires the SSO callback again and
  // the user gets a second sign-in prompt immediately after the first.
  const ui = fakeUi("https://portal.example/signin?device=ABC");
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem() { return "1"; }, removeItem() {}, setItem() {} };
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url === "/api/health"
    ? { clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }
    : { ok: true } });
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  let mounts = 0;
  ui.signInMount.childElementCount = 1;
  ui.win.Clerk = { load: async () => {}, session: { getToken: async () => "token-123" },
    mountSignIn() { mounts++; } };
  const rerender = startPortal(ui);
  await tick(); await tick();
  rerender();
  rerender();
  await tick(); await tick();
  assert.equal(mounts, 0);
  assert.equal(ui.app.innerHTML.match(/data-route="\/signin"/g).length, 1);
});

test("a plain portal visit shows Clerk's form instead of a device-code dead end", async (t) => {
  const ui = fakeUi("https://portal.example/signin");
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem() { return null; }, removeItem() {}, setItem() {} };
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url === "/api/health"
    ? { clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }
    : { ok: true } });
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  let signInOptions;
  ui.win.Clerk = { load: async () => {}, session: null, unmountSignIn() {},
    mountSignIn(mount, opts) { assert.equal(mount, ui.signInMount); signInOptions = opts; } };
  startPortal(ui);
  await tick(); await tick();
  assert.equal(signInOptions.forceRedirectUrl, "https://portal.example/signin");
  assert.doesNotMatch(ui.status.textContent, /device code/);
  assert.match(ui.app.innerHTML, /<h1>Sign in<\/h1>/);
  assert.deepEqual(ui.doc.body.classList.added, []);
});

test("a mounted return-only form survives Clerk hash popstate without remounting", async (t) => {
  const ui = fakeUi("https://warmersun.com/portal/signin?return=https%3A%2F%2Fcloud.warmersun.com%2Fcard%2F123%3Fcollect%3D1");
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  globalThis.sessionStorage = { getItem() { return null; }, removeItem() {}, setItem() {} };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") },
  }) });
  let mounts = 0;
  let unmounts = 0;
  ui.win.Clerk = { load: async () => {}, session: null,
    mountSignIn(mount) { mounts++; mount.childElementCount = 1; },
    unmountSignIn() { unmounts++; } };
  startPortal({ ...ui, base: "/portal" });
  await tick(); await tick();
  assert.equal(mounts, 1);
  const html = ui.app.innerHTML;
  ui.win.Clerk.session = { getToken: async () => { throw new Error("must not restart the callback"); } };
  ui.win.location.href += "#/sso-callback";
  ui.win.listeners.popstate();
  ui.win.listeners.popstate();
  await tick(); await tick();
  assert.equal(mounts, 1);
  assert.equal(unmounts, 0);
  assert.equal(ui.app.innerHTML, html);
  assert.equal(ui.win.location.replaced, undefined);
});

test("a device-code handoff drops the portal chrome", async (t) => {
  const ui = fakeUi("https://portal.example/signin?device=ABC");
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem() { return null; }, removeItem() {}, setItem() {} };
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url === "/api/health"
    ? { clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }
    : { ok: true } });
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  let signInOptions;
  ui.win.Clerk = { load: async () => {}, session: null, unmountSignIn() {},
    mountSignIn(_mount, opts) { signInOptions = opts; } };
  startPortal(ui);
  await tick(); await tick();
  assert.deepEqual(ui.doc.body.classList.added, ["device-flow"]);
  assert.doesNotMatch(ui.app.innerHTML, /<h1>Sign in<\/h1>/);
  assert.doesNotMatch(ui.app.innerHTML, /Future Forge account/);
  assert.equal(signInOptions.forceRedirectUrl, "https://portal.example/signin?device=ABC");
});

test("an existing session on a plain visit shows the account instead of signing out", async (t) => {
  const ui = fakeUi("https://portal.example/signin");
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  let bounced = false;
  globalThis.sessionStorage = { getItem() { return bounced ? "1" : null; },
    setItem() { bounced = true; }, removeItem() { bounced = false; } };
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => url === "/api/health"
      ? { apiOrigin: "https://function.example", clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }
      : { ok: true, signedIn: true, subscription: { entitled: true, planSlug: "cloud", status: "active" } } };
  };
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  let signedOut = 0;
  ui.win.Clerk = { load: async () => {},
    user: { fullName: "Ada Inventor" },
    session: { getToken: async () => "token-123" },
    signOut: async () => { signedOut++; },
    mountSignIn() { throw new Error("must not mount the form"); } };
  startPortal(ui);
  await tick(); await tick();
  assert.equal(signedOut, 0);
  assert.equal(ui.signedIn.hidden, false);
  assert.equal(ui.signInMount.hidden, true);
  assert.match(ui.account.textContent, /Ada Inventor/);
  assert.match(ui.account.textContent, /cloud/);
  assert.ok(calls.some((u) => u === "https://function.example/api/me"));
  await ui.signOut.onclick();
  assert.equal(signedOut, 1);
  assert.equal(ui.win.location.replaced, "https://portal.example/signin");
});

test("return-only sign-in resumes the allowed destination without a device handshake", async (t) => {
  const previous = globalThis.fetch;
  const storage = globalThis.sessionStorage;
  t.after(() => { globalThis.fetch = previous; globalThis.sessionStorage = storage; });
  globalThis.sessionStorage = { getItem() { return null; }, removeItem() {}, setItem() {} };
  for (const freshSession of [false, true]) {
    const ret = "https://cloud.warmersun.com/card/123?collect=1";
    const ui = fakeUi(`https://warmersun.com/portal/signin?return=${encodeURIComponent(ret)}`);
    const calls = [];
    globalThis.fetch = async (url) => {
      calls.push(url);
      return { ok: true, json: async () => ({ apiOrigin: "https://function.example",
        clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }) };
    };
    let signInOptions;
    ui.win.Clerk = { load: async () => {},
      session: freshSession ? null : { getToken: async () => "token-123" },
      mountSignIn(_mount, opts) { signInOptions = opts; },
      signOut() { throw new Error("return-only must not clear the browser session"); } };
    const rerender = startPortal({ ...ui, base: "/portal" });
    await tick(); await tick();
    if (freshSession) {
      assert.equal(signInOptions.forceRedirectUrl, ui.win.location.href);
      ui.win.Clerk.session = { getToken: async () => "token-123" };
      rerender();
      await tick(); await tick();
    }
    assert.equal(ui.win.location.replaced, ret);
    assert.equal(ui.signedIn.hidden, true);
    assert.ok(calls.every((url) => url === "/portal/api/health"));
    assert.equal(ui.win.closed, undefined);
  }
});

test("unsafe return-only URLs keep the signed-in account visible", async (t) => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url === "/api/health"
    ? { clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }
    : { ok: true, signedIn: true, subscription: { entitled: false } } });
  for (const ret of ["https://evil.example/", "https://warmersun.com.evil.example/", "javascript:alert(1)", "https://user@cloud.warmersun.com/"]) {
    const ui = fakeUi(`https://portal.example/signin?return=${encodeURIComponent(ret)}`);
    ui.win.Clerk = { load: async () => {}, session: { getToken: async () => "token-123" } };
    startPortal(ui);
    await tick(); await tick();
    assert.equal(ui.win.location.replaced, undefined, ret);
    assert.equal(ui.signedIn.hidden, false, ret);
    assert.equal(ui.win.closed, undefined, ret);
  }
});

test("account subscription is unavailable on failed or malformed /api/me responses", async (t) => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  const cases = [
    ["401", async () => ({ ok: false, status: 401, json: async () => ({ ok: false }) })],
    ["503", async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) })],
    ["network", async () => { throw new Error("offline"); }],
    ["invalid JSON", async () => ({ ok: true, json: async () => { throw new SyntaxError("bad JSON"); } })],
    ...[null, {}, { ok: false }, { ok: true, signedIn: false },
      { ok: true, signedIn: false, subscription: { entitled: false } },
      { ok: true, signedIn: true }, { ok: true, signedIn: true, subscription: {} },
      { ok: true, signedIn: true, subscription: { entitled: "false" } },
      { ok: false, signedIn: true, subscription: { entitled: false } },
    ].map((body) => [JSON.stringify(body), async () => ({ ok: true, json: async () => body })]),
  ];
  for (const [name, response] of cases) {
    const ui = fakeUi("https://portal.example/signin");
    globalThis.fetch = async (url, options) => {
      if (url === "/api/health") return { ok: true, json: async () => ({
        apiOrigin: "https://function.example", clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") },
      }) };
      assert.equal(url, "https://function.example/api/me");
      assert.equal(options.headers.Authorization, "Bearer per-user-token");
      return response();
    };
    ui.win.Clerk = { load: async () => {}, user: { fullName: "Ada" },
      session: { getToken: async () => "per-user-token" } };
    startPortal(ui);
    await tick(); await tick();
    assert.equal(ui.signedIn.hidden, false, name);
    assert.match(ui.account.textContent, /Ada.*subscription.*unavailable/i, name);
    assert.doesNotMatch(ui.account.textContent, /no active subscription/i, name);
    assert.equal(typeof ui.signOut.onclick, "function", name);
  }
});

test("only a valid signed-in account response can assert no active subscription", async (t) => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url === "/api/health"
    ? { clerk: { enabled: true, publishableKey: key("abc.clerk.accounts.dev") } }
    : { ok: true, signedIn: true, subscription: { entitled: false, planSlug: null, status: null } } });
  const ui = fakeUi("https://portal.example/signin");
  ui.win.Clerk = { load: async () => {}, user: { fullName: "Ada" }, session: { getToken: async () => "token" } };
  startPortal(ui);
  await tick(); await tick();
  assert.equal(ui.account.textContent, "Ada — no active subscription");
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
    assert.match(await res.text(), /src="\.\/app\.js\?v=20261025-auth-repair"/);
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
