/**
 * One open layer at a time. Claiming a non-modal overlay asks the tech modal to close.
 * @param {string} kind
 */
export function claimOverlay(kind) {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent("ff-overlay-claim", { detail: { kind: String(kind || "") } })
  );
}
