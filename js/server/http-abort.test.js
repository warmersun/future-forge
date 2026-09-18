/**
 * HTTP abort signal — no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { abortSignalFromHttp } from "./http-abort.mjs";

describe("abortSignalFromHttp", () => {
  it("aborts immediately when the request was already aborted", () => {
    const req = { aborted: true };
    const signal = abortSignalFromHttp(req, {});
    assert.equal(signal.aborted, true);
  });

  it("aborts when the client hangs up before the response ends", () => {
    const req = new EventEmitter();
    const res = new EventEmitter();
    res.writableEnded = false;
    const signal = abortSignalFromHttp(req, res);
    assert.equal(signal.aborted, false);
    res.emit("close");
    assert.equal(signal.aborted, true);
  });

  it("does not abort when the response finished normally", () => {
    const req = new EventEmitter();
    const res = new EventEmitter();
    res.writableEnded = true;
    const signal = abortSignalFromHttp(req, res);
    res.emit("close");
    assert.equal(signal.aborted, false);
  });

  it("aborts on IncomingMessage aborted", () => {
    const req = new EventEmitter();
    const res = new EventEmitter();
    res.writableEnded = false;
    const signal = abortSignalFromHttp(req, res);
    req.emit("aborted");
    assert.equal(signal.aborted, true);
  });
});
