import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectClaimStretch, hasPilotLanguage } from "./data.js";

const softTech = { id: "quantum", name: "Quantum", readyYear: 2032, curve: "early" };
const mature = { id: "solar", name: "Solar", readyYear: 2026, curve: "mature" };

describe("claim stretch locale awareness", () => {
  it("recognizes Hungarian pilot language", () => {
    assert.equal(hasPilotLanguage("limited pilot with partners", "en"), true);
    assert.equal(
      hasPilotLanguage(
        "Korlátozott próbaüzem partnerrel és emberi felügyelettel a klinikán.",
        "hu"
      ),
      true
    );
    assert.equal(
      hasPilotLanguage("Mindenki automatikusan kap robotot.", "hu"),
      false
    );
  });

  it("does not falsely yellow short HU pilot text on soft-horizon stack", () => {
    const how =
      "Kísérleti próbaüzem partner klinikával, felügyelt MI-segéd a triage-hoz ebben a kerületben.";
    const r = detectClaimStretch(how, [softTech], 2026, "hu");
    assert.equal(r.level, "green");
    assert.match(r.reason, /pilot|közeli|illeszked/i);
  });

  it("flags HU routine city-wide claims without pilot framing", () => {
    const how =
      "A rendszer városszerte, minden lakos számára teljesen automatikusan fut, mindig, garanciával.";
    const r = detectClaimStretch(how, [softTech], 2026, "hu");
    assert.ok(r.level === "yellow" || r.level === "red");
  });

  it("keeps English pilot path working", () => {
    const how =
      "A limited pilot with clinical partners and human-in-the-loop oversight for this clinic.";
    const r = detectClaimStretch(how, [softTech], 2026, "en");
    assert.equal(r.level, "green");
  });

  it("green for mature stack ordinary claims", () => {
    const how =
      "Solar roofs and battery packs power the clinic pumps overnight with local maintenance crews.";
    const r = detectClaimStretch(how, [mature], 2026, "en");
    assert.equal(r.level, "green");
  });
});
