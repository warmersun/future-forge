/**
 * Optional learner accounts.
 * Hosted play (ff.warmersun.com) loads Clerk and signs in on the Account Portal.
 * Every other host keeps the device handshake and never loads Clerk.
 * The portal /signin page only finishes that handshake.
 */

import { isAllowedGameReturnUrl, signInUrlWithReturn } from "./cloud/portal-origin.js";

const JWT_STORAGE = "ff-clerk-jwt";
const PENDING_DEVICE = "ff-pending-device";
const PENDING_DEVICE_TTL_MS = 8 * 60 * 1000;

const HOSTED_CLERK_HOST = "ff.warmersun.com";

/** @type {string|null} */
let handshakeJwt = null;
let handshakeReady = false;
/** @type {string} */
let publishableKey = "";
/** Clerk JS is loaded on the hosted game. */
let hostedClerk = false;
/** Hosted host rejected Clerk. Do not fall back to the device handshake. */
let hostedClerkBlocked = false;

/** @type {Set<() => void>} */
const sessionListeners = new Set();

/** Resolves when initAuth finishes (Clerk on or off). */
let settleAuthReady;
const authReadyPromise = new Promise((resolve) => {
  settleAuthReady = resolve;
});

/**
 * Game boot waits here so learning deep-links see the account door.
 * @returns {Promise<void>}
 */
export function whenAuthReady() {
  return authReadyPromise;
}

/**
 * Clerk publishable keys encode the Frontend API host in the third `_` segment.
 * @param {string} publishableKey
 * @returns {string}
 */
export function clerkFrontendApiHost(publishableKey) {
  const raw = String(publishableKey || "").trim();
  const parts = raw.split("_");
  if (parts.length < 3) {
    throw new Error("Invalid Clerk publishable key");
  }
  const decoded = atob(parts.slice(2).join("_"));
  const host = decoded.endsWith("$") ? decoded.slice(0, -1) : decoded;
  if (!host || host.includes("/") || /\s/.test(host)) {
    throw new Error("Invalid Clerk Frontend API host");
  }
  return host;
}

/**
 * Account Portal host for a publishable key.
 * Dev FAPI `name.clerk.accounts.dev` → `name.accounts.dev`.
 * Production FAPI `clerk.example.com` → `accounts.example.com`.
 * @param {string} key
 * @returns {string}
 */
export function accountPortalHost(key) {
  const host = clerkFrontendApiHost(key);
  const dev = ".clerk.accounts.dev";
  if (host.endsWith(dev)) return `${host.slice(0, -dev.length)}.accounts.dev`;
  if (host.startsWith("clerk.")) return `accounts.${host.slice("clerk.".length)}`;
  throw new Error("Cannot derive Account Portal host");
}

/**
 * @param {string} key
 * @param {string} redirectUrl
 * @returns {string}
 */
export function accountPortalSignInUrl(key, redirectUrl) {
  const u = new URL(`https://${accountPortalHost(key)}/sign-in`);
  const back = String(redirectUrl || "").trim();
  if (back) u.searchParams.set("redirect_url", back);
  return u.href;
}

/**
 * @param {string} key
 * @returns {string}
 */
export function accountPortalUserUrl(key) {
  return `https://${accountPortalHost(key)}/user`;
}

/**
 * Open the Account Portal in a new tab. Fall back to this tab only when
 * the browser actually blocks the popup. `noopener` in the feature string
 * makes window.open return null even when the tab opened.
 * @param {string} url
 * @param {{ open?: (url: string, target: string) => { opener: unknown }|null, assign?: (url: string) => void }} [opts]
 */
export function openAccountPortalTab(url, opts = {}) {
  const open =
    opts.open ||
    (typeof window !== "undefined" ? (href, target) => window.open(href, target) : null);
  const assign =
    opts.assign ||
    (typeof location !== "undefined" ? (href) => location.assign(href) : null);
  if (!open) {
    assign?.(url);
    return;
  }
  const opened = open(url, "_blank");
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      /* The new tab can refuse opener once it is cross-origin. */
    }
    return;
  }
  assign?.(url);
}

/** Production game host that shares the Clerk session. Loopback and Funnel do not. */
export function isHostedClerkGame() {
  if (typeof location === "undefined" || !location?.hostname) return false;
  return location.hostname.toLowerCase() === HOSTED_CLERK_HOST;
}

export function getClerk() {
  if (typeof window === "undefined") return null;
  return window.Clerk || null;
}

export function isClerkReady() {
  return handshakeReady;
}

function jwtPayloadUnsafe(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(b64 + pad));
  } catch {
    return null;
  }
}

function storedJwtExpired(token = handshakeJwt) {
  const p = jwtPayloadUnsafe(token);
  if (!p || p.exp == null) return false;
  return Number(p.exp) * 1000 < Date.now() - 2000;
}

export function isClerkSignedIn() {
  if (hostedClerk && getClerk()?.session) return true;
  if (!handshakeJwt) return false;
  if (storedJwtExpired()) return false;
  return true;
}

export function invalidateClerkSession() {
  if (!handshakeJwt) return;
  writeStoredJwt(null);
  emitClerkSession();
}

/** @type {object|null} */
let cloudProfileCache = null;

export function getCloudProfileCache() {
  return cloudProfileCache;
}

export function setCloudProfileCache(profile) {
  if (!profile || typeof profile !== "object") {
    cloudProfileCache = null;
  } else {
    const next = { ...profile };
    delete next.login;
    delete next.email;
    cloudProfileCache = next;
  }
  renderAccountChip();
}

/** Chosen in-game name for rooms/boards. Never Clerk firstName. */
export function cachedProfileDisplayName() {
  return accountChipDisplayName(cloudProfileCache);
}

/**
 * Chip label: display name, else username, else Account. Never an email.
 * @param {object|null|undefined} profile
 */
export function accountChipLabel(profile = cloudProfileCache) {
  const display = accountChipDisplayName(profile);
  if (display) return display;
  const user = String(profile?.username || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
  if (user && !user.includes("@")) return user;
  return "Account";
}

/**
 * Private Inventor page line. Empty if Clerk login is missing.
 * @param {{ email?: string, providers?: unknown[] }|null|undefined} login
 */
export function formatClerkLoginLine(login) {
  const email = String(login?.email || "").trim();
  if (!email || !email.includes("@")) return "";
  const providers = Array.isArray(login.providers)
    ? login.providers.map((p) => String(p || "").trim()).filter(Boolean)
    : [];
  return providers.length
    ? `Signed in as ${email} · ${providers.join(", ")}`
    : `Signed in as ${email}`;
}

function accountChipDisplayName(profile) {
  const n = String(profile?.displayName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
  if (!n || n.includes("@")) return "";
  return n;
}

export function refreshAccountChip() {
  renderAccountChip();
}

/**
 * @param {{ sameTab?: boolean, returnHref?: string }} [opts]
 */
export function openCloudSignIn(opts = {}) {
  void startDeviceHandshake(opts);
}

/**
 * Fires on Clerk session changes (including after Sign in / Sign out).
 * @param {() => void} fn
 */
export function onClerkSession(fn) {
  if (typeof fn !== "function") return () => {};
  sessionListeners.add(fn);
  if (handshakeReady) {
    try {
      fn();
    } catch (e) {
      console.warn("[clerk listener]", e);
    }
  }
  return () => sessionListeners.delete(fn);
}

function emitClerkSession() {
  document.body.classList.toggle("ff-signed-in", isClerkSignedIn());
  if (!isClerkSignedIn()) cloudProfileCache = null;
  renderAccountChip();
  if (isClerkSignedIn()) void loadCloudProfileForChip();
  for (const fn of sessionListeners) {
    try {
      fn();
    } catch (e) {
      console.warn("[clerk listener]", e);
    }
  }
}

async function loadCloudProfileForChip() {
  if (!isClerkSignedIn()) return;
  try {
    const res = await apiFetch("/api/me/profile");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setCloudProfileCache(data.profile || null);
    else renderAccountChip();
  } catch {
    renderAccountChip();
  }
}

/**
 * @returns {Promise<string|null>}
 */
export async function getClerkToken() {
  const clerk = hostedClerk ? getClerk() : null;
  if (clerk?.session) {
    try {
      const token = await clerk.session.getToken();
      if (token) {
        if (token !== handshakeJwt) writeStoredJwt(token);
        return token;
      }
    } catch {
      /* use the stored session token */
    }
  }
  if (storedJwtExpired()) return null;
  return handshakeJwt;
}

/**
 * @param {HeadersInit|Record<string, string>} [extra]
 * @returns {Promise<Record<string, string>>}
 */
export async function authHeaders(extra = {}) {
  /** @type {Record<string, string>} */
  const headers = {};
  if (extra && typeof extra === "object") {
    if (typeof extra.forEach === "function") {
      extra.forEach((v, k) => {
        headers[String(k)] = String(v);
      });
    } else {
      for (const [k, v] of Object.entries(extra)) {
        if (v != null) headers[k] = String(v);
      }
    }
  }
  const token = await getClerkToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** @type {string|null} */
let portalOrigin = null;
let portalResolved = false;

/**
 * Cloud HTTP lives on portal (Render). Game /api/health points at it via portal.origin.
 * @returns {Promise<string|null>}
 */
export async function resolvePortalOrigin() {
  if (portalResolved) return portalOrigin;
  portalResolved = true;
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return null;
    const data = await res.json();
    const origin = String(data?.portal?.origin || "").trim().replace(/\/$/, "");
    if (/^https?:\/\//i.test(origin)) portalOrigin = origin;
  } catch {
    portalOrigin = null;
  }
  return portalOrigin;
}

/**
 * Paths that belong on portal, not game.
 * @param {string} url
 */
export function isCloudApiPath(url) {
  const path = String(url || "").split("?")[0];
  if (path === "/api/health" || path.startsWith("/api/health/")) return true;
  if (path === "/api/me" || path.startsWith("/api/me/")) return true;
  if (path.startsWith("/api/u/")) return true;
  if (path === "/api/report" || path.startsWith("/api/report/")) return true;
  if (path === "/api/board" || path.startsWith("/api/board/")) return true;
  if (path === "/api/device" || path.startsWith("/api/device/")) return true;
  return false;
}

/**
 * fetch() that attaches a Clerk session JWT when signed in.
 * Cloud routes go to portal when FF_PORTAL_URL is set on game.
 * @param {string} url
 * @param {RequestInit} [init]
 */
export async function apiFetch(url, init = {}) {
  const headers = await authHeaders(init.headers || {});
  let dest = url;
  if (isCloudApiPath(url)) {
    const origin = await resolvePortalOrigin();
    if (origin) dest = `${origin}${url}`;
  }
  return fetch(dest, { ...init, headers, mode: "cors" });
}

function readStoredJwt() {
  try {
    const raw = sessionStorage.getItem(JWT_STORAGE);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

function writeStoredJwt(token) {
  handshakeJwt = token ? String(token) : null;
  try {
    if (handshakeJwt) sessionStorage.setItem(JWT_STORAGE, handshakeJwt);
    else sessionStorage.removeItem(JWT_STORAGE);
  } catch {
    /* private mode */
  }
}

function writePendingDevice(code) {
  const s = String(code || "").trim();
  if (!s) return;
  try {
    sessionStorage.setItem(PENDING_DEVICE, JSON.stringify({ code: s, at: Date.now() }));
  } catch {
    /* private mode */
  }
}

function readPendingDevice() {
  try {
    const raw = sessionStorage.getItem(PENDING_DEVICE);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const code = String(data?.code || "").trim();
    const at = Number(data?.at);
    if (!code) return null;
    if (Number.isFinite(at) && Date.now() - at > PENDING_DEVICE_TTL_MS) {
      sessionStorage.removeItem(PENDING_DEVICE);
      return null;
    }
    return { code };
  } catch {
    return null;
  }
}

function clearPendingDevice() {
  try {
    sessionStorage.removeItem(PENDING_DEVICE);
  } catch {
    /* private mode */
  }
}

/**
 * @param {string} src
 * @param {Record<string, string>} [attrs]
 */
function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    for (const [k, v] of Object.entries(attrs)) script.setAttribute(k, v);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Load Clerk on the hosted game and mirror its session into the stored JWT.
 * A failed load blocks sign-in. It does not fall through to the device code.
 * @param {string} key
 */
async function initHostedClerk(key) {
  const host = clerkFrontendApiHost(key);
  await loadScript(`https://${host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
    "data-clerk-publishable-key": key,
  });
  const clerk = getClerk();
  if (!clerk) throw new Error("Clerk missing after load");
  await clerk.load();
  hostedClerk = true;
  const sync = async () => {
    if (clerk.session) {
      try {
        const token = await clerk.session.getToken();
        writeStoredJwt(token || null);
      } catch {
        writeStoredJwt(null);
      }
    } else {
      writeStoredJwt(null);
    }
    emitClerkSession();
  };
  clerk.addListener?.(() => {
    void sync();
  });
  await sync();
}

/**
 * Portal health says Clerk is on. Hosted play uses the Account Portal.
 * Other hosts store a handshake JWT and never load Clerk.
 */
export async function initAuth() {
  const mount = document.getElementById("ff-account");
  try {
    if (!mount) return;
    const origin = await resolvePortalOrigin();
    if (!origin) return;
    const res = await fetch(`${origin}/api/health`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.clerk?.enabled || !data?.clerk?.publishableKey) return;
    publishableKey = String(data.clerk.publishableKey);
    document.body.classList.add("ff-accounts");
    mount.hidden = false;
    if (isHostedClerkGame()) {
      try {
        await initHostedClerk(publishableKey);
      } catch (e) {
        hostedClerkBlocked = true;
        console.warn("[clerk]", e?.message || e);
      }
    } else {
      handshakeJwt = readStoredJwt();
      if (storedJwtExpired()) writeStoredJwt(null);
    }
    handshakeReady = true;
    bindAccountChip(mount);
    bindAccountChipInset();
    emitClerkSession();
  } catch (e) {
    console.warn("[clerk]", e?.message || e);
  } finally {
    settleAuthReady();
  }
}

/**
 * @param {string} returnHref
 */
function startHostedSignIn(returnHref) {
  if (hostedClerkBlocked || !publishableKey) {
    console.warn("[clerk] Sign in is unavailable on this host");
    return;
  }
  const requested = String(returnHref || "").trim();
  const back =
    requested && isAllowedGameReturnUrl(requested) ? requested : location.href;
  let signInUrl;
  try {
    signInUrl = accountPortalSignInUrl(publishableKey, back);
  } catch (e) {
    console.warn("[clerk]", e?.message || e);
    return;
  }
  try {
    location.assign(signInUrl);
  } catch {
    location.href = signInUrl;
  }
}

/**
 * @param {{ sameTab?: boolean, returnHref?: string }} [opts]
 */
async function startDeviceHandshake(opts = {}) {
  if (!handshakeReady) return;
  const returnHref =
    opts.returnHref || (typeof location !== "undefined" ? location.href : "");
  if (isHostedClerkGame()) {
    startHostedSignIn(returnHref);
    return;
  }
  const origin = await resolvePortalOrigin();
  if (!origin) return;
  const res = await apiFetch("/api/device/start", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.code || !data?.signInUrl) {
    console.warn("[clerk]", data?.error || "device_start_failed");
    return;
  }
  writePendingDevice(data.code);
  const callback = signInUrlWithReturn(data.signInUrl, returnHref);
  let signInUrl = callback;
  if (publishableKey) {
    try {
      signInUrl = accountPortalSignInUrl(publishableKey, callback);
    } catch (e) {
      console.warn("[clerk]", e?.message || e);
    }
  }
  const sameTab = opts.sameTab === true;
  /** @type {Window|null} */
  let popup = null;
  if (!sameTab) {
    popup = window.open(signInUrl, "ff-cloud-signin", "width=480,height=720");
  }
  if (sameTab || !popup) {
    try {
      location.assign(signInUrl);
    } catch {
      location.href = signInUrl;
    }
    return;
  }
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    const st = await apiFetch(
      `/api/device/status?code=${encodeURIComponent(data.code)}`
    );
    const body = await st.json().catch(() => ({}));
    if (st.ok && body.pending === false && body.token) {
      writeStoredJwt(body.token);
      clearPendingDevice();
      closeHandshakePopup(popup);
      emitClerkSession();
      return;
    }
    if (!st.ok && body.error === "unknown") {
      clearPendingDevice();
      closeHandshakePopup(popup);
      return;
    }
  }
  closeHandshakePopup(popup);
}

/**
 * After same-tab Sign in, the game reloads with ?q= still on the URL.
 * Redeem the device code deposited on the portal.
 * @returns {Promise<boolean>}
 */
export async function resumePendingDeviceHandshake() {
  const pending = readPendingDevice();
  if (!pending?.code) return false;
  if (!handshakeReady) return false;
  const deadline = Date.now() + 20 * 1000;
  while (Date.now() < deadline) {
    const st = await apiFetch(
      `/api/device/status?code=${encodeURIComponent(pending.code)}`
    );
    const body = await st.json().catch(() => ({}));
    if (st.ok && body.pending === false && body.token) {
      writeStoredJwt(body.token);
      clearPendingDevice();
      emitClerkSession();
      return true;
    }
    if (!st.ok && body.error === "unknown") {
      clearPendingDevice();
      return false;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function closeHandshakePopup(win) {
  if (!win || win.closed) return;
  try {
    win.close();
  } catch {
    /* ignore */
  }
}

async function signOutHandshake() {
  const clerk = hostedClerk ? getClerk() : null;
  writeStoredJwt(null);
  emitClerkSession();
  if (!clerk?.session) return;
  try {
    await clerk.signOut();
  } catch (e) {
    console.warn("[clerk]", e?.message || e);
  }
  writeStoredJwt(null);
  emitClerkSession();
}

/**
 * @param {HTMLElement} mount
 */
function bindAccountChip(mount) {
  const btn = mount.querySelector("#ff-account-signin");
  if (btn && btn.dataset.bound !== "1") {
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      void startDeviceHandshake();
    });
  }
  const who = mount.querySelector("#ff-account-who");
  if (who && who.dataset.bound !== "1") {
    who.dataset.bound = "1";
    who.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("ff-open-cloud-profile"));
    });
  }
  const manage = mount.querySelector("#ff-account-manage");
  if (manage && manage.dataset.bound !== "1") {
    manage.dataset.bound = "1";
    manage.addEventListener("click", () => {
      if (!publishableKey) return;
      let url = "";
      try {
        url = accountPortalUserUrl(publishableKey);
      } catch (e) {
        console.warn("[clerk]", e?.message || e);
        return;
      }
      openAccountPortalTab(url);
    });
  }
  const out = mount.querySelector("#ff-account-signout");
  if (out && out.dataset.bound !== "1") {
    out.dataset.bound = "1";
    out.addEventListener("click", () => {
      void signOutHandshake();
    });
  }
}

function renderAccountChip() {
  if (typeof document === "undefined") return;
  const mount = document.getElementById("ff-account");
  if (!mount) return;
  const signInBtn = mount.querySelector("#ff-account-signin");
  const whoBtn = mount.querySelector("#ff-account-who");
  const manageBtn = mount.querySelector("#ff-account-manage");
  const signOutBtn = mount.querySelector("#ff-account-signout");
  const signedIn = isClerkSignedIn();
  if (signInBtn) signInBtn.hidden = signedIn;
  if (whoBtn) {
    whoBtn.hidden = !signedIn;
    if (signedIn) {
      whoBtn.textContent = accountChipLabel();
      whoBtn.title = "Inventor page";
    }
  }
  if (manageBtn) manageBtn.hidden = !signedIn || !publishableKey;
  if (signOutBtn) signOutBtn.hidden = !signedIn;
  syncAccountChipInset();
}

let accountInsetBound = false;

function bindAccountChipInset() {
  if (accountInsetBound || typeof window === "undefined") return;
  accountInsetBound = true;
  window.addEventListener("resize", () => syncAccountChipInset());
}

function syncAccountChipInset() {
  if (typeof document === "undefined") return;
  const mount = document.getElementById("ff-account");
  const root = document.documentElement;
  if (!root) return;
  if (!mount || mount.hidden) {
    root.style.removeProperty("--ff-account-w");
    return;
  }
  const w = mount.getBoundingClientRect().width;
  if (w > 0) root.style.setProperty("--ff-account-w", `${Math.ceil(w)}px`);
}
