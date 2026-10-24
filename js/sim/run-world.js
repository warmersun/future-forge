/**
 * One run-scoped world. Solo, room, and hotseat must not share a leftover bank.
 */
import { pinPredictionsBank, resolveScenarioPremise } from "../companion-context.js";
import { validatePredictionsBank } from "./world-foresight.js";

/**
 * @param {{ packageRef?: object|null, bank?: object|null, trust?: string, questId?: string }} [input]
 */
export function createRunWorld(input = {}) {
  const bank = input.bank && input.bank.id ? structuredClone(input.bank) : null;
  return {
    packageRef: input.packageRef ? structuredClone(input.packageRef) : null,
    bank,
    trust: input.trust || (input.packageRef ? "official" : "legacy"),
    questId: input.questId || "",
  };
}

export function emptyRunWorld() {
  return createRunWorld();
}

/** Use a resolved package bank; the process bank is only for explicit legacy play. */
export function prepareRunWorld(mission, opts = {}) {
  const fail = (error) => ({ ok: false, error, message: "This Quest's saved or packaged world cannot be resolved. It has not been replaced with the default calendar." });
  if (mission?.predictionBankId || mission?.packageRef) {
    const world = mission.runWorld;
    const ref = mission.packageRef || world?.packageRef;
    const idRe = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
    if (!ref || !idRe.test(ref.packageId) || !idRe.test(ref.questId) ||
        !/^sha256:[0-9a-f]{64}$/.test(ref.revision) || ref.questId !== mission.id) {
      return fail("package_reference_forbidden");
    }
    const worldRef = world?.packageRef;
    if (!worldRef || ref.packageId !== worldRef.packageId || ref.revision !== worldRef.revision ||
        ref.questId !== worldRef.questId) return fail("package_reference_forbidden");
    const checked = validatePredictionsBank(world?.bank);
    if (!checked.ok || checked.bank.id !== mission.predictionBankId) return fail("package_dependency_missing");
    const premise = resolveScenarioPremise(mission.companion, checked.bank, opts.year ?? mission.startYear);
    if (!premise.ok) return fail("package_dependency_missing");
    return { ok: true, world: createRunWorld({ ...world, bank: checked.bank }), premise: premise.premise };
  }
  // pinPredictionsBank enforces the same legacy recovery contract for direct
  // browser callers and server snapshot reads, including absent saved banks.
  const pinned = pinPredictionsBank(mission?.companion, opts);
  if (!pinned.ok) return pinned;
  return { ok: true, world: createRunWorld({ bank: pinned.bank, trust: "legacy", questId: mission?.id || "" }), premise: pinned.premise };
}

/**
 * Prefer the run world. A legacy mission snapshot is used only when the run
 * has no package binding.
 * @param {{ runWorld?: object|null, mission?: object|null, pinnedPredictionsBank?: object|null }} state
 */
export function bankForRun(state) {
  const run = state?.runWorld;
  if (run?.packageRef) return run.bank || null;
  if (run?.bank?.id) return run.bank;
  if (state?.pinnedPredictionsBank?.id) return state.pinnedPredictionsBank;
  const carried = state?.mission?.pinnedPredictionsBank;
  if (carried?.id && carried.id !== "empty") return carried;
  return null;
}

/**
 * Drop private reflection and the previous world before entering another mode.
 * @param {object} state
 */
export function resetRunWorld(state) {
  if (!state || typeof state !== "object") return state;
  state.runWorld = emptyRunWorld();
  state.pinnedPredictionsBank = null;
  if (state.mission && typeof state.mission === "object") {
    delete state.mission.pinnedPredictionsBank;
    delete state.mission.reflection;
  }
  return state;
}
