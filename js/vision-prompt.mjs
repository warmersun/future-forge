/**
 * Future Vision — clean image prompt pipeline
 *
 * Layer 1: World Card  (frozen place + title + scenario → visualSetting)
 * Layer 2: Shot Brief  (what is happening this frame; grounded in world)
 * Layer 3: Compose     (short positive prompt for Imagine)
 *
 * Design rule: image prompts describe only what should be visible.
 * Never list anti-geographies ("no marina") — models paint named tokens.
 */

const STAGE_TONE = {
  present: "present-day realism",
  prototype: "early experimental equipment appearing locally",
  transition: "local systems scaling up",
  transformed: "everyday future of this same place",
};

/** Instruction-style patterns that must not enter Imagine prompts */
const PROMPT_POLLUTION_RE =
  /\b(forbidden|do not show|don't show|must not|never show|no marina|no harbor|seaside marina|cape canaveral|florida-style|locale lock|highest priority|outranks)\b/i;

export function clipText(s, max = 600) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function extractMissionWorld(body) {
  const place = clipText(body.place || body.challenge?.place, 200);
  const title = clipText(body.challenge?.title, 200);
  const scene = clipText(
    body.challenge?.scene || body.challenge?.problem || body.challenge?.prompt,
    1100
  );
  const year = body.year || null;
  const missionId = String(body.challenge?.id || "").slice(0, 80);
  return { place, title, scene, year, missionId };
}

export function worldKey(world) {
  return [world.missionId, world.place, world.title, world.scene, world.year || ""]
    .join("|")
    .toLowerCase();
}

/** Deterministic visual setting — mission geography only, no invention text */
export function buildVisualSetting(world) {
  const parts = [];
  if (world.place) parts.push(`Location: ${world.place}.`);
  if (world.scene) parts.push(world.scene);
  else if (world.place) {
    parts.push(
      `A real place on Earth known as ${world.place}, with its natural terrain, climate, light, and local settlement pattern.`
    );
  } else {
    parts.push("A specific real local place on Earth, lived-in and particular.");
  }
  if (world.year) parts.push(`Around the year ${world.year}.`);
  parts.push(
    "Photographed as this real place: local climate, terrain, sky, and settlement from the description above."
  );
  return parts.join(" ");
}

/**
 * @returns {{ missionId: string, place: string, title: string, scene: string, year: *, visualSetting: string, key: string, builtAt: number }}
 */
export function buildWorldCard(body) {
  const world = extractMissionWorld(body);
  const visualSetting = buildVisualSetting(world);
  return {
    ...world,
    visualSetting,
    key: worldKey(world),
    builtAt: Date.now(),
  };
}

/**
 * Connected invent islands for Imagine. `null` if the body still uses the
 * legacy single inventionHow (old clients / fixtures). Empty array = no pathways.
 * @param {object} body
 * @returns {{ howText: string, techs: {id: string, name: string, summary: string, narrative: string}[] }[] | null}
 */
function slimVisionGiven(g) {
  if (!g || typeof g !== "object") return null;
  const kind = g.kind === "concern" ? "concern" : g.kind === "crisis" ? "crisis" : null;
  if (!kind) return null;
  const row = {
    id: String(g.id || "").slice(0, 80),
    kind,
    name: clipText(g.name, 80),
  };
  if (kind === "crisis") row.role = g.role || null;
  if (kind === "concern") row.angle = g.angle || null;
  if (g.applied != null) row.applied = Boolean(g.applied);
  return row;
}

function givenLabel(g) {
  return clipText(g?.name || g?.role || g?.angle || g?.kind, 40);
}

export function visionPathwaysOf(body) {
  if (!Array.isArray(body?.pathways)) return null;
  return body.pathways
    .map((p) => {
      const techs = (Array.isArray(p?.techs) ? p.techs : [])
        .map((t) => {
          if (!t || typeof t !== "object") {
            const id = String(t || "").slice(0, 80);
            return id ? { id, name: id, summary: "", narrative: "" } : null;
          }
          return {
            id: String(t.id || "").slice(0, 80),
            name: clipText(t.name, 80),
            summary: clipText(t.summary, 160),
            narrative: clipText(t.narrative, 240),
          };
        })
        .filter(Boolean)
        .filter((t) => t.id || t.name);
      const touching = (Array.isArray(p?.touching) ? p.touching : [])
        .map(slimVisionGiven)
        .filter(Boolean);
      const status =
        p?.status === "applied" || touching.length ? "applied" : "idea";
      return {
        howText: clipText(p?.howText || p?.inventHow, 700),
        techs,
        status,
        touching,
      };
    })
    .filter((p) => p.howText || p.techs.length);
}

export function visionGivensOf(body) {
  if (!Array.isArray(body?.givens)) return [];
  return body.givens.map(slimVisionGiven).filter(Boolean);
}

/** Applied inventHows, else idea hows; legacy body.inventionHow if no pathways. */
export function visionHowNarrative(body, max = 700) {
  const paths = visionPathwaysOf(body);
  if (paths) {
    const applied = paths.filter((p) => p.status === "applied").map((p) => p.howText).filter(Boolean);
    const ideas = paths.filter((p) => p.status === "idea").map((p) => p.howText).filter(Boolean);
    return clipText((applied.length ? applied : ideas).join(" Meanwhile "), max);
  }
  return clipText(body?.inventionHow, max);
}

function pathwayLine(p) {
  const names = p.techs.map((t) => t.name).filter(Boolean).join(", ");
  return p.howText || (names ? `local tools related to ${names}` : "");
}

/**
 * Documentary happening from board geometry. Null if the body has no pathways[].
 */
export function visionGeometryHappening(body, place) {
  const paths = visionPathwaysOf(body);
  if (!paths) return null;
  const here = place || "this place";
  const applied = paths.filter((p) => p.status === "applied");
  const ideas = paths.filter((p) => p.status === "idea");
  const unsolved = visionGivensOf(body).filter((g) => g.applied === false);
  const parts = [];
  for (const p of applied) {
    const line = pathwayLine(p);
    const where = p.touching.map(givenLabel).filter(Boolean).join(", ");
    if (line && where) {
      parts.push(`${line} This is in use in ${here}, addressing ${where}.`);
    } else if (line) {
      parts.push(`${line} This is in use in ${here}.`);
    }
  }
  for (const p of ideas) {
    const line = pathwayLine(p);
    if (line) {
      parts.push(
        `A person who lives this situation in ${here} is considering an idea — thinking, sketching, talking it through — not yet installed in the streets: ${line}`
      );
    }
  }
  if (unsolved.length) {
    const labels = unsolved.map(givenLabel).filter(Boolean).join(", ");
    if (labels) {
      parts.push(`The unsolved local pressure is still visible: ${labels}.`);
    }
  }
  if (!parts.length) return "";
  return clipText(parts.join(" Meanwhile "), 700);
}

/** Everyday-life face only for legacy single-essay clients. Hex pathways skip it. */
export function visionLifeNarrative(body, max = 700) {
  if (Array.isArray(body?.pathways)) return "";
  return clipText(body?.inventionImpact, max);
}

/** Cache key: per-island membership + inventHow. Never includes an invention name. */
export function visionPathwaysKey(body) {
  const paths = visionPathwaysOf(body);
  if (paths) {
    return paths
      .map((p) => {
        const ids = p.techs
          .map((t) => t.id || t.name)
          .filter(Boolean)
          .sort()
          .join(",");
        const touch = (p.touching || [])
          .map((g) => g.id || g.role || g.angle || g.kind)
          .filter(Boolean)
          .sort()
          .join(",");
        return `${ids}:${p.status}:${touch}:${clipText(p.howText, 400).toLowerCase()}`;
      })
      .join("||");
  }
  return clipText(body?.inventionHow, 400).toLowerCase();
}

export function visionTechList(body, max = 8) {
  const paths = visionPathwaysOf(body);
  const source = paths ? paths.flatMap((p) => p.techs) : body?.techs || [];
  const seen = new Set();
  const out = [];
  for (const t of source) {
    if (!t) continue;
    const row =
      typeof t === "object"
        ? {
            id: String(t.id || "").slice(0, 80),
            name: clipText(t.name, 80),
            summary: clipText(t.summary, 160),
            narrative: clipText(t.narrative, 240),
          }
        : {
            id: String(t).slice(0, 80),
            name: String(t),
            summary: "",
            narrative: "",
          };
    const key = row.id || row.name;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= max) break;
  }
  return out;
}

export function narrativeLength(body) {
  const how = visionHowNarrative(body, 700);
  const life = visionLifeNarrative(body, 700);
  return `${how} ${life}`.trim().length;
}

export function techNames(body, max = 6) {
  return visionTechList(body, max)
    .map((t) => t.name)
    .filter(Boolean);
}

function groundInPlace(place, text) {
  const t = clipText(text, 420);
  if (!t) return "";
  if (!place) return t;
  // Avoid double-prefix if already starts with place
  if (t.toLowerCase().includes(place.toLowerCase().slice(0, Math.min(12, place.length)))) {
    return t;
  }
  return `In ${place}: ${t}`;
}

/**
 * Heuristic shot decision — control plane only.
 * @returns {{ mode: "edit"|"generate", continuity: string, happening: string, subjects: string[], reason: string }}
 */
/**
 * Challenge-step beat for vision (critic + player response).
 * Kept out of World Card so geography stays frozen.
 */
export function challengeBeatKey(beat) {
  if (!beat || typeof beat !== "object") return "";
  return [
    beat.angle || "",
    beat.phase || "",
    clipText(beat.question, 120),
    clipText(beat.response, 200),
    beat.quality || "",
    beat.move || "",
  ]
    .join("|")
    .toLowerCase();
}

function shotFromChallengeBeat(body, prev, worldCard) {
  const beat = body.challengeBeat;
  if (!beat || !beat.angle) return null;
  const place = worldCard.place || "this place";
  const how = visionHowNarrative(body, 360);
  const life = visionLifeNarrative(body, 280);
  const names = techNames(body);
  const hasPrior = Boolean(prev?.dataUrl?.startsWith("data:"));
  const label = clipText(beat.label || beat.angle, 40) || "critic";
  const question = clipText(beat.question, 220);
  const speech = clipText(beat.speech, 220);
  const response = clipText(beat.response, 280);
  const move = String(beat.move || "");
  const quality = String(beat.quality || "");
  const phase = String(beat.phase || "posed");

  // Pose: invention under hostile scrutiny in this place
  if (phase === "posed" || !response) {
    const pressureBits = [
      speech || `${label} challenges whether the plan can work here.`,
      question ? `The open question hangs over the scene: ${question}` : "",
      how ? `The invention as currently designed: ${how}` : "",
      life ? `Everyday stakes: ${life}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      mode: hasPrior ? "edit" : "generate",
      continuity: hasPrior ? "same-frame" : "baseline",
      reason: "Challenge posed — critic pressure in the same place",
      happening: groundInPlace(
        place,
        `Tension in ${place}: the local invention is under public challenge from ${label}. ${pressureBits} People, signs of the local crisis, and the invention's early form are visible — not a cartoon villain, a real documentary moment of pushback.`
      ),
      subjects: names,
    };
  }

  // After player move: scene reflects defense / fix / sidestep
  let moveLine = "";
  if (move === "defend") {
    moveLine =
      quality === "hit"
        ? `A concrete public defense lands: specific actors, funding, or hard limits are being explained and accepted.`
        : quality === "glance"
          ? `A partial defense is offered — some substance, still under debate in the room.`
          : `A weak defense fails to settle the room; doubt remains visible.`;
    if (response) moveLine += ` What they argued: ${response}`;
  } else if (move === "fix") {
    moveLine = `The invention is being revised under fire — mechanisms change on the ground. ${how || response || "Designers rewrite how it works in public."}`;
  } else if (move === "sidestep") {
    moveLine = `The team sidesteps this critic for now — attention pivots away from a full answer; political capital is spent to move on.`;
  } else if (phase === "cleared") {
    moveLine = `The challenge has been cleared. Relief and cautious confidence return to ${place}; the invention can move toward fielding.`;
  } else {
    moveLine = response || `The team answers ${label} under pressure.`;
  }

  return {
    mode: hasPrior ? "edit" : "generate",
    continuity: hasPrior ? "same-frame" : "new-shot",
    reason: `Challenge response (${move || phase})`,
    happening: groundInPlace(
      place,
      `In ${place}, after facing ${label}: ${moveLine} Keep the same locale, climate, and terrain; show the social and physical consequence of this moment.`
    ),
    subjects: names,
  };
}

export function decideShot(body, prev, worldCard) {
  const place = worldCard.place || "this place";
  const techs = body.techs || [];
  const stageId = body.stage?.id || "present";
  const how = visionHowNarrative(body, 500);
  const life = visionLifeNarrative(body, 500);
  const narrative = `${how} ${life}`.trim();
  const names = techNames(body);
  const hasPrior = Boolean(prev?.dataUrl?.startsWith("data:"));
  const force = Boolean(body.force);

  const challengeShot = shotFromChallengeBeat(body, prev, worldCard);
  if (challengeShot) return challengeShot;

  const geo = visionGeometryHappening(body, place);
  if (geo) {
    return {
      mode: "generate",
      continuity: hasPrior ? "new-shot" : "baseline",
      reason: "Board geometry frames the shot",
      happening: groundInPlace(place, geo),
      subjects: names,
    };
  }

  if (!hasPrior) {
    return {
      mode: "generate",
      continuity: "baseline",
      reason: "First vision for this session",
      happening: narrative
        ? groundInPlace(
            place,
            `${narrative} Visible as everyday life and tools in this setting.`
          )
        : `Ordinary present-day life in ${place}; the local situation from the mission is visible in the land and people.`,
      subjects: [],
    };
  }

  if (force) {
    return {
      mode: "generate",
      continuity: "new-shot",
      reason: "Manual refresh",
      happening: narrative
        ? groundInPlace(place, narrative)
        : names.length
          ? groundInPlace(
              place,
              `Local infrastructure and tools related to ${names.join(", ")} in active use.`
            )
          : `A clear documentary view of life in ${place} at this moment.`,
      subjects: names,
    };
  }

  // Substantial story → new camera, same world (place-safe default).
  // Must run before present/no-tech baseline so learner writing updates the image
  // even before they pick a stack (common in Spark tutorial).
  if (narrative.length >= 40) {
    const bits = [];
    if (how) bits.push(how);
    // Spark mirrors how→impact; avoid pasting the same sentence twice into the shot
    if (life && life !== how) bits.push(life);
    return {
      mode: "generate",
      continuity: "new-shot",
      reason: "Learner story frames the shot",
      happening: groundInPlace(
        place,
        `${bits.join(" ")} All of this unfolds in ${place}, with the terrain, climate, and sky of the setting.`
      ),
      subjects: names,
    };
  }

  // Empty / thin story + no stack → keep present-day place baseline
  if (stageId === "present" && techs.length === 0) {
    return {
      mode: "generate",
      continuity: "baseline",
      reason: "Present-day baseline",
      happening: `Ordinary present-day life in ${place}; the local situation from the mission is visible in the land and people.`,
      subjects: [],
    };
  }

  // Tech-only / thin narrative → evolve same frame
  if (narrative.length < 40 && techs.length > 0) {
    return {
      mode: "edit",
      continuity: "same-frame",
      reason: "Stack change without a new story frame",
      happening: names.length
        ? `The same view of ${place}, with ${names.join(", ")} visible as real local tools or infrastructure that fit this terrain and climate.`
        : `The same view of ${place}, with subtle local progress.`,
      subjects: names,
    };
  }

  if (techs.length > 0 && hasPrior) {
    return {
      mode: "edit",
      continuity: "same-frame",
      reason: "Incremental stack evolve",
      happening: `The same view of ${place}, evolving with local technology in use.`,
      subjects: names,
    };
  }

  return {
    mode: "generate",
    continuity: "new-shot",
    reason: "Default generate with frozen world",
    happening: `A clear documentary still of life in ${place}.`,
    subjects: names,
  };
}

/**
 * Strip accidental negations / pollution from LLM shot text.
 */
export function sanitizeHappening(text, worldCard) {
  let t = clipText(text, 500);
  if (!t) {
    return `Life and work in ${worldCard.place || "this place"}, matching the mission setting.`;
  }
  // Drop sentence fragments that are pure negations
  t = t
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !PROMPT_POLLUTION_RE.test(s) && !/^\s*(no|not|never|don't|do not)\b/i.test(s))
    .join(" ")
    .trim();
  if (!t || PROMPT_POLLUTION_RE.test(t)) {
    return `In ${worldCard.place || "this place"}: activity from the learner's invention, fitted to the local terrain and climate.`;
  }
  // Ensure place grounding
  if (
    worldCard.place &&
    !t.toLowerCase().includes(worldCard.place.toLowerCase().slice(0, Math.min(10, worldCard.place.length)))
  ) {
    t = `In ${worldCard.place}: ${t}`;
  }
  return t;
}

/**
 * Optional LLM shot director — returns null on failure.
 * Must produce positive happening only; world is fixed input.
 */
export async function directShot(body, prev, worldCard, client, opts = {}) {
  const { model } = opts;
  if (!client) return null;
  const how = visionHowNarrative(body, 500);
  const life = visionLifeNarrative(body, 500);
  if (`${how} ${life}`.trim().length < 40) return null;

  const names = techNames(body, 8);
  const hasPrior = Boolean(prev?.dataUrl?.startsWith("data:"));
  const paths = visionPathwaysOf(body);
  const inventPayload = paths
    ? {
        pathways: paths.map((p) => ({
          techs: p.techs.map((t) => t.name || t.id).filter(Boolean),
          inventHow: p.howText || null,
          status: p.status,
          touching: p.touching.map((g) => ({
            kind: g.kind,
            name: g.name || null,
            role: g.role || null,
            angle: g.angle || null,
          })),
        })),
        givens: visionGivensOf(body).map((g) => ({
          kind: g.kind,
          name: g.name || null,
          role: g.role || null,
          angle: g.angle || null,
          applied: Boolean(g.applied),
        })),
      }
    : {
        inventHow: how || null,
        inventionImpact: life || null,
      };

  const input = [
    {
      role: "system",
      content:
        `You write shot briefs for a single documentary image in an inventing practice.\n` +
        `You receive a FIXED setting (place + visual description). The setting never changes.\n` +
        `Write what is VISIBLY happening in the frame, grounded in that setting.\n` +
        `If the invention involves rockets, networks, clinics, etc., describe them as they would appear ` +
        `in THIS setting's terrain and climate (use words from the setting).\n` +
        `Each pathways[] entry is one local invent (connected island) with its inventHow — there is no invention name.\n` +
        `status "idea" means it is not touching a crisis or concern: show a person who lives this situation considering the idea (thinking, sketching) — not installed in the streets.\n` +
        `status "applied" means it edge-touches those crises/concerns: show the invent in use addressing them.\n` +
        `givens with applied false are still visible as the unsolved local situation.\n` +
        `Choose "edit" only if the same camera view can show the change by adding elements.\n` +
        `Choose "generate" if a different camera in the same setting is better.\n` +
        `Rules: positive description only; no negations; no other countries or stock tourist locations; ` +
        `no lists of things to avoid.\n` +
        `JSON only: {"mode":"edit"|"generate","happening":"1-3 sentences","subjects":["optional visible nouns"],"reason":"≤12 words"}`,
    },
    {
      role: "user",
      content: JSON.stringify({
        setting: {
          place: worldCard.place,
          title: worldCard.title,
          visualSetting: worldCard.visualSetting,
          year: worldCard.year,
        },
        hasPriorImage: hasPrior,
        stage: body.stage?.id || "present",
        techs: names,
        ...inventPayload,
      }),
    },
  ];

  const t0 = Date.now();
  try {
    const response = await client.responses.create({
      model: model || "grok-4.6",
      input,
      temperature: 0.2,
    });
    if (typeof opts.onAiTextUsage === "function") {
      try {
        opts.onAiTextUsage({
          mode: "vision-director",
          source: "ai",
          model: model || "grok-4.6",
          usage: response.usage || null,
          latencyMs: Date.now() - t0,
          ok: true,
        });
      } catch {
        /* ignore metrics errors */
      }
    }
    const text = response.output_text || "";
    const parsed = extractJsonLoose(text);
    if (!parsed) return null;
    const mode = parsed.mode === "edit" ? "edit" : parsed.mode === "generate" ? "generate" : null;
    if (!mode) return null;
    if (mode === "edit" && !hasPrior) {
      return {
        mode: "generate",
        continuity: "new-shot",
        reason: String(parsed.reason || "generate without prior").slice(0, 120),
        happening: sanitizeHappening(parsed.happening, worldCard),
        subjects: Array.isArray(parsed.subjects)
          ? parsed.subjects.map((s) => String(s).slice(0, 60)).slice(0, 8)
          : [],
      };
    }
    return {
      mode,
      continuity: mode === "edit" ? "same-frame" : "new-shot",
      reason: String(parsed.reason || "director").slice(0, 120),
      happening: sanitizeHappening(parsed.happening, worldCard),
      subjects: Array.isArray(parsed.subjects)
        ? parsed.subjects.map((s) => String(s).slice(0, 60)).slice(0, 8)
        : [],
    };
  } catch {
    return null;
  }
}

function extractJsonLoose(text) {
  if (!text) return null;
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Resolve shot: heuristic first; optional director when narrative is rich.
 */
export async function resolveShot(
  body,
  prev,
  worldCard,
  { client, model, onAiTextUsage } = {}
) {
  const heuristic = decideShot(body, prev, worldCard);
  const nLen = narrativeLength(body);

  // Skip director for baseline / force / thin narrative / no client
  if (
    !client ||
    body.force ||
    nLen < 40 ||
    heuristic.continuity === "baseline" ||
    (body.techs || []).length === 0
  ) {
    return heuristic;
  }

  // Cache: same narrative as previous → reuse previous shot if stored
  const impact = visionLifeNarrative(body, 400);
  const narrKey = `${visionPathwaysKey(body)}|${impact}|${techNames(body).join(",")}`;
  if (prev?.shotNarrativeKey === narrKey && prev?.lastShot?.happening) {
    return {
      mode: prev.lastShot.mode || heuristic.mode,
      continuity: prev.lastShot.continuity || heuristic.continuity,
      happening: prev.lastShot.happening,
      subjects: prev.lastShot.subjects || [],
      reason: prev.lastShot.reason || "Cached shot",
    };
  }

  const directed = await directShot(body, prev, worldCard, client, {
    model,
    onAiTextUsage,
  });
  return directed || heuristic;
}

export function composeGeneratePrompt(worldCard, shot, stageId = "present") {
  const tone = STAGE_TONE[stageId] || STAGE_TONE.present;
  const subjects =
    shot.subjects?.length > 0
      ? `Visible details: ${shot.subjects.map((s) => clipText(s, 40)).join("; ")}.`
      : "";
  const titleLine = worldCard.title ? `Mission context: ${worldCard.title}.` : "";

  return [
    "Photorealistic documentary still, 16:9, single frame, no text, no logos, no watermark, no UI.",
    "",
    "SETTING (this place only):",
    worldCard.visualSetting,
    titleLine,
    "",
    "WHAT IS HAPPENING IN THIS FRAME:",
    clipText(shot.happening, 500),
    subjects,
    "",
    `Tone: ${tone}; human-scale, serious hope, specific local reality.`,
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function composeEditPrompt(worldCard, shot) {
  const place = worldCard.place ? `Still ${worldCard.place}.` : "";
  return [
    "Edit this image to a later moment in the same place and camera view.",
    "Keep the same terrain, sky, and landmarks.",
    place,
    `Show this change: ${clipText(shot.happening, 400)}`,
    "Photorealistic, no text, no logos.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Dev/test helper — flags prompt pollution (negations, stock anti-sites).
 * Note: if the mission scene itself contains "harbor", that is allowed (from world).
 */
export function assertCleanImagePrompt(prompt, { worldScene = "" } = {}) {
  const issues = [];
  if (!prompt || typeof prompt !== "string") {
    return { ok: false, issues: ["empty prompt"] };
  }
  // Hard pollution — should never appear from our templates
  const hard = [
    /FORBIDDEN/i,
    /LOCALE LOCK/i,
    /highest priority/i,
    /seaside marina/i,
    /Cape Canaveral/i,
    /Florida-style/i,
    /do not show/i,
    /don't show/i,
    /must not introduce/i,
  ];
  for (const re of hard) {
    if (re.test(prompt)) issues.push(`pollution: ${re}`);
  }
  // "marina/harbor" only OK if present in mission scene
  const scene = (worldScene || "").toLowerCase();
  for (const word of ["marina", "harbor", "harbour"]) {
    if (new RegExp(`\\b${word}\\b`, "i").test(prompt) && !scene.includes(word)) {
      issues.push(`unexpected token "${word}" not in mission scene`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function visionFingerprint(body) {
  const techIds = visionTechList(body, 12)
    .map((t) => t.id || t.name)
    .sort()
    .join(",");
  const stage = body.stage?.id || "present";
  const pathKey = visionPathwaysKey(body);
  const life = visionLifeNarrative(body, 400).toLowerCase();
  const year = body.year || "";
  const place = clipText(body.place || body.challenge?.place, 80).toLowerCase();
  const scene = clipText(body.challenge?.scene || body.challenge?.problem, 200).toLowerCase();
  const pressure = body.pressure
    ? Object.entries(body.pressure)
        .map(([k, v]) => `${k}:${v}`)
        .join(",")
    : "";
  const beat = challengeBeatKey(body.challengeBeat);
  const givenKey = visionGivensOf(body)
    .map((g) => `${g.id || g.name || g.kind}:${g.applied ? 1 : 0}`)
    .join(",");
  return `${place}|${scene}|${stage}|${year}|${pressure}|${techIds}|${pathKey}|${life}|${givenKey}|${beat}`;
}

export function shotNarrativeKey(body) {
  const impact = visionLifeNarrative(body, 400);
  const beat = challengeBeatKey(body.challengeBeat);
  return `${visionPathwaysKey(body)}|${impact}|${techNames(body).join(",")}|${beat}`;
}
