/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

// Portal-only SPA. Game UI and Cloud API requests remain on their own services.
const BOUNCE_KEY = "ff-account-portal-bounce";
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#ffb347", colorPrimaryForeground: "#1a1008",
    colorBackground: "#14121c", colorForeground: "#fff4e6",
    colorMuted: "#1c1824", colorMutedForeground: "#d9cbb8",
    colorNeutral: "#d9cbb8", colorInput: "#1c1824",
    colorInputForeground: "#fff4e6", colorBorder: "#3a3228",
    colorModalBackdrop: "rgba(11, 10, 20, 0.78)", borderRadius: "14px",
  },
};

export function clerkFrontendApiHost(publishableKey) {
  const parts = String(publishableKey || "").trim().split("_");
  if (parts.length < 3) throw new Error("Invalid Clerk publishable key");
  let host;
  try { host = atob(parts.slice(2).join("_")).replace(/\$$/, ""); }
  catch { throw new Error("Invalid Clerk publishable key"); }
  if (!/^[a-z0-9.-]+$/i.test(host) || host.startsWith(".") || host.endsWith(".")) {
    throw new Error("Invalid Clerk Frontend API host");
  }
  return host;
}

export function accountPortalHost(publishableKey) {
  const host = clerkFrontendApiHost(publishableKey);
  const dev = ".clerk.accounts.dev";
  if (host.endsWith(dev) && host.length > dev.length) return `${host.slice(0, -dev.length)}.accounts.dev`;
  if (host.startsWith("clerk.") && host.length > "clerk.".length) return `accounts.${host.slice("clerk.".length)}`;
  throw new Error("Cannot derive Account Portal host");
}

// Keep in sync with js/cloud/portal-origin.js. This SPA is published as a
// standalone app.js, without the game's module tree; parity tests cover both.
function gameHttpUrl(raw) {
  if (typeof raw !== "string" || /[\s\\\u0000-\u001f\u007f]/.test(raw) || /%(?![a-f\d]{2})/i.test(raw)) return null;
  const authority = /^https?:\/\/([^/?#]+)/i.exec(raw)?.[1];
  if (!authority || /[@%]/.test(authority)) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password || !url.hostname) return null;
    if (/^[\d.]+$/.test(url.hostname) && authority.split(":")[0] !== url.hostname) return null;
    return url;
  } catch { return null; }
}

/** RFC1918 IPv4 literal. A public page cannot claim one, so LAN needs no setup. */
function isPrivateIpv4(host) {
  const parts = String(host || "").split(".").map(Number);
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    && parts.join(".") === host
    && (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168));
}

function configuredGameOrigin(raw) {
  const u = gameHttpUrl(raw);
  if (!u || raw !== u.origin) return "";
  if (u.protocol === "https:" || ["localhost", "127.0.0.1"].includes(u.hostname)) return u.origin;
  return isPrivateIpv4(u.hostname) ? u.origin : "";
}

export function isAllowedGameReturnUrl(href, extras = []) {
  const u = gameHttpUrl(href);
  if (!u) return false;
  const host = u.hostname.toLowerCase();
  if (host === "127.0.0.1" || host === "localhost") return true;
  if (u.protocol === "https:" && (host === "warmersun.com" || host.endsWith(".warmersun.com") || host.endsWith(".ts.net"))) return true;
  // A self-hosted game on the local network is a first-class return target.
  if (u.protocol === "http:" && isPrivateIpv4(host)) return true;
  return Array.isArray(extras) && extras.map(configuredGameOrigin).filter(Boolean).includes(u.origin);
}

const scriptLoads = new Map();
function loadScript(doc, src, attrs = {}) {
  if (!scriptLoads.has(src)) {
    const promise = new Promise((resolve, reject) => {
      const script = doc.createElement("script");
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value);
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      doc.head.appendChild(script);
    });
    scriptLoads.set(src, promise);
    // A failed load should be retryable on the next visit.
    promise.catch(() => scriptLoads.delete(src));
  }
  return scriptLoads.get(src);
}

async function clerkConfig(base, doc) {
  // The published shell can bootstrap directly from the canonical API origin.
  // This avoids making Clerk initialization depend on a static-host proxy.
  const configuredOrigin = doc.querySelector?.('meta[name="ff-api-origin"]')?.getAttribute("content");
  let healthBase = base;
  if (configuredOrigin) {
    const url = new URL(configuredOrigin);
    if (url.origin !== configuredOrigin || url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Invalid portal bootstrap origin");
    }
    healthBase = url.origin;
  }
  const res = await fetch(`${healthBase}/api/health`);
  if (!res.ok) throw new Error("Health check failed");
  const health = await res.json();
  const pk = health?.clerk?.publishableKey;
  if (!health?.clerk?.enabled || !pk) return null;
  let apiOrigin = healthBase;
  if (health.apiOrigin) {
    const url = new URL(health.apiOrigin);
    if (url.origin !== health.apiOrigin || url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Invalid portal API origin");
    }
    apiOrigin = url.origin;
  }
  const gameDeviceOrigins = Array.isArray(health.gameDeviceOrigins)
    ? health.gameDeviceOrigins.map(configuredGameOrigin).filter(Boolean) : [];
  return { pk, host: clerkFrontendApiHost(pk), apiOrigin, gameDeviceOrigins };
}

function readBounced() {
  try { return sessionStorage.getItem(BOUNCE_KEY) === "1"; }
  catch { return false; }
}
function writeBounced(on) {
  try {
    if (on) sessionStorage.setItem(BOUNCE_KEY, "1");
    else sessionStorage.removeItem(BOUNCE_KEY);
  } catch { /* private mode */ }
}

async function completeDevice(code, token, base) {
  const res = await fetch(`${base}/api/device/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "Could not finish handshake");
}

const home = (base, signedIn = false) => `<section id="app-home" data-route="/"><p class="eyebrow">Future Forge · Warmer Sun Cloud</p>
  <h1>Invent with us. Run it your way.</h1>
  <p class="lead">${signedIn ? "You are signed in to Warmer Sun Cloud. The playable app runs separately from this account portal." : "Sign in to continue your Future Forge journey, or choose hosted access. The playable app runs separately from this account portal."}</p>
  <p class="links"><a class="button primary" data-link href="${base}/subscribe">Explore hosted access</a>
  ${signedIn ? `<a class="button" data-link href="${base}/signin">Account</a>` : `<a class="button" data-link href="${base}/signin">Sign in</a>`}</p></section>`;
// A device-code handoff comes straight from the app, so it gets Clerk's form
// with no portal chrome around it. A plain visit keeps the portal heading.
const signin = (deviceFlow) => `<section class="signin${deviceFlow ? " device" : ""}" data-route="/signin">${deviceFlow ? "" : '<p class="eyebrow">Future Forge account</p><h1>Sign in</h1>'}
  <p id="status" role="status">Loading Sign in…</p>
  <div id="signin-mount"></div>
  <div id="signed-in" hidden>
    <p id="account"></p>
    <p class="links"><button id="sign-out" class="button" type="button">Sign out</button></p>
  </div></section>`;
const subscribe = `<div class="split" data-route="/subscribe"><section class="promise">
  <p class="eyebrow">Future Forge Content</p><h1>Paid Quests &amp; Lessons.</h1>
  <p class="lead">Today all content only needs an account. Premium content is coming with a 3-day free trial ($48 USD/month or $480 USD/year).</p>
  <dl><dt>What is coming</dt><dd>Access to premium catalog quests and lessons for one person ($48 USD/month or $480 USD/year, with a 3-day free trial).
    Hosted AI usage is sold separately in the game as $20 USD top-ups for 15,000 points (1 point = $0.001 USD, sold at API price rounded up to cover hosting). There is no free trial of the hosted app.</dd>
    <dt>The promise</dt><dd>You lead. The computer stays with you while you try a real place and see what holds.
    The computer does not do it for you.</dd></dl>
  <p class="aside">The software is free under the GNU General Public License, version 3 or later.
    Commercial use and education use are allowed when you run it yourself.
    This page is a paid content subscription for one person. Lessons on the hosted service need a sign-in.</p>
  <p class="links"><a href="https://warmersun.com/future-forge/get-started/">Run your own copy</a></p></section>
  <section class="checkout" aria-label="Subscribe"><p id="status" role="status">Loading the plan…</p>
  <div id="clerk-mount"></div></section></div>`;

export function portalBaseFromModuleUrl(moduleUrl) {
  const url = new URL(moduleUrl);
  if (!/^https?:$/.test(url.protocol) || !url.pathname.endsWith("/app.js")) return "";
  return url.pathname.slice(0, -"/app.js".length);
}

export function startPortal({ doc = document, win = window, base = portalBaseFromModuleUrl(import.meta.url) } = {}) {
  const app = doc.getElementById("app");
  if (!app) throw new Error("Missing portal app mount");
  // A device-code handoff is a bare Clerk form: drop the site chrome.
  const deviceFlow = new URLSearchParams(win.location.search).has("device");
  if (deviceFlow) doc.body?.classList.add?.("device-flow");
  let generation = 0;
  let pricingMount = null;
  // null until Clerk mounts: showSignin() uses this to tell a fresh visit from
  // Clerk's own hash re-entry, which fires popstate and re-runs render().
  let signInMount = null;
  const active = (id) => generation === id;

  function dropSignInMount() {
    if (!signInMount) return;
    win.Clerk?.unmountSignIn?.(signInMount);
    signInMount = null;
  }

  async function showSignin(id) {
    const status = doc.getElementById("status");
    const params = new URLSearchParams(win.location.search);
    const device = params.get("device") || "";
    const returnTo = params.get("return") || "";
    try {
      const config = await clerkConfig(base, doc);
      if (!active(id)) return;
      if (!config) { status.textContent = "Sign in is off on this portal (Clerk keys missing)."; return; }
      const returnOk = Boolean(returnTo && isAllowedGameReturnUrl(returnTo, config.gameDeviceOrigins));
      const here = `${win.location.origin}${win.location.pathname}${win.location.search}`;
      const mount = doc.getElementById("signin-mount");
      // Clerk's hash routing rewrites the URL and fires popstate, which calls
      // render() again. If the form is still mounted, this is that re-entry, not
      // a fresh visit: re-running the mount would fire the SSO callback a second
      // time and show the sign-in form twice in a row.
      if (signInMount && mount && signInMount === mount && mount.childElementCount > 0) return;
      await loadScript(doc, `https://${config.host}/npm/@clerk/ui@1/dist/ui.browser.js`);
      if (!active(id)) return;
      await loadScript(doc, `https://${config.host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": config.pk,
      });
      if (!active(id)) return;
      const Clerk = win.Clerk;
      await Clerk.load({ ui: { ClerkUI: win.__internal_ClerkUICtor }, appearance: CLERK_APPEARANCE });
      if (!active(id)) return;
      if (!Clerk.session) {
        // No session: show Clerk's own form. The device code is optional.
        writeBounced(true);
        status.textContent = "";
        Clerk.mountSignIn(mount, {
          routing: "hash", forceRedirectUrl: here,
          signUpForceRedirectUrl: here, appearance: CLERK_APPEARANCE
        });
        signInMount = mount;
        return;
      }
      // A device flow must not silently reuse a stale browser session, so it
      // always starts from Clerk's own form. A plain portal visit keeps the
      // session and shows the account instead.
      if (device && !readBounced()) {
        writeBounced(true);
        status.textContent = "Opening Clerk sign-in…";
        await Clerk.signOut({ redirectUrl: here });
        if (active(id)) win.location.replace(here);
        return;
      }
      writeBounced(false);
      const token = await Clerk.session.getToken();
      if (!active(id)) return;
      if (!token) throw new Error("Could not read the session");
      if (!device && !returnOk) return showSignedIn(id, Clerk, config, token);
      // here.now proxies do not forward the browser's Authorization header.
      // Send the per-user Clerk JWT to our API directly (with origin-bound CORS).
      if (device) await completeDevice(device, token, config.apiOrigin);
      if (!active(id)) return;
      if (returnOk) {
        status.textContent = "Signed in. Returning to Future Forge…";
        win.location.replace(returnTo);
      } else {
        status.textContent = "Signed in. You can return to Future Forge.";
        try { win.close(); } catch { /* ignore */ }
      }
    } catch (e) {
      if (active(id)) status.textContent = e?.message || String(e);
    }
  }

  function updateNavAuth(signedIn) {
    doc.querySelectorAll?.("[data-nav]").forEach?.((link) => {
      const navRoute = link.getAttribute?.("data-nav") || link.route;
      if (navRoute === "/signin") link.textContent = signedIn ? "Account" : "Sign in";
    });
  }

  async function showSignedIn(id, Clerk, config, token) {
    const status = doc.getElementById("status");
    const mount = doc.getElementById("signin-mount");
    const panel = doc.getElementById("signed-in");
    const account = doc.getElementById("account");
    const who = Clerk.user?.fullName
      || Clerk.user?.primaryEmailAddress?.emailAddress
      || "your account";
    let plan = "Subscription status unavailable";
    try {
      const res = await fetch(`${config.apiOrigin}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = res.ok ? await res.json().catch(() => null) : null;
      const sub = me?.subscription;
      // Failed/anonymous/malformed responses cannot establish an inactive plan.
      if (me?.ok === true && me.signedIn === true && (typeof sub?.content === "boolean" || typeof sub?.entitled === "boolean")) {
        const activePlan = typeof sub?.content === "boolean" ? sub.content : sub.entitled;
        plan = activePlan
          ? `Plan: ${sub.planSlug || "active"} · ${sub.status || "active"}`
          : "no active subscription";
      }
    } catch { /* account state is best-effort; never block the portal */ }
    if (!active(id)) return;
    status.textContent = "";
    mount.hidden = true;
    account.textContent = `${who} — ${plan}`;
    panel.hidden = false;
    const heading = doc.querySelector?.(".signin h1");
    if (heading) heading.textContent = "Account";
    updateNavAuth(true);
    doc.title = "Account — Warmer Sun Cloud";
    doc.getElementById("sign-out").onclick = async () => {
      try {
        await Clerk.signOut();
        updateNavAuth(false);
        if (active(id)) win.location.replace(`${win.location.origin}${base}/signin`);
      } catch (e) {
        if (active(id)) status.textContent = e?.message || String(e);
      }
    };
  }

  async function showSubscribe(id) {
    const status = doc.getElementById("status");
    const mount = doc.getElementById("clerk-mount");
    try {
      const config = await clerkConfig(base, doc);
      if (!active(id)) return;
      if (!config) { status.textContent = "Subscriptions are off on this portal (Clerk keys missing)."; return; }
      await loadScript(doc, `https://${config.host}/npm/@clerk/ui@1/dist/ui.browser.js`);
      if (!active(id)) return;
      await loadScript(doc, `https://${config.host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": config.pk,
      });
      if (!active(id)) return;
      const Clerk = win.Clerk;
      await Clerk.load({ ui: { ClerkUI: win.__internal_ClerkUICtor }, appearance: CLERK_APPEARANCE });
      if (!active(id)) return;
      if (Clerk.session) updateNavAuth(true);
      Clerk.addListener?.(({ session }) => updateNavAuth(Boolean(session)));
      if (typeof Clerk.mountPricingTable === "function") {
        status.textContent = "";
        Clerk.mountPricingTable(mount, {
          appearance: CLERK_APPEARANCE, for: "user",
          newSubscriptionRedirectUrl: `${win.location.origin}${base}/`,
        });
        pricingMount = mount;
      } else status.textContent = "Turn on Clerk Billing, then reload this page.";
    } catch (e) {
      if (active(id)) status.textContent = `Plans are unavailable right now. Reload this page. (${e?.message || e})`;
    }
  }

  async function checkHomeAuth(id) {
    if (win.Clerk?.session) {
      updateNavAuth(true);
      return;
    }
    const hasSessionCookie = typeof document !== "undefined" && typeof document.cookie === "string" &&
      (document.cookie.includes("__client_uat") || document.cookie.includes("__session"));
    if (!hasSessionCookie) return;
    try {
      const config = await clerkConfig(base, doc);
      if (!active(id) || !config) return;
      await loadScript(doc, `https://${config.host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": config.pk,
      });
      if (!active(id) || !win.Clerk) return;
      if (typeof win.Clerk.load === "function") {
        await win.Clerk.load({ ui: { ClerkUI: win.__internal_ClerkUICtor }, appearance: CLERK_APPEARANCE });
      }
      if (!active(id)) return;
      if (win.Clerk.session) {
        updateNavAuth(true);
        const homeSignIn = doc.querySelector?.('#app-home a[href$="/signin"]');
        if (homeSignIn) homeSignIn.textContent = "Account";
      }
      win.Clerk.addListener?.(({ session }) => updateNavAuth(Boolean(session)));
    } catch { /* best-effort background check */ }
  }

  function render() {
    const id = ++generation;
    const route = win.location.pathname.slice(base.length) || "/";
    const current = app.innerHTML.match(/data-route="([^"]*)"/);
    const mounted = app.querySelector?.("#app-home, #signin-mount, #clerk-mount") ?? null;
    const isAuthed = Boolean(win.Clerk?.session);
    // The route only changes when the URL path changes. Clerk's hash routing
    // rewrites the URL and fires popstate; rebuilding on that would unmount the
    // form and remount it, and the remount fires the SSO callback again — the
    // second sign-in prompt right after the first. A same-route popstate keeps
    // the mounted form exactly as it is.
    const routeChanged = current?.[1] !== route || !mounted;
    if (!routeChanged) {
      doc.querySelectorAll("[data-nav]").forEach((link) => {
        const navRoute = link.getAttribute?.("data-nav") || link.route;
        if (navRoute === route) link.setAttribute?.("aria-current", "page");
        else link.removeAttribute?.("aria-current");
        if (navRoute === "/signin") link.textContent = isAuthed ? "Account" : "Sign in";
      });
      doc.title = `${route === "/signin" ? (isAuthed ? "Account" : "Sign in") : route === "/subscribe" ? "Subscribe" : "Home"} — Warmer Sun Cloud`;
      if (route === "/signin") void showSignin(id);
      if (route === "/subscribe") void showSubscribe(id);
      return;
    }
    if (pricingMount) {
      win.Clerk?.unmountPricingTable?.(pricingMount);
      pricingMount = null;
    }
    dropSignInMount();
    doc.querySelectorAll("[data-nav]").forEach((link) => {
      const navRoute = link.getAttribute?.("data-nav") || link.route;
      if (navRoute === route) link.setAttribute?.("aria-current", "page");
      else link.removeAttribute?.("aria-current");
      if (navRoute === "/signin") link.textContent = isAuthed ? "Account" : "Sign in";
    });
    doc.title = `${route === "/signin" ? (isAuthed ? "Account" : "Sign in") : route === "/subscribe" ? "Subscribe" : "Home"} — Warmer Sun Cloud`;
    app.innerHTML = route === "/signin" ? signin(deviceFlow) : route === "/subscribe" ? subscribe : home(base, isAuthed);
    if (route === "/signin") void showSignin(id);
    if (route === "/subscribe") void showSubscribe(id);
    if (route === "/") void checkHomeAuth(id);
  }
  doc.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[data-link]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
    const url = new URL(link.href, win.location.href);
    if (url.origin !== win.location.origin || !["/", "/signin", "/subscribe"].map((route) => `${base}${route}`).includes(url.pathname)) return;
    event.preventDefault();
    if (url.href !== win.location.href) win.history.pushState(null, "", url.href);
    render();
  });
  win.addEventListener("popstate", render);
  render();
  return render;
}

if (typeof document !== "undefined") startPortal();
