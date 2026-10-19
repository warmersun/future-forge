import { createHash, timingSafeEqual } from "node:crypto";

const expectedKey = process.env.PORTAL_SMOKE_API_KEY;

function matchesKey(supplied: string | null): boolean {
  if (!expectedKey || !supplied) return false;
  const expected = createHash("sha256").update(expectedKey).digest();
  const actual = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expected, actual);
}

export default {
  fetch(request: Request): Response {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    if (!matchesKey(request.headers.get("x-api-key"))) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ ok: true, message: "Authenticated by Neon Function" });
  },
};
