/**
 * Grok Voice roster for the co-inventor call.
 * Speech-to-speech built-ins. Ids are case-insensitive on the wire.
 */

export const VOICE_DEFAULT_ID = "eve";

export const VOICE_CHOICES = [
  { id: "eve", label: "Eve" },
  { id: "ara", label: "Ara" },
  { id: "rex", label: "Rex" },
  { id: "sal", label: "Sal" },
  { id: "leo", label: "Leo" },
];

/**
 * @param {unknown} raw
 * @returns {string} a known id, or "" when missing or not in the roster
 */
export function knownVoiceId(raw) {
  const id = String(raw ?? "").trim().toLowerCase();
  if (!id) return "";
  return VOICE_CHOICES.some((v) => v.id === id) ? id : "";
}
