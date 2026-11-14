import { resolveTourStep, queryTourTarget, tourTargetVisible } from "./guided-tour.js?v=focused-workshop-1";

/** Calendar explanations read from the active mode and Quest, not fixed UI costs. */
export function workshopTimeConsequences({ multiplayer = false, waitYears = 2, pressureRise = {} } = {}) {
  const rises = Object.values(pressureRise).some((n) => Number(n) > 0);
  const pressure = rises ? "applies this Quest’s yearly crisis rises" : "does not raise this Quest’s crisis meters through time";
  return {
    endTurn: multiplayer
      ? "End turn passes to the next seat and refills Attention. The calendar follows the room’s round rules; Budget does not refill."
      : `End turn advances one year, refills Attention, and ${pressure}. Budget does not refill.`,
    wait: `Look Ahead lets you examine capability before committing. Wait advances ${Number(waitYears) || 2} years and ${pressure}${multiplayer ? "; it ends your seat-turn while other seats keep their own year" : "; unspent Attention is burned"}.`,
  };
}

/** Passive presentation. The only navigation entry is the person's reveal click.
 * No game action, resource spend, or provider API is accepted by this controller.
 */
export function createWorkshopGuidance({ document: doc, snapshot, reveal, returnToBoard, findTarget = queryTourTarget } = {}) {
  let latest = null;
  let generation = 0;
  let fallback = false;
  let boundButton = null;
  const node = (id) => doc?.querySelector?.(`#${id}`);
  function bind() {
    const button = node("workshop-guidance-reveal");
    if (button && button !== boundButton) {
      boundButton = button;
      button.addEventListener("click", () => { void show(); });
    }
    return button;
  }
  function refresh(raw, { suspended = false } = {}) {
    if (latest?.runKey !== raw?.runKey || latest?.seatKey !== raw?.seatKey || latest?.screen !== raw?.screen) generation++;
    latest = raw;
    const root = node("workshop-guidance");
    const button = bind();
    if (!root) return null;
    root.hidden = suspended || raw?.screen !== "workshop";
    if (suspended || raw?.screen !== "workshop") return null;
    fallback = false;
    const task = resolveTourStep(raw);
    const title = node("workshop-guidance-title");
    const body = node("workshop-guidance-body");
    if (title?.textContent !== task.title && title) title.textContent = task.title;
    if (body?.textContent !== task.explanation && body) body.textContent = task.explanation;
    if (button) {
      button.disabled = !task.availability.available;
      button.textContent = "Show me where";
      button.title = task.availability.reason || "Open the relevant working surface";
    }
    return task;
  }
  function missing() {
    fallback = true;
    const body = node("workshop-guidance-body");
    if (body) body.textContent = "That control is no longer available here. Return to the Board to continue; your work is kept.";
    const button = bind();
    if (button) { button.disabled = false; button.textContent = "Back to Board"; }
  }
  async function show() {
    if (fallback) { returnToBoard?.(); return; }
    const current = snapshot?.() || latest;
    if (!current || current.screen !== "workshop") return false;
    const task = resolveTourStep(current);
    if (!task.availability.available) { refresh(current); return false; }
    const token = ++generation;
    try { await reveal?.(task); } catch { if (token === generation) missing(); return false; }
    if (token !== generation) return false;
    const after = snapshot?.() || latest;
    if (after?.runKey !== current.runKey || after?.seatKey !== current.seatKey || after?.screen !== current.screen) return false;
    const target = findTarget(task);
    if (!tourTargetVisible(target)) { missing(); return false; }
    target.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    if (!target.matches?.("button, input, textarea, select, a[href], [tabindex]")) target.setAttribute?.("tabindex", "-1");
    target.focus?.({ preventScroll: true });
    return true;
  }
  return { refresh, reveal: show, invalidate: () => { generation++; latest = null; } };
}
