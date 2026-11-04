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
 * Shared fixed-window rate limiter with periodic GC.
 * Used by HTTP cost policy, rooms create/join, and WS action limits.
 */

export class RateLimiter {
  /**
   * @param {object} [opts]
   * @param {number} [opts.gcEveryMs] how often to drop expired buckets (default 60s)
   * @param {() => number} [opts.now]
   */
  constructor(opts = {}) {
    /** @type {Map<string, { count: number, resetAt: number }>} */
    this.buckets = new Map();
    this.gcEveryMs = opts.gcEveryMs ?? 60_000;
    this.now = opts.now || (() => Date.now());
    this._lastGc = 0;
  }

  /**
   * @param {string} key
   * @param {number} limit max hits allowed in the window
   * @param {number} windowMs window length
   * @returns {boolean} true if allowed
   */
  check(key, limit, windowMs) {
    const now = this.now();
    this._maybeGc(now);
    let e = this.buckets.get(key);
    if (!e || now >= e.resetAt) {
      e = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, e);
    }
    e.count += 1;
    return e.count <= limit;
  }

  /**
   * Peek remaining without consuming (optional helpers).
   * @param {string} key
   * @param {number} limit
   * @param {number} windowMs
   */
  remaining(key, limit, windowMs) {
    const now = this.now();
    const e = this.buckets.get(key);
    if (!e || now >= e.resetAt) return limit;
    return Math.max(0, limit - e.count);
  }

  size() {
    return this.buckets.size;
  }

  clear() {
    this.buckets.clear();
  }

  _maybeGc(now) {
    if (now - this._lastGc < this.gcEveryMs) return;
    this._lastGc = now;
    for (const [k, e] of this.buckets) {
      if (now >= e.resetAt) this.buckets.delete(k);
    }
  }
}

/** Process-wide limiter (optional convenience). */
export const globalRateLimiter = new RateLimiter();
