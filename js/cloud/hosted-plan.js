/**
 * Hosted app (ff.warmersun.com): a signed-in session needs plan `cloud`.
 * A catalog lesson may continue with sign-in alone. Self-host and unsigned
 * visitors are unchanged.
 *
 * @param {{ cloudAi?: boolean, signedIn?: boolean, entitled?: boolean, lesson?: boolean }} input
 * @returns {boolean} true when this session may stay in the app
 */
export function hostedSessionAllowed(input = {}) {
  if (!input.cloudAi) return true;
  if (!input.signedIn) return true;
  if (input.entitled) return true;
  return Boolean(input.lesson);
}
