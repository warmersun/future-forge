import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CARD_PUBLIC_BASE_DEFAULT,
  CLOUD_PORTAL_ORIGIN,
  cardPublicBaseUrl,
  GAME_DEVICE_ORIGINS,
  allowGameDeviceOrigin,
  allowLanOriginsFromEnv,
  cloudOriginAllowed,
  gameDeviceOriginsFromEnv,
  isAllowedGameReturnUrl,
  isLanHttpOrigin,
  normalizeGameDeviceOrigin,
  portalPublicOrigin,
  signInUrlWithReturn,
  cloudCorsOriginsFromEnv,
  validPortalCorsOrigin,
} from "./portal-origin.js";

const EMPTY = {};

describe("private-LAN origins", () => {
  const lan = "http://192.168.1.140:8765";
  const other = "http://192.168.1.141:8765";
  const back = `${lan}/?quest=lesson-1#play`;
  const base = "https://cloud.warmersun.com/signin?device=abc";

  it("allows private-LAN origins by default and rejects public HTTP", () => {
    assert.equal(isAllowedGameReturnUrl(back), true);
    assert.equal(new URL(signInUrlWithReturn(base, back)).searchParams.get("return"), back);
    assert.equal(isAllowedGameReturnUrl(back, [lan]), true);
    assert.equal(isAllowedGameReturnUrl(back, { FF_GAME_DEVICE_ORIGINS: lan }), true);
    assert.equal(new URL(signInUrlWithReturn(base, back, [lan])).searchParams.get("return"), back);
    // A different LAN host or port is still a private-LAN origin.
    assert.equal(isAllowedGameReturnUrl(`${other}/`, [lan]), true);
    assert.equal(isAllowedGameReturnUrl("http://192.168.1.140:8766/", [lan]), true);
    // Public HTTP stays rejected even when a LAN origin is configured.
    assert.equal(isAllowedGameReturnUrl("http://public.example/", [lan]), false);
    assert.equal(isAllowedGameReturnUrl("http://warmersun.com/", [lan]), false);
    assert.equal(isAllowedGameReturnUrl("http://8.8.8.8/", [lan]), false);
    assert.equal(isAllowedGameReturnUrl(back, { FF_CLOUD_CORS_ORIGINS: lan }), true);
  });

  it("accepts different private-LAN hosts and ports by default, and honors FF_ALLOW_LAN_ORIGINS=1", () => {
    const hosts = [lan, other, "http://10.0.0.1:9000", "http://172.16.0.1", "http://172.31.255.255:8766"];
    for (const origin of hosts) {
      assert.equal(isLanHttpOrigin(origin), true, origin);
      assert.equal(isAllowedGameReturnUrl(`${origin}/`), true, origin);
      assert.equal(allowGameDeviceOrigin(origin, EMPTY), true, origin);
      assert.equal(cloudOriginAllowed(origin, EMPTY), true, origin);
    }
    for (const on of ["1", "true", "yes", "on", ""]) {
      const env = { FF_ALLOW_LAN_ORIGINS: on };
      assert.equal(allowLanOriginsFromEnv(env), true, on);
      assert.equal(isAllowedGameReturnUrl(back, env), true, on);
      assert.equal(allowGameDeviceOrigin(lan, env), true, on);
      assert.equal(cloudOriginAllowed(lan, env), true, on);
    }
    assert.equal(allowLanOriginsFromEnv(EMPTY), true);
    assert.equal(isAllowedGameReturnUrl(back, EMPTY), true);
  });

  it("forbids private-LAN origins again when FF_ALLOW_LAN_ORIGINS is off", () => {
    for (const off of ["0", "false", "no", "off", " FALSE ", "Off"]) {
      const env = { FF_ALLOW_LAN_ORIGINS: off };
      assert.equal(allowLanOriginsFromEnv(env), false, off);
      assert.equal(isLanHttpOrigin(lan), true, off);
      assert.equal(isAllowedGameReturnUrl(back, env), false, off);
      assert.equal(allowGameDeviceOrigin(lan, env), false, off);
      assert.equal(cloudOriginAllowed(lan, env), false, off);
      // Loopback and explicitly listed origins keep working.
      assert.equal(isAllowedGameReturnUrl("http://127.0.0.1:8765/", env), true, off);
      assert.equal(allowGameDeviceOrigin("http://127.0.0.1:8765", env), true, off);
      assert.equal(cloudOriginAllowed("http://127.0.0.1:8765", env), true, off);
      const listed = { ...env, FF_GAME_DEVICE_ORIGINS: lan };
      assert.equal(isAllowedGameReturnUrl(back, listed), true, off);
      assert.equal(allowGameDeviceOrigin(lan, listed), true, off);
      assert.equal(cloudOriginAllowed(lan, listed), true, off);
    }
  });

  it("allows configured RFC1918 ranges, but not public HTTP or other local networks", () => {
    for (const origin of [lan, "http://10.0.0.1:9000", "http://172.16.0.1", "http://172.31.255.255"]) {
      assert.equal(validPortalCorsOrigin(origin), null);
      assert.equal(validPortalCorsOrigin(origin, { allowLan: true }), origin);
      for (const name of ["FF_GAME_DEVICE_ORIGINS", "FF_CLOUD_CORS_ORIGINS"]) {
        assert.equal(cloudCorsOriginsFromEnv({ [name]: origin }).has(origin), true);
      }
      assert.equal(cloudCorsOriginsFromEnv({ FF_PUBLIC_ORIGIN: origin }).has(origin), false);
      assert.equal(isAllowedGameReturnUrl(`${origin}/`, [origin]), true);
    }
    for (const origin of ["http://public.example", "http://warmersun.com", "http://8.8.8.8", "http://172.15.255.255",
      "http://172.32.0.1", "http://169.254.0.1", "http://100.64.0.1", "http://[fc00::1]", "http://router.local"]) {
      assert.equal(gameDeviceOriginsFromEnv({ FF_GAME_DEVICE_ORIGINS: origin }).includes(origin), false, origin);
      assert.equal(cloudCorsOriginsFromEnv({ FF_GAME_DEVICE_ORIGINS: origin, FF_CLOUD_CORS_ORIGINS: origin }).has(origin), false, origin);
      assert.equal(isAllowedGameReturnUrl(`${origin}/`, [origin]), false, origin);
    }
  });

  it("rejects credentials and malformed origins/URLs even when supplied as extras", () => {
    for (const origin of [`${lan}/path`, `${lan}/?x=1`, `${lan}/#x`, `${lan}/x/..`,
      "http://user:pass@192.168.1.140:8765", "http://@192.168.1.140:8765", "http:/192.168.1.140:8765",
      "http://0xc0a8018c:8765", "http://192.168.001.140:8765", "http://192.168.1.140:99999",
      "http://192.168.1.140:8765\\", "javascript:alert(1)"]) {
      assert.equal(normalizeGameDeviceOrigin(origin), "", origin);
      assert.equal(validPortalCorsOrigin(origin, { allowLan: true }), null, origin);
      assert.equal(isLanHttpOrigin(origin), false, origin);
      assert.equal(cloudOriginAllowed(origin, EMPTY), false, origin);
      assert.equal(allowGameDeviceOrigin(origin, EMPTY), false, origin);
      assert.equal(gameDeviceOriginsFromEnv({ FF_GAME_DEVICE_ORIGINS: origin }).includes(lan), false, origin);
    }
    for (const href of ["http:/192.168.1.140:8765/", "http://user@192.168.1.140:8765/",
      "http://@192.168.1.140:8765/", "http://192.168.1.140:8765\\evil", "http://192.168.1.140:8765/%zz",
      "http://192.168.1.140:8765/\n", "http://0xc0a8018c:8765/", "ftp://192.168.1.140:8765/", "//192.168.1.140:8765/"]) {
      assert.equal(isAllowedGameReturnUrl(href, [lan]), false, href);
      assert.equal(signInUrlWithReturn(base, href, [lan]), base, href);
    }
    // A malformed extra is never a configured origin; the LAN default still
    // applies to well-formed private-LAN returns.
    assert.equal(gameDeviceOriginsFromEnv({ FF_GAME_DEVICE_ORIGINS: `${lan}/path` }).includes(`${lan}/path`), false);
    assert.equal(isAllowedGameReturnUrl("https://public.example/", [`${lan}/path`]), false);
    assert.equal(isAllowedGameReturnUrl(back, [`${lan}/path`]), true);
  });
});

describe("portalPublicOrigin", () => {
  it("defaults to the hosted Neon Function portal", () => {
    assert.equal(portalPublicOrigin({}), CLOUD_PORTAL_ORIGIN);
    assert.equal(CLOUD_PORTAL_ORIGIN, "https://br-wild-surf-b4jds6qu-cloudapi.compute.c-6.us-east-2.aws.neon.tech");
  });

  it("honors FF_PUBLIC_ORIGIN without a trailing slash", () => {
    assert.equal(
      portalPublicOrigin({ FF_PUBLIC_ORIGIN: "http://127.0.0.1:9000/" }),
      "http://127.0.0.1:9000"
    );
  });
});

describe("cardPublicBaseUrl", () => {
  it("defaults to cloud.warmersun.com", () => {
    assert.equal(cardPublicBaseUrl({}), "https://cloud.warmersun.com");
    assert.equal(CARD_PUBLIC_BASE_DEFAULT, "https://cloud.warmersun.com");
  });

  it("never follows DATABASE_URL or the portal Function host", () => {
    const env = {
      DATABASE_URL: "postgresql://u:p@ep-fake-123.us-east-2.aws.neon.tech/db?sslmode=require",
      FF_PUBLIC_ORIGIN: CLOUD_PORTAL_ORIGIN,
    };
    assert.equal(cardPublicBaseUrl(env), "https://cloud.warmersun.com");
  });

  it("honors FF_CARD_PUBLIC_BASE_URL and trims trailing slashes", () => {
    assert.equal(cardPublicBaseUrl({ FF_CARD_PUBLIC_BASE_URL: "https://cards.example.org//" }), "https://cards.example.org");
    assert.equal(cardPublicBaseUrl({ FF_CARD_PUBLIC_BASE_URL: " http://127.0.0.1:8766/ " }), "http://127.0.0.1:8766");
  });

  it("ignores a value that is not an http(s) URL", () => {
    assert.equal(cardPublicBaseUrl({ FF_CARD_PUBLIC_BASE_URL: "cloud.warmersun.com" }), "https://cloud.warmersun.com");
    assert.equal(cardPublicBaseUrl({ FF_CARD_PUBLIC_BASE_URL: "postgresql://x@y/z" }), "https://cloud.warmersun.com");
  });
});

describe("normalizeGameDeviceOrigin", () => {
  it("keeps scheme+host+port and strips a trailing slash", () => {
    assert.equal(normalizeGameDeviceOrigin("https://PLAY.EXAMPLE:443/"), "https://play.example");
    assert.equal(
      normalizeGameDeviceOrigin("https://futureforge.xantu-chickadee.ts.net/"),
      "https://futureforge.xantu-chickadee.ts.net"
    );
    assert.equal(
      normalizeGameDeviceOrigin("http://127.0.0.1:8765"),
      "http://127.0.0.1:8765"
    );
  });

  it("rejects paths, credentials, and non-http", () => {
    assert.equal(normalizeGameDeviceOrigin("https://evil.example/forge"), "");
    assert.equal(normalizeGameDeviceOrigin("https://user:pass@evil.example"), "");
    assert.equal(normalizeGameDeviceOrigin("javascript:alert(1)"), "");
    assert.equal(normalizeGameDeviceOrigin(""), "");
  });
});

describe("gameDeviceOriginsFromEnv", () => {
  it("defaults to loopback only", () => {
    assert.deepEqual(gameDeviceOriginsFromEnv(EMPTY), [...GAME_DEVICE_ORIGINS]);
  });

  it("appends extras without replacing loopback", () => {
    assert.deepEqual(
      gameDeviceOriginsFromEnv({
        FF_GAME_DEVICE_ORIGINS:
          "https://futureforge.xantu-chickadee.ts.net/, https://evil.example/path, http://localhost:8765",
      }),
      [
        "http://127.0.0.1:8765",
        "http://localhost:8765",
        "https://futureforge.xantu-chickadee.ts.net",
      ]
    );
  });
});

describe("allowGameDeviceOrigin", () => {
  it("allows loopback game origins only by default", () => {
    assert.equal(allowGameDeviceOrigin("http://127.0.0.1:8765", EMPTY), true);
    assert.equal(allowGameDeviceOrigin("http://localhost:8765", EMPTY), true);
    assert.equal(allowGameDeviceOrigin("https://cloud.warmersun.com", EMPTY), false);
    assert.equal(allowGameDeviceOrigin("https://evil.example", EMPTY), false);
    assert.equal(allowGameDeviceOrigin("", EMPTY), false);
  });

  it("allows Funnel extras from FF_GAME_DEVICE_ORIGINS", () => {
    const env = {
      FF_GAME_DEVICE_ORIGINS: "https://futureforge.xantu-chickadee.ts.net",
    };
    assert.equal(
      allowGameDeviceOrigin("https://futureforge.xantu-chickadee.ts.net", env),
      true
    );
    assert.equal(
      allowGameDeviceOrigin("https://futureforge.xantu-chickadee.ts.net/", env),
      true
    );
    assert.equal(allowGameDeviceOrigin("https://other.ts.net", env), false);
    assert.equal(allowGameDeviceOrigin("http://127.0.0.1:8765", env), true);
  });
});

describe("isAllowedGameReturnUrl", () => {
  it("allows loopback, Funnel, and warmersun hop", () => {
    assert.equal(isAllowedGameReturnUrl("http://127.0.0.1:8765/?q=lesson-1", EMPTY), true);
    assert.equal(
      isAllowedGameReturnUrl("https://futureforge.xantu-chickadee.ts.net/?q=lesson-1"),
      true
    );
    assert.equal(isAllowedGameReturnUrl("https://warmersun.com/forge/?q=lesson-1"), true);
    assert.equal(isAllowedGameReturnUrl("https://cloud.warmersun.com/signin"), true);
  });

  it("rejects open redirects", () => {
    assert.equal(isAllowedGameReturnUrl("https://evil.example/?q=x"), false);
    assert.equal(isAllowedGameReturnUrl("javascript:alert(1)"), false);
    assert.equal(isAllowedGameReturnUrl(""), false);
    assert.equal(isAllowedGameReturnUrl("https://user:pass@127.0.0.1:8765/"), false);
  });
});

describe("signInUrlWithReturn", () => {
  it("appends return only when the bounce is allowed", () => {
    const base = "https://cloud.warmersun.com/signin?device=abc";
    const back = "https://futureforge.xantu-chickadee.ts.net/?q=lesson-1";
    assert.equal(
      signInUrlWithReturn(base, back),
      `${base}&return=${encodeURIComponent(back)}`
    );
    assert.equal(signInUrlWithReturn(base, "https://evil.example/"), base);
  });
});
