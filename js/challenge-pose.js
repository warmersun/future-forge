/**
 * Offline pose-challenge fallback — one critic, speech + question.
 */

/**
 * @param {string|{id?: string}} angle
 * @param {{ place?: string, inventionName?: string }} [opts]
 * @returns {{ speech: string, question: string }}
 */
export function localPose(angle, opts = {}) {
  const id = typeof angle === "string" ? angle : angle?.id || "";
  const place = opts.place || "here";
  const name = opts.inventionName || "this invention";
  if (id === "nature") {
    return {
      speech: `Mother Nature, ${place}: “${name} still runs on energy, materials, and waste. Storms, heat, and scarcity do not negotiate with your pitch.”`,
      question:
        "What breaks first when the natural world pushes back — and how does the design absorb a bad week?",
    };
  }
  if (id === "ethicist") {
    return {
      speech: `The Ethicist, ${place}: “${name} forces a choice you cannot optimize away. Someone’s dignity, privacy, or opportunity is on the line — and both sides have a point.”`,
      question:
        "Name the hardest ethical tradeoff. Who is harmed either way — and what constraint do you refuse to cross?",
    };
  }
  if (id === "stakeholder") {
    return {
      speech: `The Stakeholder, ${place}: “I am the mayor, the clinic board, and the neighborhood meeting. Someone must sign, fund, and defend ${name} in public — or it dies as a pilot photo.”`,
      question:
        "Who must say yes, who pays year 1 and year 5, and how do you win public support without pricing people out?",
    };
  }
  return {
    speech: `Moloch, ${place}: “There’s no way ${name} holds. Free-riders keep old habits while careful people pay. The race to the bottom eats good design — that is how the system plays.”`,
    question:
      "What stops defection when neighbors or vendors can freeride — name the game mechanic you change?",
  };
}
