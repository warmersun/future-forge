/**
 * AbortSignal that fires when the HTTP client disconnects.
 * Attach after the request body is read — IncomingMessage "close" already
 * fired then, so watch "aborted" and response close before writableEnded.
 *
 * @param {import("node:http").IncomingMessage} [req]
 * @param {import("node:http").ServerResponse} [res]
 * @returns {AbortSignal}
 */
export function abortSignalFromHttp(req, res) {
  const ac = new AbortController();
  const abort = () => {
    if (!ac.signal.aborted) ac.abort();
  };
  if (req?.aborted) {
    abort();
    return ac.signal;
  }
  if (req && typeof req.once === "function") {
    req.once("aborted", abort);
  }
  if (res && typeof res.once === "function") {
    res.once("close", () => {
      if (!res.writableEnded) abort();
    });
  }
  return ac.signal;
}
