/**
 * Fixture checks for Future Vision prompt pipeline.
 * Run: npm run check:vision-prompts
 */

import {
  buildWorldCard,
  decideShot,
  composeGeneratePrompt,
  composeEditPrompt,
  assertCleanImagePrompt,
} from "../js/vision-prompt.mjs";

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

// —— Atacama + rocket ——
const atacamaBody = {
  place: "Atacama Desert, Chile",
  year: 2026,
  force: false,
  challenge: {
    id: "atacama-test",
    title: "Clear desert nights",
    scene:
      "Clear desert nights over the Atacama; hyper-arid high plateau, star-filled sky, sparse settlements, cold dry air.",
    problem:
      "Clear desert nights over the Atacama; hyper-arid high plateau, star-filled sky, sparse settlements, cold dry air.",
  },
  stage: { id: "prototype" },
  techs: [{ id: "space", name: "Space systems" }],
  inventionHow:
    "A small rocket lofted from a local pad carries a relay that serves nearby settlements.",
  inventionImpact: "Communities get links without leaving the desert valleys.",
};

const world1 = buildWorldCard(atacamaBody);
const world2 = buildWorldCard({
  ...atacamaBody,
  inventionHow: "Totally different invention about drones only.",
});
assert(world1.visualSetting === world2.visualSetting, "world card stable across invention changes");
assert(/Atacama/i.test(world1.visualSetting), "visualSetting includes place");
assert(/star-filled|hyper-arid|desert/i.test(world1.visualSetting), "visualSetting includes scene");

const shotRocket = decideShot(atacamaBody, { dataUrl: "data:image/jpeg;base64,xx" }, world1);
const genPrompt = composeGeneratePrompt(world1, shotRocket, "prototype");
const clean = assertCleanImagePrompt(genPrompt, { worldScene: world1.scene });
assert(clean.ok, `Atacama+rocket prompt clean: ${clean.issues.join("; ") || "ok"}`);
assert(/Atacama/i.test(genPrompt), "generate prompt names Atacama");
assert(/star-filled|hyper-arid|desert nights/i.test(genPrompt), "generate prompt keeps scenario language");
assert(!/\bmarina\b/i.test(genPrompt), "no marina token");
assert(!/\bharbor\b/i.test(genPrompt), "no harbor token");
assert(!/Cape Canaveral/i.test(genPrompt), "no Cape Canaveral");
assert(!/FORBIDDEN/i.test(genPrompt), "no FORBIDDEN list");
assert(!/LOCALE LOCK/i.test(genPrompt), "no LOCALE LOCK meta");

// Tech-only → edit
const techOnly = {
  ...atacamaBody,
  inventionHow: "",
  inventionImpact: "",
  techs: [{ id: "drones", name: "Drones" }],
};
const shotEdit = decideShot(techOnly, { dataUrl: "data:image/jpeg;base64,xx" }, world1);
assert(shotEdit.mode === "edit", "tech-only uses edit");
const editPrompt = composeEditPrompt(world1, shotEdit);
assert(/Atacama|same place/i.test(editPrompt), "edit prompt anchors place");
assert(!/\bmarina\b/i.test(editPrompt), "edit prompt has no marina");

// Coastal scene may include harbor language from mission only
const coastalBody = {
  place: "Valparaíso, Chile",
  year: 2026,
  challenge: {
    id: "valpo",
    title: "Harbor resilience",
    scene: "The historic harbor and steep hills of Valparaíso face rising storms.",
    problem: "The historic harbor and steep hills of Valparaíso face rising storms.",
  },
  stage: { id: "present" },
  techs: [],
  inventionHow: "",
  inventionImpact: "",
};
const coastalWorld = buildWorldCard(coastalBody);
const coastalShot = decideShot(coastalBody, null, coastalWorld);
const coastalPrompt = composeGeneratePrompt(coastalWorld, coastalShot, "present");
const coastalClean = assertCleanImagePrompt(coastalPrompt, { worldScene: coastalWorld.scene });
assert(coastalClean.ok, `coastal prompt clean when harbor is in scene: ${coastalClean.issues.join("; ")}`);
assert(/\bharbor\b/i.test(coastalPrompt), "harbor allowed when in mission scene");

// Pollution detector catches anti-lists
const dirty = assertCleanImagePrompt(
  "A desert. FORBIDDEN: marina, harbor. Never show Cape Canaveral."
);
assert(!dirty.ok, "detector flags pollution");

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll vision prompt checks passed.");
