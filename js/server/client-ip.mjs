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

/**
 * Client IP for rate limiting.
 * By default uses the TCP peer address only.
 * Set FF_TRUST_PROXY=1 when behind a trusted reverse proxy so X-Forwarded-For is honored.
 */

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {object} [opts]
 * @param {boolean} [opts.trustProxy] override env
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @returns {string}
 */
export function clientIp(req, opts = {}) {
  const env = opts.env || process.env;
  const trust =
    opts.trustProxy != null
      ? Boolean(opts.trustProxy)
      : env.FF_TRUST_PROXY === "1" || env.FF_TRUST_PROXY === "true";

  if (trust) {
    const xf = req.headers?.["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) {
      // When we trust the proxy, the left-most client IP is the original client
      // (proxy appends hops to the right). Only enable with a trusted hop.
      const first = xf.split(",")[0].trim();
      if (first) return first;
    }
    const real = req.headers?.["x-real-ip"];
    if (typeof real === "string" && real.trim()) return real.trim();
  }

  const remote = req.socket?.remoteAddress || req.connection?.remoteAddress;
  return remote || "unknown";
}

/**
 * True when the TCP peer is loopback (admin surfaces).
 * Does not use X-Forwarded-For — spoofable headers must not grant admin.
 * @param {import('node:http').IncomingMessage} req
 */
export function isLoopbackSocket(req) {
  const addr = String(req.socket?.remoteAddress || "");
  return (
    addr === "127.0.0.1" ||
    addr === "::1" ||
    addr === "::ffff:127.0.0.1" ||
    addr.endsWith("/127.0.0.1")
  );
}
