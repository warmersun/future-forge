/**
 * Lean /api/co-invent context for judge/eval modes.
 * Never includes inventionName — omit the key; do not send null.
 */

/**
 * Draft invent fields for conversational co-invent context.
 * Hex workshop has no invention name/how/impact — those live on tiles / islands.
 * @param {{ hexInvent?: boolean, inventionName?: *, inventionHow?: *, inventionImpact?: * }} ctx
 */
export function inventDraftFieldsForContext(ctx = {}) {
  if (ctx.hexInvent) return {};
  return {
    inventionName: ctx.inventionName,
    inventionHow: ctx.inventionHow,
    inventionImpact: ctx.inventionImpact,
  };
}

/**
 * @param {string} mode
 * @param {object} [extra]
 * @param {object} [snap]
 * @param {number} [snap.year]
 * @param {string} [snap.place]
 * @param {string|null} [snap.grounding]
 * @param {string} [snap.missionTitle]
 * @param {string} [snap.missionScene]
 * @param {string} [snap.inventionHow]
 * @param {string} [snap.inventionImpact]
 * @param {string[]} [snap.selectedTechIds]
 * @param {(ids: string[]) => object[]} [snap.techsForIds]
 * @param {() => object[]} [snap.selectedTechs]
 * @param {object|null} [snap.challenge]
 */
export function leanCoInventContext(mode, extra = {}, snap = {}) {
  const rest = { ...extra };
  delete rest.inventionName;
  const grounding =
    rest.grounding !== undefined ? rest.grounding : snap.grounding ?? null;
  const year = rest.year ?? snap.year;
  const place = rest.place ?? snap.place;
  const scene = String(snap.missionScene || "").slice(0, 600);
  const base = {
    year,
    place,
    grounding,
    missionTitle: rest.missionTitle ?? (snap.missionTitle || ""),
    missionScene: rest.missionScene ?? scene,
    ...rest,
  };

  if (mode === "score-pathway") {
    return {
      ...base,
      challenge: snap.challenge || null,
    };
  }

  if (mode === "idea-sparks") {
    const focusId = rest.focusTechId || (snap.selectedTechIds || [])[0] || null;
    const techs =
      typeof snap.techsForIds === "function"
        ? snap.techsForIds(focusId ? [focusId] : [])
        : [];
    return {
      ...base,
      focusTechId: focusId,
      availableTechs: techs,
    };
  }

  if (mode === "assess-feasibility") {
    const ids = rest.selectedTechIds || [...(snap.selectedTechIds || [])];
    const techs =
      typeof snap.techsForIds === "function" ? snap.techsForIds(ids) : [];
    const out = {
      year,
      place,
      grounding,
      missionTitle: rest.missionTitle ?? (snap.missionTitle || ""),
      missionScene: rest.missionScene ?? scene,
      inventionHow: rest.inventionHow ?? snap.inventionHow,
      selectedTechIds: ids,
      availableTechs: techs,
      priorTiming: rest.priorTiming || null,
    };
    if (Object.prototype.hasOwnProperty.call(rest, "inventionImpact")) {
      const impact = rest.inventionImpact;
      if (String(impact || "").trim()) out.inventionImpact = impact;
    }
    return out;
  }

  const selected =
    typeof snap.selectedTechs === "function" ? snap.selectedTechs() : [];
  return {
    ...base,
    inventionHow: rest.inventionHow ?? snap.inventionHow,
    inventionImpact: rest.inventionImpact ?? snap.inventionImpact,
    selectedTechIds: rest.selectedTechIds || [...(snap.selectedTechIds || [])],
    availableTechs: selected,
    challenge: snap.challenge || null,
  };
}
