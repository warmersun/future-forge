/**
 * Optional Clerk learner accounts (CDN clerk-js).
 * No-op when GET /api/health has clerk.enabled !== true.
 * Play stays fully available unsigned.
 */

const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#a78bfa",
    colorBackground: "#121a2b",
    colorText: "#e8eef9",
    colorTextSecondary: "#94a3b8",
    colorNeutral: "#94a3b8",
    colorInputBackground: "#1a2438",
    colorInputText: "#e8eef9",
    borderRadius: "14px",
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
  },
};

/** @type {null | { load: Function, isSignedIn: boolean, session: any, addListener: Function, openSignIn: Function, mountUserButton: Function, unmountUserButton?: Function }} */
let clerkInstance = null;
let userButtonMounted = false;
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
  return clerkInstance;
}

export function isClerkReady() {
  return Boolean(clerkInstance);
}

export function isClerkSignedIn() {
  return Boolean(clerkInstance?.isSignedIn && clerkInstance.session);
}

export function openCloudSignIn() {
  clerkInstance?.openSignIn?.({ appearance: CLERK_APPEARANCE });
}

/**
 * Fires on Clerk session changes (including after Sign in / Sign out).
 * @param {() => void} fn
 */
export function onClerkSession(fn) {
  if (typeof fn !== "function") return () => {};
  sessionListeners.add(fn);
  return () => sessionListeners.delete(fn);
}

function emitClerkSession() {
  renderAccountChip();
  for (const fn of sessionListeners) {
    try {
      fn();
    } catch (e) {
      console.warn("[clerk listener]", e);
    }
  }
}

/**
 * @returns {Promise<string|null>}
 */
export async function getClerkToken() {
  const clerk = clerkInstance;
  if (!clerk?.session?.getToken) return null;
  try {
    const token = await clerk.session.getToken();
    return token ? String(token) : null;
  } catch {
    return null;
  }
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

/**
 * fetch() that attaches a Clerk session JWT when signed in.
 * @param {string} url
 * @param {RequestInit} [init]
 */
export async function apiFetch(url, init = {}) {
  const headers = await authHeaders(init.headers || {});
  return fetch(url, { ...init, headers });
}

/**
 * Load Clerk from the Frontend API CDN and show the account chip.
 */
export async function initAuth() {
  const mount = document.getElementById("ff-account");
  if (!mount) return;
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.clerk?.enabled || !data?.clerk?.publishableKey) return;
    await loadClerkFromCdn(data.clerk.publishableKey);
    document.body.classList.add("ff-accounts");
    mount.hidden = false;
    bindSignIn(mount);
    renderAccountChip();
    clerkInstance?.addListener?.(() => emitClerkSession());
  } catch (e) {
    console.warn("[clerk]", e?.message || e);
  }
}

/**
 * @param {string} publishableKey
 */
async function loadClerkFromCdn(publishableKey) {
  const host = clerkFrontendApiHost(publishableKey);
  await loadScript(`https://${host}/npm/@clerk/ui@1/dist/ui.browser.js`);
  await loadScript(`https://${host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
    "data-clerk-publishable-key": publishableKey,
  });
  const Clerk = window.Clerk;
  if (!Clerk || typeof Clerk.load !== "function") {
    throw new Error("Clerk JS did not initialize");
  }
  await Clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
    appearance: CLERK_APPEARANCE,
  });
  clerkInstance = Clerk;
}

/**
 * @param {string} src
 * @param {Record<string, string>} [attrs]
 */
function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    for (const [k, v] of Object.entries(attrs)) {
      script.setAttribute(k, v);
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * @param {HTMLElement} mount
 */
function bindSignIn(mount) {
  const btn = mount.querySelector("#ff-account-signin");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    clerkInstance?.openSignIn?.({ appearance: CLERK_APPEARANCE });
  });
}

function renderAccountChip() {
  const mount = document.getElementById("ff-account");
  if (!mount || !clerkInstance) return;
  const signInBtn = mount.querySelector("#ff-account-signin");
  const userSlot = mount.querySelector("#ff-account-user");
  const signedIn = Boolean(clerkInstance.isSignedIn && clerkInstance.session);

  if (signInBtn) signInBtn.hidden = signedIn;
  if (!userSlot) return;

  if (signedIn) {
    userSlot.hidden = false;
    if (!userButtonMounted) {
      clerkInstance.mountUserButton(userSlot, { appearance: CLERK_APPEARANCE });
      userButtonMounted = true;
    }
  } else {
    if (userButtonMounted && typeof clerkInstance.unmountUserButton === "function") {
      try {
        clerkInstance.unmountUserButton(userSlot);
      } catch {
        userSlot.replaceChildren();
      }
      userButtonMounted = false;
    }
    userSlot.hidden = true;
  }
}
