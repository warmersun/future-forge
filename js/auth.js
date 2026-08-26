/**
 * Optional learner accounts. The game never loads Clerk JS.
 * Sign in happens on the hosted portal; a device handshake returns a JWT.
 */

const JWT_STORAGE = "ff-clerk-jwt";

/** @type {string|null} */
let handshakeJwt = null;
let handshakeReady = false;

/** @type {Set<() => void>} */
const sessionListeners = new Set();

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

export function getClerk() {
  return null;
}

export function isClerkReady() {
  return handshakeReady;
}

export function isClerkSignedIn() {
  return Boolean(handshakeJwt);
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

export function openCloudSignIn() {
  void startDeviceHandshake();
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

/**
 * Handshake: portal /signin holds Clerk; game only stores the JWT.
 */
export async function initAuth() {
  const mount = document.getElementById("ff-account");
  if (!mount) return;
  try {
    const origin = await resolvePortalOrigin();
    if (!origin) return;
    const res = await fetch(`${origin}/api/health`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.clerk?.enabled) return;
    handshakeReady = true;
    handshakeJwt = readStoredJwt();
    document.body.classList.add("ff-accounts");
    mount.hidden = false;
    bindAccountChip(mount);
    emitClerkSession();
  } catch (e) {
    console.warn("[clerk]", e?.message || e);
  }
}

async function startDeviceHandshake() {
  if (!handshakeReady) return;
  const origin = await resolvePortalOrigin();
  if (!origin) return;
  const res = await apiFetch("/api/device/start", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.code || !data?.signInUrl) {
    console.warn("[clerk]", data?.error || "device_start_failed");
    return;
  }
  const popup = window.open(data.signInUrl, "ff-cloud-signin", "width=480,height=720");
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    const st = await apiFetch(
      `/api/device/status?code=${encodeURIComponent(data.code)}`
    );
    const body = await st.json().catch(() => ({}));
    if (st.ok && body.pending === false && body.token) {
      writeStoredJwt(body.token);
      closeHandshakePopup(popup);
      emitClerkSession();
      return;
    }
    if (!st.ok && body.error === "unknown") {
      closeHandshakePopup(popup);
      return;
    }
  }
  closeHandshakePopup(popup);
}

function closeHandshakePopup(win) {
  if (!win || win.closed) return;
  try {
    win.close();
  } catch {
    /* ignore */
  }
}

function signOutHandshake() {
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
  const out = mount.querySelector("#ff-account-signout");
  if (out && out.dataset.bound !== "1") {
    out.dataset.bound = "1";
    out.addEventListener("click", () => signOutHandshake());
  }
}

function renderAccountChip() {
  if (typeof document === "undefined") return;
  const mount = document.getElementById("ff-account");
  if (!mount) return;
  const signInBtn = mount.querySelector("#ff-account-signin");
  const whoBtn = mount.querySelector("#ff-account-who");
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
  if (signOutBtn) signOutBtn.hidden = !signedIn;
}
