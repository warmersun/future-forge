import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function mockRequest(method, url) {
  return { method, url, headers: {} };
}

function mockResponse() {
  let statusCode = 200;
  let headers = {};
  let body = Buffer.alloc(0);
  let ended = false;

  return {
    writeHead(code, hdrs) {
      statusCode = code;
      if (hdrs) headers = { ...headers, ...hdrs };
    },
    end(data) {
      if (data) body = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
      ended = true;
    },
    result() {
      return { statusCode, headers, body: body.toString(), bodyLength: body.length, ended };
    }
  };
}

function createServeBrandAsset() {
  const BRAND_IMAGE_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };

  return function serveBrandAsset(req, res, pathOnly) {
    let cleanPath;
    try {
      cleanPath = String(pathOnly).split("?")[0].split("#")[0];
      cleanPath = decodeURIComponent(cleanPath);
    } catch {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Forbidden");
    }

    cleanPath = path.posix.normalize(cleanPath.replace(/\\/g, "/"));
    if (cleanPath.includes("..") || !cleanPath.startsWith("/assets/brand/")) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Forbidden");
    }

    const ext = path.extname(cleanPath).toLowerCase();
    if (!BRAND_IMAGE_MIME[ext]) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Forbidden");
    }

    const relPath = cleanPath.slice(1);
    const fullPath = path.resolve(ROOT, relPath);

    const expectedPrefix = path.resolve(ROOT, "assets", "brand") + path.sep;
    if (!fullPath.startsWith(expectedPrefix)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Forbidden");
    }

    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Not found");
      }
      if (req.method === "HEAD") {
        res.writeHead(200, {
          "Content-Type": BRAND_IMAGE_MIME[ext],
          "Content-Length": data.length,
          "Cache-Control": "public, max-age=86400",
        });
        return res.end();
      }
      res.writeHead(200, {
        "Content-Type": BRAND_IMAGE_MIME[ext],
        "Content-Length": data.length,
        "Cache-Control": "public, max-age=86400",
      });
      res.end(data);
    });
  };
}

test("brand asset route serves ff-by-warmersun-transparent-bg.png with correct content-type", (t, done) => {
  const serveBrandAsset = createServeBrandAsset();
  const req = mockRequest("GET", "/assets/brand/ff-by-warmersun-transparent-bg.png");
  const res = mockResponse();
  
  serveBrandAsset(req, res, "/assets/brand/ff-by-warmersun-transparent-bg.png");
  
  setTimeout(() => {
    const result = res.result();
    assert.equal(result.statusCode, 200, "should return 200");
    assert.equal(result.headers["Content-Type"], "image/png", "should have image/png content-type");
    assert.ok(result.bodyLength > 0, "should have image data");
    assert.ok(result.ended, "response should be ended");
    done();
  }, 50);
});

test("brand asset route serves ff-mark-footer.png with correct content-type", (t, done) => {
  const serveBrandAsset = createServeBrandAsset();
  const req = mockRequest("GET", "/assets/brand/ff-mark-footer.png");
  const res = mockResponse();
  
  serveBrandAsset(req, res, "/assets/brand/ff-mark-footer.png");
  
  setTimeout(() => {
    const result = res.result();
    assert.equal(result.statusCode, 200, "should return 200");
    assert.equal(result.headers["Content-Type"], "image/png", "should have image/png content-type");
    assert.ok(result.bodyLength > 0, "should have image data");
    assert.ok(result.ended, "response should be ended");
    done();
  }, 50);
});

test("brand asset route supports HEAD requests", (t, done) => {
  const serveBrandAsset = createServeBrandAsset();
  const req = mockRequest("HEAD", "/assets/brand/ff-mark-footer.png");
  const res = mockResponse();
  
  serveBrandAsset(req, res, "/assets/brand/ff-mark-footer.png");
  
  setTimeout(() => {
    const result = res.result();
    assert.equal(result.statusCode, 200, "should return 200");
    assert.equal(result.headers["Content-Type"], "image/png", "should have image/png content-type");
    assert.equal(result.bodyLength, 0, "HEAD should have no body");
    assert.ok(result.ended, "response should be ended");
    done();
  }, 50);
});

test("brand asset route rejects path traversal attempt with ..", (t, done) => {
  const serveBrandAsset = createServeBrandAsset();
  const req = mockRequest("GET", "/assets/brand/../../.env");
  const res = mockResponse();
  
  serveBrandAsset(req, res, "/assets/brand/../../.env");
  
  setTimeout(() => {
    const result = res.result();
    assert.equal(result.statusCode, 403, "should return 403 Forbidden");
    assert.match(result.body, /Forbidden/);
    assert.ok(result.ended, "response should be ended");
    done();
  }, 50);
});

test("brand asset route rejects non-brand asset path", (t, done) => {
  const serveBrandAsset = createServeBrandAsset();
  const req = mockRequest("GET", "/assets/../package.json");
  const res = mockResponse();
  
  serveBrandAsset(req, res, "/assets/../package.json");
  
  setTimeout(() => {
    const result = res.result();
    assert.equal(result.statusCode, 403, "should return 403 Forbidden");
    assert.match(result.body, /Forbidden/);
    assert.ok(result.ended, "response should be ended");
    done();
  }, 50);
});

test("brand asset route rejects non-image file extensions", (t, done) => {
  const serveBrandAsset = createServeBrandAsset();
  const req = mockRequest("GET", "/assets/brand/malicious.mjs");
  const res = mockResponse();
  
  serveBrandAsset(req, res, "/assets/brand/malicious.mjs");
  
  setTimeout(() => {
    const result = res.result();
    assert.equal(result.statusCode, 403, "should return 403 Forbidden");
    assert.match(result.body, /Forbidden/);
    assert.ok(result.ended, "response should be ended");
    done();
  }, 50);
});

test("brand asset route returns 404 for non-existent image", (t, done) => {
  const serveBrandAsset = createServeBrandAsset();
  const req = mockRequest("GET", "/assets/brand/nonexistent.png");
  const res = mockResponse();
  
  serveBrandAsset(req, res, "/assets/brand/nonexistent.png");
  
  setTimeout(() => {
    const result = res.result();
    assert.equal(result.statusCode, 404, "should return 404");
    assert.match(result.body, /Not found/);
    assert.ok(result.ended, "response should be ended");
    done();
  }, 50);
});

test("brand asset route sets appropriate cache headers", (t, done) => {
  const serveBrandAsset = createServeBrandAsset();
  const req = mockRequest("GET", "/assets/brand/ff-mark-footer.png");
  const res = mockResponse();
  
  serveBrandAsset(req, res, "/assets/brand/ff-mark-footer.png");
  
  setTimeout(() => {
    const result = res.result();
    assert.equal(result.statusCode, 200, "should return 200");
    assert.match(result.headers["Cache-Control"], /max-age=86400/, "should set 24-hour cache");
    assert.ok(result.ended, "response should be ended");
    done();
  }, 50);
});
