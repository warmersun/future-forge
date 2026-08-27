import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_FORGE_ORIGIN,
  sanitizeQuestToken,
  slugifyTitle,
  normalizeShareOrigin,
  shareOriginFromEnv,
  resolveShareOrigin,
  buildQuestShareUrl,
  parseDeepLink,
  hrefWithoutDeepLink,
  findCatalogEntry,
} from "./deep-link.js";

const LESSON = {
  id: "learn-daily-airlines-plane-2026-08-27",
  title: "After an airlines-size plane flew",
  mission: {
    id: "learn-daily-airlines-plane-2026-08-27",
    title: "After an airlines-size plane flew",
    module: "Learn Daily",
  },
};

const OTHER = {
  id: "spotlight-gene-seq-border-clinic-2026",
  title: "Fever samples waiting at Crossing Clinic 7",
  mission: { id: "spotlight-gene-seq-border-clinic-2026", title: "Fever samples waiting at Crossing Clinic 7" },
};

describe("sanitizeQuestToken", () => {
  it("keeps catalog ids and rejects junk", () => {
    assert.equal(sanitizeQuestToken("learn-daily-airlines-plane-2026-08-27"), "learn-daily-airlines-plane-2026-08-27");
    assert.equal(sanitizeQuestToken("pp-01-exponential-grains-2026"), "pp-01-exponential-grains-2026");
    assert.equal(sanitizeQuestToken("  a.b_c~d  "), "a.b_c~d");
    assert.equal(sanitizeQuestToken(""), "");
    assert.equal(sanitizeQuestToken("has space"), "");
    assert.equal(sanitizeQuestToken("https://evil.example/x.json"), "");
    assert.equal(sanitizeQuestToken("a".repeat(121)), "");
  });
});

describe("slugifyTitle", () => {
  it("slugs the Learn Daily title", () => {
    assert.equal(slugifyTitle("After an airlines-size plane flew"), "after-an-airlines-size-plane-flew");
    assert.equal(slugifyTitle("After an arlines-size plane flew"), "after-an-arlines-size-plane-flew");
  });
});

describe("parseDeepLink", () => {
  it("reads q and quest", () => {
    assert.deepEqual(parseDeepLink("https://warmersun.com/forge/?q=pp-01-exponential-grains-2026"), {
      token: "pp-01-exponential-grains-2026",
    });
    assert.deepEqual(
      parseDeepLink("https://futureforge.xantu-chickadee.ts.net/?quest=pp-01-exponential-grains-2026"),
      { token: "pp-01-exponential-grains-2026" }
    );
    assert.deepEqual(parseDeepLink({ search: "?q=pp-01-exponential-grains-2026", pathname: "/" }), {
      token: "pp-01-exponential-grains-2026",
    });
  });

  it("prefers q over quest and ignores junk URLs", () => {
    assert.equal(parseDeepLink("https://warmersun.com/forge/"), null);
    assert.equal(parseDeepLink("https://warmersun.com/forge/?q="), null);
    assert.equal(parseDeepLink("https://warmersun.com/forge/?q=https://evil.example/x.json"), null);
    assert.deepEqual(parseDeepLink("https://warmersun.com/forge/?q=keep-me&quest=other"), {
      token: "keep-me",
    });
    assert.deepEqual(
      parseDeepLink("https://warmersun.com/forge/?q=After%20an%20airlines-size%20plane%20flew"),
      { token: "After an airlines-size plane flew" }
    );
  });
});

describe("hrefWithoutDeepLink", () => {
  it("strips q/quest and keeps other params", () => {
    assert.equal(hrefWithoutDeepLink("https://host/?q=abc"), "/");
    assert.equal(hrefWithoutDeepLink("https://host/?q=abc&x=1"), "/?x=1");
    assert.equal(hrefWithoutDeepLink("https://host/play?quest=abc#h"), "/play#h");
  });
});

describe("findCatalogEntry", () => {
  const catalog = [LESSON, OTHER];

  it("matches id first", () => {
    assert.equal(findCatalogEntry(LESSON.id, catalog), LESSON);
    assert.equal(findCatalogEntry(OTHER.id.toUpperCase(), catalog), OTHER);
  });

  it("matches exact title then slug", () => {
    assert.equal(findCatalogEntry("After an airlines-size plane flew", catalog), LESSON);
    assert.equal(findCatalogEntry(slugifyTitle(LESSON.title), catalog), LESSON);
  });

  it("returns null when missing", () => {
    assert.equal(findCatalogEntry("no-such-quest", catalog), null);
    assert.equal(findCatalogEntry(LESSON.id, []), null);
  });
});

describe("share origin + build URL", () => {
  it("normalizes forge and loopback origins", () => {
    assert.equal(normalizeShareOrigin("https://warmersun.com/forge/"), PUBLIC_FORGE_ORIGIN);
    assert.equal(normalizeShareOrigin("http://127.0.0.1:8765"), "http://127.0.0.1:8765");
    assert.equal(normalizeShareOrigin("https://evil.example/x?q=1"), "");
    assert.equal(shareOriginFromEnv({ FF_SHARE_ORIGIN: "https://warmersun.com/forge/" }), PUBLIC_FORGE_ORIGIN);
    assert.equal(shareOriginFromEnv({}), "");
  });

  it("uses health, then Funnel heuristic, then location", () => {
    assert.equal(
      resolveShareOrigin({ healthShareOrigin: "https://warmersun.com/forge/" }),
      PUBLIC_FORGE_ORIGIN
    );
    assert.equal(
      resolveShareOrigin({
        hostname: "futureforge.xantu-chickadee.ts.net",
        locationOrigin: "https://futureforge.xantu-chickadee.ts.net",
      }),
      PUBLIC_FORGE_ORIGIN
    );
    assert.equal(
      resolveShareOrigin({
        hostname: "127.0.0.1",
        locationOrigin: "http://127.0.0.1:8765",
      }),
      "http://127.0.0.1:8765"
    );
  });

  it("builds the X-ready hop URL", () => {
    assert.equal(
      buildQuestShareUrl(LESSON.id, PUBLIC_FORGE_ORIGIN),
      `https://warmersun.com/forge/?q=${LESSON.id}`
    );
    assert.equal(
      buildQuestShareUrl(LESSON.id, "http://127.0.0.1:8765"),
      `http://127.0.0.1:8765/?q=${LESSON.id}`
    );
    assert.equal(buildQuestShareUrl("nope nope", PUBLIC_FORGE_ORIGIN), "");
  });
});
