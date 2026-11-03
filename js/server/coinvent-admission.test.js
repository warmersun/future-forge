import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { admissionKey, createAdmission } from "./coinvent-admission.mjs";

describe("co-invent admission", () => {
  it("keys a verified user and ignores a caller session id", () => {
    assert.equal(admissionKey({ userId: "user_1", ip: "1.2.3.4" }), "user:user_1");
    assert.equal(admissionKey({ userId: "", ip: "1.2.3.4" }), "ip:1.2.3.4");
    assert.equal(admissionKey({}), "local");
    assert.equal(admissionKey({ userId: "user_1", clientSessionId: "spoof" }), "user:user_1");
  });

  it("allows one replacement while an older attempt is still held", () => {
    const gate = createAdmission({ limit: 2 });
    const first = gate.tryAcquire("user:a");
    const second = gate.tryAcquire("user:a");
    const third = gate.tryAcquire("user:a");
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(third.ok, false);
    assert.equal(third.error, "still_finishing");
    assert.match(third.message, /still finishing/);
    first.release();
    first.release();
    const again = gate.tryAcquire("user:a");
    assert.equal(again.ok, true);
    again.release();
    second.release();
    assert.equal(gate.count("user:a"), 0);
  });

  it("does not let a spoofed session share a verified user's slots", () => {
    const gate = createAdmission({ limit: 2 });
    gate.tryAcquire(admissionKey({ userId: "user_1" }));
    gate.tryAcquire(admissionKey({ userId: "user_1" }));
    const spoof = gate.tryAcquire(admissionKey({ userId: "user_1", clientSessionId: "other" }));
    const other = gate.tryAcquire(admissionKey({ ip: "9.9.9.9" }));
    assert.equal(spoof.ok, false);
    assert.equal(other.ok, true);
  });

  it("gives unsigned room seats their own keys", () => {
    const host = admissionKey({ seatId: "seat-host" });
    const guest = admissionKey({ seatId: "seat-guest" });
    assert.equal(host, "seat:seat-host");
    assert.notEqual(host, guest);
    assert.notEqual(host, "local");
    assert.equal(admissionKey({ userId: "user_1", seatId: "seat-host" }), "user:user_1");
    assert.equal(admissionKey({ userId: "user_1", seatId: "seat-guest" }), "user:user_1");
    assert.equal(admissionKey({ clientSessionId: "spoof" }), "local");
    assert.equal(admissionKey({ seatId: "seat-host", clientSessionId: "spoof" }), "seat:seat-host");
    const gate = createAdmission({ limit: 2 });
    assert.equal(gate.tryAcquire(host).ok, true);
    assert.equal(gate.tryAcquire(host).ok, true);
    assert.equal(gate.tryAcquire(host).ok, false);
    assert.equal(gate.tryAcquire(guest).ok, true);
  });
});
