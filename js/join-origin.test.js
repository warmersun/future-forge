import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  funnelPageOrigin,
  isRemoteJoinUrl,
  joinOriginFromEnv,
  normalizeJoinUrlList,
  resolveRoomJoinUrls,
} from "./join-origin.js";

const FUNNEL = "https://futureforge.xantu-chickadee.ts.net";
const LAN = "http://192.168.1.20:8765";
const LOOPBACK = "http://127.0.0.1:8765";

describe("joinOriginFromEnv", () => {
  it("normalizes a Funnel URL and strips a trailing slash", () => {
    assert.equal(joinOriginFromEnv({ FF_JOIN_ORIGIN: `${FUNNEL}/` }), FUNNEL);
    assert.equal(joinOriginFromEnv({ FF_JOIN_ORIGIN: FUNNEL }), FUNNEL);
  });

  it("rejects paths, credentials, and non-http", () => {
    assert.equal(joinOriginFromEnv({ FF_JOIN_ORIGIN: `${FUNNEL}/forge` }), "");
    assert.equal(joinOriginFromEnv({ FF_JOIN_ORIGIN: "javascript:alert(1)" }), "");
    assert.equal(joinOriginFromEnv({ FF_JOIN_ORIGIN: "https://user:pass@evil.example" }), "");
  });

  it("returns empty when unset", () => {
    assert.equal(joinOriginFromEnv({}), "");
  });
});

describe("normalizeJoinUrlList", () => {
  it("drops junk and dedupes", () => {
    assert.deepEqual(normalizeJoinUrlList([`${FUNNEL}/`, FUNNEL, "not a url", LAN]), [
      FUNNEL,
      LAN,
    ]);
    assert.deepEqual(normalizeJoinUrlList(null), []);
  });
});

describe("funnelPageOrigin", () => {
  it("uses the page origin on MagicDNS", () => {
    assert.equal(
      funnelPageOrigin({ hostname: "futureforge.xantu-chickadee.ts.net", locationOrigin: FUNNEL }),
      FUNNEL
    );
  });

  it("does not treat loopback as public", () => {
    assert.equal(
      funnelPageOrigin({ hostname: "127.0.0.1", locationOrigin: LOOPBACK }),
      ""
    );
    assert.equal(
      funnelPageOrigin({ hostname: "localhost", locationOrigin: "http://localhost:8765" }),
      ""
    );
  });
});

describe("isRemoteJoinUrl", () => {
  it("treats https and *.ts.net as remote", () => {
    assert.equal(isRemoteJoinUrl(FUNNEL), true);
    assert.equal(isRemoteJoinUrl("http://futureforge.xantu-chickadee.ts.net"), true);
    assert.equal(isRemoteJoinUrl(LAN), false);
    assert.equal(isRemoteJoinUrl(LOOPBACK), false);
  });
});

describe("resolveRoomJoinUrls", () => {
  it("orders join, then Funnel page origin, then LAN", () => {
    assert.deepEqual(
      resolveRoomJoinUrls({
        joinUrls: [FUNNEL],
        lanUrls: [LAN],
        hostname: "futureforge.xantu-chickadee.ts.net",
        locationOrigin: FUNNEL,
      }),
      [FUNNEL, LAN]
    );
  });

  it("fills a gap from the Funnel page origin", () => {
    assert.deepEqual(
      resolveRoomJoinUrls({
        joinUrls: [],
        lanUrls: [LAN],
        hostname: "futureforge.xantu-chickadee.ts.net",
        locationOrigin: FUNNEL,
      }),
      [FUNNEL, LAN]
    );
  });

  it("does not advertise loopback as a public join URL", () => {
    assert.deepEqual(
      resolveRoomJoinUrls({
        joinUrls: [],
        lanUrls: [LAN],
        hostname: "127.0.0.1",
        locationOrigin: LOOPBACK,
      }),
      [LAN]
    );
  });

  it("keeps LAN last when join is set and the page is loopback", () => {
    assert.deepEqual(
      resolveRoomJoinUrls({
        joinUrls: [FUNNEL],
        lanUrls: [LAN],
        hostname: "127.0.0.1",
        locationOrigin: LOOPBACK,
      }),
      [FUNNEL, LAN]
    );
  });
});
