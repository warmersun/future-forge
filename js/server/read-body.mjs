/**
 * JSON body reader with hard size cap.
 */

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {object} [opts]
 * @param {number} [opts.maxBytes] default 4_000_000
 * @returns {Promise<object>}
 */
export function readBody(req, opts = {}) {
  const maxBytes = opts.maxBytes ?? 4_000_000;
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        const err = Object.assign(new Error("Payload too large"), { status: 413 });
        try {
          req.destroy();
        } catch {
          /* ignore */
        }
        fail(err);
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", fail);
  });
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {object} data
 */
export function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

/**
 * Map thrown errors from readBody / handlers to HTTP status.
 * @param {unknown} e
 */
export function errorStatus(e) {
  const s = e && typeof e === "object" && "status" in e ? Number(e.status) : NaN;
  if (Number.isFinite(s) && s >= 400 && s < 600) return s;
  return 500;
}
