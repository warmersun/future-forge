import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clerkFrontendApiHost,
  accountPortalHost,
  accountPortalSignInUrl,
  accountPortalUserUrl,
  openAccountPortalTab,
  isCloudApiPath,
  accountChipLabel,
  formatClerkLoginLine,
  setCloudProfileCache,
  getCloudProfileCache,
} from "./auth.js";

describe("clerkFrontendApiHost", () => {
  it("decodes the FAPI host from a publishable key", () => {
    const host = "foo-12.clerk.accounts.dev";
    const pk = `pk_test_${Buffer.from(`${host}$`, "utf8").toString("base64")}`;
    assert.equal(clerkFrontendApiHost(pk), host);
  });

  it("rejects junk keys", () => {
    assert.throws(() => clerkFrontendApiHost("pk_test"), /Invalid/);
    assert.throws(() => clerkFrontendApiHost(""), /Invalid/);
  });
});

describe("account portal urls", () => {
  function pk(prefix, host) {
    return `${prefix}_${Buffer.from(`${host}$`, "utf8").toString("base64")}`;
  }

  it("maps a development Frontend API host to accounts.dev", () => {
    const key = pk("pk_test", "foo-12.clerk.accounts.dev");
    assert.equal(accountPortalHost(key), "foo-12.accounts.dev");
  });

  it("maps clerk.warmersun.com to the production Account Portal", () => {
    const key = pk("pk_live", "clerk.warmersun.com");
    assert.equal(accountPortalHost(key), "accounts.warmersun.com");
    const signIn = new URL(accountPortalSignInUrl(key, "https://ff.warmersun.com/?q=a"));
    assert.equal(signIn.origin + signIn.pathname, "https://accounts.warmersun.com/sign-in");
    assert.equal(signIn.searchParams.get("redirect_url"), "https://ff.warmersun.com/?q=a");
    assert.equal(accountPortalUserUrl(key), "https://accounts.warmersun.com/user");
  });

  it("opens Manage in a new tab and leaves this tab when the popup opens", () => {
    let assigned = "";
    const win = { opener: {} };
    openAccountPortalTab("https://accounts.warmersun.com/user", {
      open: (url, target) => {
        assert.equal(url, "https://accounts.warmersun.com/user");
        assert.equal(target, "_blank");
        return win;
      },
      assign: (url) => {
        assigned = url;
      },
    });
    assert.equal(win.opener, null);
    assert.equal(assigned, "");
  });

  it("follows Manage in this tab only when the popup is blocked", () => {
    let assigned = "";
    openAccountPortalTab("https://accounts.warmersun.com/user", {
      open: () => null,
      assign: (url) => {
        assigned = url;
      },
    });
    assert.equal(assigned, "https://accounts.warmersun.com/user");
  });
});

describe("isCloudApiPath", () => {
  it("routes Cloud save/health/board/device to portal", () => {
    assert.equal(isCloudApiPath("/api/me"), true);
    assert.equal(isCloudApiPath("/api/me/runs?kind=lesson"), true);
    assert.equal(isCloudApiPath("/api/daily"), false);
    assert.equal(isCloudApiPath("/api/board"), true);
    assert.equal(isCloudApiPath("/api/board/lesson-1"), true);
    assert.equal(isCloudApiPath("/api/board/lesson-1/still/user_abc"), true);
    assert.equal(isCloudApiPath("/api/me/quests/lesson-1/score"), true);
    assert.equal(isCloudApiPath("/api/health"), true);
    assert.equal(isCloudApiPath("/api/device/start"), true);
    assert.equal(isCloudApiPath("/api/device/status?code=abc"), true);
    assert.equal(isCloudApiPath("/api/co-invent"), false);
    assert.equal(isCloudApiPath("/api/co-invent-voice/session"), false);
    assert.equal(isCloudApiPath("/api/quests"), false);
    assert.equal(isCloudApiPath("/api/rooms"), false);
  });
});

describe("accountChipLabel", () => {
  it("prefers display name, then username, never email", () => {
    assert.equal(accountChipLabel({ displayName: "Ada", username: "ada" }), "Ada");
    assert.equal(accountChipLabel({ displayName: "", username: "ada_lovelace" }), "ada_lovelace");
    assert.equal(accountChipLabel({ displayName: "me@x.com", username: "ada" }), "ada");
    assert.equal(accountChipLabel({ displayName: "", username: "me@x.com" }), "Account");
    assert.equal(accountChipLabel(null), "Account");
    assert.equal(
      accountChipLabel({
        displayName: "Ada",
        login: { email: "you@example.com", providers: ["Google"] },
      }),
      "Ada"
    );
  });
});

describe("formatClerkLoginLine", () => {
  it("paints email and providers, or email only", () => {
    assert.equal(
      formatClerkLoginLine({ email: "you@example.com", providers: ["Google"] }),
      "Signed in as you@example.com · Google"
    );
    assert.equal(
      formatClerkLoginLine({ email: "you@example.com", providers: [] }),
      "Signed in as you@example.com"
    );
    assert.equal(formatClerkLoginLine(null), "");
  });
});

describe("setCloudProfileCache", () => {
  it("does not keep login or email for the title chip", () => {
    setCloudProfileCache({
      displayName: "Ada",
      username: "ada",
      login: { email: "you@example.com", providers: ["Google"] },
      email: "you@example.com",
    });
    const cached = getCloudProfileCache();
    assert.equal("login" in cached, false);
    assert.equal("email" in cached, false);
    assert.equal(accountChipLabel(), "Ada");
    setCloudProfileCache(null);
  });
});

let authInstance = 0;
const pendingKey = "ff-pending-device";
const jwtKey = "ff-clerk-jwt";
const portal = "https://portal.example.test";
const deviceCode = "offline-device-code";
const deviceSignIn = `${portal}/signin?device=${deviceCode}`;
const deviceToken = "offline-device-session-token";
const flushBrowserTasks = () => new Promise((resolve) => setImmediate(resolve));
const freshAuth = () => import(`./auth.js?device-flow-test=${++authInstance}`);

function storageFor(values) {
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

// Mock only browser/fetch boundaries: initialize the real module, then use its
// bound click handler or normal public API. No credentials or network calls.
async function authBrowser(t, opts = {}) {
  const values = new Map(opts.stored || []);
  const requests = [];
  const opened = [];
  const assigned = [];
  const scripts = [];
  const timers = [];
  const warnings = [];
  const unexpected = [];
  const bodyClasses = new Set();
  const chips = new Map();
  for (const id of ["signin", "who", "manage", "signout"]) {
    chips.set(`#ff-account-${id}`, {
      dataset: {}, hidden: false, textContent: "", handlers: {},
      addEventListener(type, handler) { this.handlers[type] = handler; },
    });
  }
  const mount = {
    hidden: true,
    querySelector: (selector) => chips.get(selector) || null,
    getBoundingClientRect: () => ({ width: 100 }),
  };
  const location = {
    href: opts.href || "http://localhost:8765/?q=shared-quest&mode=learn#brief",
    get hostname() { return new URL(this.href).hostname; },
    assign(url) { assigned.push(url); },
  };
  const popup = {
    opener: {}, closed: false, navigations: [], copiedStorage: null,
    location: { replace(url) { popup.navigations.push(url); } },
    close() { this.closed = true; },
  };
  const statusResponses = [...(opts.statusResponses || [{ pending: false, token: deviceToken }])];
  const key = `pk_live_${Buffer.from("clerk.warmersun.com$").toString("base64")}`;
  const globals = {
    location,
    sessionStorage: storageFor(values),
    document: {
      body: { classList: {
        add: (name) => bodyClasses.add(name),
        toggle: (name, enabled) => enabled ? bodyClasses.add(name) : bodyClasses.delete(name),
      } },
      documentElement: { style: { setProperty() {}, removeProperty() {} } },
      getElementById: (id) => id === "ff-account" ? mount : null,
      createElement: () => ({ setAttribute() {} }),
      head: { appendChild(script) {
        scripts.push(script);
        queueMicrotask(() => opts.scriptFailure ? script.onerror() : script.onload());
      } },
    },
    window: {
      Clerk: { load: async () => {}, addListener() {}, session: null },
      addEventListener() {},
      open(url, target, features) {
        opened.push({ url, target, features });
        popup.copiedStorage = new Map(values);
        return opts.blocked ? null : popup;
      },
    },
    setTimeout(callback, ms) { timers.push({ callback, ms }); },
    async fetch(url, init = {}) {
      requests.push({ url, init });
      const response = (body, status = 200) => ({
        ok: status >= 200 && status < 300, status, json: async () => body,
      });
      if (url === "/api/health") return response({ portal: { origin: portal } });
      if (url === `${portal}/api/health`) return response({
        clerk: { enabled: true, publishableKey: key },
        gameDeviceOrigins: opts.gameDeviceOrigins,
      });
      if (url === `${portal}/api/device/start`) {
        assert.equal(init.method, "POST");
        if (opts.startError) throw new Error(opts.startError);
        if (opts.startResponse) return response(opts.startResponse, opts.startStatus || 200);
        return response({ code: deviceCode, signInUrl: opts.signInUrl || deviceSignIn });
      }
      if (url === `${portal}/api/device/status?code=${deviceCode}`) {
        if (opts.statusError) throw new Error(opts.statusError);
        const next = statusResponses.shift();
        if (next) return response(next, next.error ? 404 : 200);
      }
      if (url === `${portal}/api/me/profile`) {
        assert.equal(init.headers.Authorization, `Bearer ${deviceToken}`);
        return response({ profile: { displayName: "Ada" } });
      }
      unexpected.push(url);
      throw new Error(`Unexpected offline request: ${url}`);
    },
  };
  for (const [name, value] of Object.entries(globals)) {
    const before = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    t.after(() => {
      if (before) Object.defineProperty(globalThis, name, before);
      else delete globalThis[name];
    });
  }
  t.mock.method(console, "warn", (...args) => warnings.push(args));
  t.after(() => assert.deepEqual(unexpected, [], "all fetches must be offline fixtures"));
  const auth = await freshAuth();
  await auth.initAuth();
  await auth.whenAuthReady();
  assert.equal(auth.isClerkReady(), true);
  return {
    auth, values, requests, opened, assigned, scripts, timers, warnings,
    popup, bodyClasses, chips, location,
    async tick(ms = 1000) {
      const timer = timers.shift();
      assert.ok(timer, "a poll timer must have been scheduled");
      assert.equal(timer.ms, ms);
      timer.callback();
      await flushBrowserTasks();
    },
    statusCalls: () => requests.filter(({ url }) => url.includes("/api/device/status?")),
  };
}

describe("client device handoff (offline browser behavior)", () => {
  it("reserves a fresh popup synchronously and opens the portal directly without a game return", async (t) => {
    const browser = await authBrowser(t, {
      stored: [[pendingKey, JSON.stringify({ code: "old-code", at: Date.now() })]],
      signInUrl: `${deviceSignIn}&return=${encodeURIComponent("http://localhost:8765/?q=other")}`,
    });
    const { auth, popup, opened, values, requests } = browser;
    const initialRequests = requests.length;
    browser.chips.get("#ff-account-signin").handlers.click();
    assert.deepEqual(opened, [{ url: "about:blank", target: "_blank", features: "width=480,height=720" }]);
    assert.equal(requests.length, initialRequests, "reserve before even the first fetch/await");
    assert.equal(popup.opener, null);
    assert.equal(popup.copiedStorage.has(pendingKey), false, "never clone an old resumable code");
    await flushBrowserTasks();
    assert.deepEqual(popup.navigations, [deviceSignIn]);
    assert.deepEqual(browser.assigned, []);
    assert.equal(values.has(pendingKey), false, "a popup flow is not a reload-resumable flow");
    assert.equal(browser.scripts.length, 0, "local play never loads Clerk");
    assert.equal(await auth.resumePendingDeviceHandshake(), false);
    await auth.openCloudSignIn();
    assert.equal(opened.length, 1, "a second click cannot start a competing handshake");
    await browser.tick();
    assert.equal(auth.isClerkSignedIn(), true);
    assert.equal(popup.closed, true);
  });

  it("only the original game polls a one-time code, then updates JWT, session listeners and the account chip", async (t) => {
    const browser = await authBrowser(t, { statusResponses: [
      { pending: true }, { pending: false, token: deviceToken },
    ] });
    const { auth, values, popup, chips, bodyClasses } = browser;
    const sessions = [];
    auth.onClerkSession(() => sessions.push(auth.isClerkSignedIn()));
    const task = auth.openCloudSignIn();
    await flushBrowserTasks();
    // Model a second game loading from the popup's copied storage while the
    // original poll is still waiting. It must not race for the one-time code.
    const originalStorage = globalThis.sessionStorage;
    globalThis.sessionStorage = storageFor(popup.copiedStorage);
    const popupGame = await freshAuth();
    await popupGame.initAuth();
    assert.equal(await popupGame.resumePendingDeviceHandshake(), false);
    assert.equal(popupGame.isClerkSignedIn(), false);
    assert.equal(browser.statusCalls().length, 0);
    globalThis.sessionStorage = originalStorage;
    await browser.tick();
    assert.equal(auth.isClerkSignedIn(), false);
    assert.equal(popup.closed, false);
    await browser.tick();
    await task;
    assert.equal(browser.statusCalls().length, 2);
    assert.equal(await auth.getClerkToken(), deviceToken);
    assert.equal(values.get(jwtKey), deviceToken);
    assert.equal(values.has(pendingKey), false);
    assert.equal(popup.closed, true);
    assert.deepEqual(sessions, [false, true]);
    assert.equal(bodyClasses.has("ff-signed-in"), true);
    assert.equal(chips.get("#ff-account-signin").hidden, true);
    assert.equal(chips.get("#ff-account-who").hidden, false);
    assert.equal(chips.get("#ff-account-who").textContent, "Ada");
  });

  it("falls back when popup-blocked, preserves the deep-link, and resumes on reload", async (t) => {
    const browser = await authBrowser(t, { blocked: true, statusResponses: [
      { pending: true }, { pending: false, token: deviceToken },
    ] });
    await browser.auth.openCloudSignIn();
    const signIn = new URL(browser.assigned[0]);
    assert.equal(signIn.origin + signIn.pathname, `${portal}/signin`);
    assert.equal(signIn.searchParams.get("device"), deviceCode);
    assert.equal(signIn.searchParams.get("return"), browser.location.href);
    assert.equal(JSON.parse(browser.values.get(pendingKey)).code, deviceCode);
    assert.equal(browser.statusCalls().length, 0, "no poll in the departing game");
    const reloaded = await freshAuth();
    await reloaded.initAuth();
    const resumed = reloaded.resumePendingDeviceHandshake();
    await flushBrowserTasks();
    await browser.tick(400);
    assert.equal(await resumed, true);
    assert.equal(reloaded.isClerkSignedIn(), true);
    assert.equal(browser.values.get(jwtKey), deviceToken);
    assert.equal(browser.values.has(pendingKey), false);
    assert.equal(browser.statusCalls().length, 2);
  });

  it("uses explicit sameTab without opening a popup and preserves an explicit requested deep-link", async (t) => {
    const browser = await authBrowser(t);
    const returnHref = "https://device.example.ts.net:8765/?q=shared&mode=learn#start";
    await browser.auth.openCloudSignIn({ sameTab: true, returnHref });
    assert.deepEqual(browser.opened, []);
    assert.equal(new URL(browser.assigned[0]).searchParams.get("return"), returnHref);
    assert.equal(JSON.parse(browser.values.get(pendingKey)).code, deviceCode);
    assert.equal(browser.statusCalls().length, 0);
  });

  it("accepts an exact configured LAN return origin from portal health", async (t) => {
    const href = "http://192.168.1.42:8765/?q=lan-quest&mode=learn#brief";
    const browser = await authBrowser(t, { href, gameDeviceOrigins: ["http://192.168.1.42:8765"] });
    await browser.auth.openCloudSignIn({ sameTab: true });
    assert.equal(new URL(browser.assigned[0]).searchParams.get("return"), href);
  });

  for (const [name, href, gameDeviceOrigins] of [
    ["an unconfigured LAN host", "http://192.168.1.43:8765/?q=x", ["http://192.168.1.42:8765"]],
    ["another port on a configured LAN host", "http://192.168.1.42:9999/?q=x", ["http://192.168.1.42:8765"]],
  ]) {
    it(`attaches ${name} to same-tab handoff by default`, async (t) => {
      const browser = await authBrowser(t, { gameDeviceOrigins });
      await browser.auth.openCloudSignIn({ sameTab: true, returnHref: href });
      assert.equal(new URL(browser.assigned[0]).searchParams.get("return"), href);
    });
  }

  for (const [name, href, gameDeviceOrigins] of [
    ["credentials in a configured LAN return", "http://user@192.168.1.42:8765/?q=x", ["http://192.168.1.42:8765"]],
    ["an external return", "https://untrusted.example/?q=x", []],
    ["a public IP return", "http://8.8.8.8:8765/?q=x", []],
  ]) {
    it(`does not attach ${name} to same-tab handoff`, async (t) => {
      const browser = await authBrowser(t, { gameDeviceOrigins });
      await browser.auth.openCloudSignIn({ sameTab: true, returnHref: href });
      assert.equal(new URL(browser.assigned[0]).searchParams.has("return"), false);
    });
  }

  it("keeps hosted Clerk sign-in on Account Portal without a device flow", async (t) => {
    const href = "https://ff.warmersun.com/?q=hosted-quest&mode=learn";
    const browser = await authBrowser(t, { href });
    await browser.auth.openCloudSignIn();
    const signIn = new URL(browser.assigned[0]);
    assert.equal(signIn.origin + signIn.pathname, "https://accounts.warmersun.com/sign-in");
    assert.equal(signIn.searchParams.get("redirect_url"), href);
    assert.equal(browser.scripts.length, 1);
    assert.deepEqual(browser.opened, []);
    assert.equal(browser.requests.some(({ url }) => url.includes("/api/device/")), false);
  });

  it("does not fall back to local device auth if hosted Clerk fails to load", async (t) => {
    const browser = await authBrowser(t, {
      href: "https://ff.warmersun.com/?q=hosted-quest", scriptFailure: true,
    });
    await browser.auth.openCloudSignIn();
    assert.deepEqual(browser.opened, []);
    assert.deepEqual(browser.assigned, []);
    assert.equal(browser.requests.some(({ url }) => url.includes("/api/device/")), false);
  });

  for (const [name, options] of [
    ["start rejection", { startResponse: { error: "device_start_failed" }, startStatus: 503 }],
    ["fetch failure", { startError: "offline fixture network failure" }],
    ["invalid callback URL", { signInUrl: "not a URL" }],
  ]) {
    it(`closes the reserved popup and allows retry after ${name}`, async (t) => {
      const browser = await authBrowser(t, options);
      await browser.auth.openCloudSignIn();
      assert.equal(browser.popup.closed, true);
      assert.equal(browser.values.has(pendingKey), false);
      assert.equal(browser.auth.isClerkSignedIn(), false);
      assert.equal(browser.warnings.length, 1);
      await browser.auth.openCloudSignIn();
      assert.equal(browser.opened.length, 2, "failure releases the active-flow guard");
    });
  }

  it("cleans up an unknown one-time code without signing in", async (t) => {
    const browser = await authBrowser(t, { statusResponses: [{ error: "unknown" }] });
    const task = browser.auth.openCloudSignIn();
    await flushBrowserTasks();
    await browser.tick();
    await task;
    assert.equal(browser.popup.closed, true);
    assert.equal(browser.values.has(pendingKey), false);
    assert.equal(browser.auth.isClerkSignedIn(), false);
  });

  it("closes the popup and releases the flow after a polling fetch failure", async (t) => {
    const browser = await authBrowser(t, { statusError: "offline polling failure" });
    const task = browser.auth.openCloudSignIn();
    await flushBrowserTasks();
    await browser.tick();
    await task;
    assert.equal(browser.popup.closed, true);
    assert.equal(browser.values.has(pendingKey), false);
    assert.equal(browser.auth.isClerkSignedIn(), false);
    assert.equal(browser.warnings.length, 1);
  });

  it("retries non-terminal polling errors rather than discarding a valid handoff", async (t) => {
    const browser = await authBrowser(t, { statusResponses: [
      { error: "temporarily_unavailable" }, { pending: false, token: deviceToken },
    ] });
    const task = browser.auth.openCloudSignIn();
    await flushBrowserTasks();
    await browser.tick();
    assert.equal(browser.popup.closed, false);
    await browser.tick();
    await task;
    assert.equal(browser.auth.isClerkSignedIn(), true);
    assert.equal(browser.popup.closed, true);
  });

  it("closes an expired popup flow without leaving a pending code or signing in", async (t) => {
    const browser = await authBrowser(t, { statusResponses: [{ pending: true }] });
    const task = browser.auth.openCloudSignIn();
    await flushBrowserTasks();
    const afterDeadline = Date.now() + 6 * 60 * 1000;
    t.mock.method(Date, "now", () => afterDeadline);
    await browser.tick();
    await task;
    assert.equal(browser.popup.closed, true);
    assert.equal(browser.values.has(pendingKey), false);
    assert.equal(browser.auth.isClerkSignedIn(), false);
    assert.equal(browser.timers.length, 0);
  });

  it("removes an unknown pending code after a same-tab return", async (t) => {
    const browser = await authBrowser(t, {
      stored: [[pendingKey, JSON.stringify({ code: deviceCode, at: Date.now() })]],
      statusResponses: [{ error: "unknown" }],
    });
    assert.equal(await browser.auth.resumePendingDeviceHandshake(), false);
    assert.equal(browser.values.has(pendingKey), false);
  });

  it("expires old pending handshakes without polling", async (t) => {
    const browser = await authBrowser(t, {
      stored: [[pendingKey, JSON.stringify({ code: deviceCode, at: 1 })]],
    });
    assert.equal(await browser.auth.resumePendingDeviceHandshake(), false);
    assert.equal(browser.values.has(pendingKey), false);
    assert.equal(browser.statusCalls().length, 0);
  });
});
