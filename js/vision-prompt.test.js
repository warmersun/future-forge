/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCleanImagePrompt,
  buildWorldCard,
  composeCastPrompts,
  composeGeneratePrompt,
  composeScenePrompt,
  decideShot,
  shotNarrativeKey,
  visionFingerprint,
  visionGeometryHappening,
  visionHeroOf,
  visionHowNarrative,
  visionImageRequest,
  visionPathwaysOf,
  visionPathwaysKey,
  visionPeopleMoodOf,
  techNames,
} from "./vision-prompt.mjs";
import {
  ensureVisionCast,
  loadVisionReferenceUrl,
  prepareSceneImage,
} from "./server/vision-images.mjs";

const placeBody = {
  place: "Portside Ward",
  year: 2026,
  challenge: {
    id: "portside-floods",
    title: "Portside floods",
    scene: "Low streets flood after storms; pump houses struggle.",
    problem: "Low streets flood after storms; pump houses struggle.",
  },
  stage: { id: "prototype" },
};

describe("vision pathways signature", () => {
  it("reads inventHow per island and ignores inventionName", () => {
    const body = {
      ...placeBody,
      inventionName: "Should Never Appear",
      inventionHow: "legacy leftover",
      pathways: [
        {
          techs: [{ id: "ai", name: "AI" }],
          howText: "Sensors radio the crest to the firehouse.",
        },
        {
          techs: [{ id: "iot", name: "IoT" }],
          inventHow: "Street boards drop before the tide peaks.",
        },
      ],
    };
    const paths = visionPathwaysOf(body);
    assert.equal(paths.length, 2);
    assert.match(visionHowNarrative(body), /Sensors radio/);
    assert.match(visionHowNarrative(body), /Street boards/);
    assert.ok(!/Should Never Appear/.test(visionHowNarrative(body)));
    assert.ok(!/legacy leftover/.test(visionHowNarrative(body)));
    assert.deepEqual(techNames(body).sort(), ["AI", "IoT"]);

    const world = {
      place: body.place,
      title: body.challenge.title,
      scene: body.challenge.scene,
      visualSetting: body.challenge.scene,
    };
    const shot = decideShot(body, { dataUrl: "data:image/jpeg;base64,xx" }, world);
    assert.match(shot.happening, /Sensors radio/);
    assert.match(shot.happening, /Street boards/);
    assert.ok(!/Should Never Appear/.test(shot.happening));
  });

  it("keeps a plain tile's how-text and name in the shot", () => {
    const body = {
      ...placeBody,
      pathways: [
        {
          techs: [{ id: "inv-farm", name: "Community farm" }],
          howText:
            "Neighbors plant and share a food garden on the school lot this season.",
          status: "idea",
        },
      ],
    };
    const world = {
      place: body.place,
      title: body.challenge.title,
      scene: body.challenge.scene,
      visualSetting: body.challenge.scene,
    };
    const shot = decideShot(body, null, world);
    assert.match(shot.happening, /food garden/);
    const prompt = composeGeneratePrompt(world, shot, "present");
    assert.match(prompt, /food garden/);
    assert.match(prompt, /Community farm/);
  });

  it("fingerprint changes when one island inventHow changes, not when a name is set", () => {
    const a = {
      ...placeBody,
      inventionName: "Alpha",
      pathways: [
        { techs: [{ id: "ai", name: "AI" }], howText: "Mesh alerts crews." },
      ],
    };
    const named = { ...a, inventionName: "Beta" };
    assert.equal(visionFingerprint(a), visionFingerprint(named));
    const b = {
      ...a,
      pathways: [
        { techs: [{ id: "ai", name: "AI" }], howText: "Mesh pages the quay." },
      ],
    };
    assert.notEqual(visionFingerprint(a), visionFingerprint(b));
    assert.notEqual(visionPathwaysKey(a), visionPathwaysKey(b));
  });

  it("idea pathways are thinking, not installed; applied pathways are in use", () => {
    const body = {
      ...placeBody,
      pathways: [
        {
          techs: [{ id: "ai", name: "AI" }],
          howText: "A mesh of cheap water sensors that pages the quay.",
          status: "idea",
          touching: [],
        },
      ],
      givens: [
        {
          id: "crisis-local",
          kind: "crisis",
          role: "local",
          name: "Floods",
          applied: false,
        },
      ],
    };
    const geo = visionGeometryHappening(body, body.place);
    assert.match(geo, /thinking|considering/i);
    assert.match(geo, /not yet installed/i);
    assert.match(geo, /water sensors/);
    assert.match(geo, /Floods/);
    assert.ok(!/in use/i.test(geo));
    const world = {
      place: body.place,
      title: body.challenge.title,
      scene: body.challenge.scene,
      visualSetting: body.challenge.scene,
    };
    const shot = decideShot(body, { dataUrl: "data:image/jpeg;base64,xx" }, world);
    assert.equal(shot.reason, "Board geometry frames the shot");
    assert.match(shot.happening, /thinking|considering/i);

    const applied = {
      ...body,
      pathways: [
        {
          techs: [{ id: "ai", name: "AI" }],
          howText: "A mesh of cheap water sensors that pages the quay.",
          status: "applied",
          touching: [
            { id: "crisis-local", kind: "crisis", role: "local", name: "Floods" },
          ],
        },
      ],
      givens: [
        {
          id: "crisis-local",
          kind: "crisis",
          role: "local",
          name: "Floods",
          applied: true,
        },
      ],
    };
    const used = visionGeometryHappening(applied, applied.place);
    assert.match(used, /in use/i);
    assert.match(used, /Floods/);
    assert.ok(!/not yet installed/i.test(used));
    assert.notEqual(visionFingerprint(body), visionFingerprint(applied));
    assert.notEqual(visionPathwaysKey(body), visionPathwaysKey(applied));
  });

  it("peopleMood follows local crisis lamp; missing local is ordinary faces", () => {
    const world = {
      place: placeBody.place,
      title: placeBody.challenge.title,
      scene: placeBody.challenge.scene,
      visualSetting: placeBody.challenge.scene,
    };
    const none = { ...placeBody, pathways: [], givens: [] };
    assert.equal(visionPeopleMoodOf(none), "neutral");
    const sad = {
      ...placeBody,
      peopleMood: "sad",
      pathways: [
        {
          techs: [{ id: "ai", name: "AI" }],
          howText: "Sensors radio the crest.",
          status: "applied",
          touching: [
            { id: "crisis-local", kind: "crisis", role: "local", name: "Floods" },
          ],
        },
      ],
      givens: [
        {
          id: "crisis-local",
          kind: "crisis",
          role: "local",
          name: "Floods",
          lamp: "red",
          applied: true,
        },
      ],
    };
    assert.equal(visionPeopleMoodOf(sad), "sad");
    const shot = decideShot(sad, { dataUrl: "data:image/jpeg;base64,xx" }, world);
    assert.equal(shot.peopleMood, "sad");
    assert.match(shot.happening, /worn and sad/i);
    const prompt = composeGeneratePrompt(world, shot, "prototype");
    assert.match(prompt, /worn and sad/i);
    assert.ok(!/serious hope/i.test(prompt));

    const glad = {
      ...sad,
      peopleMood: "happy",
      givens: [{ ...sad.givens[0], lamp: "green" }],
    };
    assert.equal(visionPeopleMoodOf(glad), "happy");
    assert.notEqual(visionFingerprint(sad), visionFingerprint(glad));
    const happyShot = decideShot(glad, { dataUrl: "data:image/jpeg;base64,xx" }, world);
    assert.match(happyShot.happening, /relieved and glad/i);
  });

  it("legacy inventionHow still works when pathways is omitted", () => {
    const body = {
      ...placeBody,
      techs: [{ id: "drones", name: "Drones" }],
      inventionHow:
        "Neighbors share a mesh of cheap water sensors that trigger street-level diversion boards before the tide peaks.",
    };
    assert.match(visionHowNarrative(body), /water sensors/);
    const world = {
      place: body.place,
      title: body.challenge.title,
      scene: body.challenge.scene,
      visualSetting: body.challenge.scene,
    };
    const shot = decideShot(body, { dataUrl: "data:image/jpeg;base64,xx" }, world);
    assert.equal(shot.reason, "Learner story frames the shot");
  });
});

describe("vision superhero references", () => {
  const world = buildWorldCard(placeBody);
  const placed = {
    ...placeBody,
    lastAction: { type: "place-invent", tileId: "inv-robots", techId: "robots" },
    pathways: [
      {
        techs: [{ id: "robots", name: "Robots" }],
        howText: "Robots haul the pumps off the low streets.",
      },
    ],
  };

  it("a robotics placement brings Automator and robots", () => {
    const hero = visionHeroOf(placed);
    assert.equal(hero?.id, "automator");
    assert.equal(hero?.file, "automator.png");
    const heroFile = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../assets/superheroes/automator.png"
    );
    assert.equal(fs.existsSync(heroFile), true);
    const shot = decideShot(placed, null, world);
    assert.match(shot.happening, /Automator/);
    assert.match(shot.happening, /[Rr]obots/);
    assert.equal(shot.hero?.file, "automator.png");
  });

  it("skips the hero for a blank tech, a story edit, a year change, and an unknown id", () => {
    assert.equal(
      visionHeroOf({ ...placed, lastAction: { type: "place-invent", tileId: "x", techId: null } }),
      null
    );
    assert.equal(visionHeroOf({ ...placed, lastAction: { type: "story" } }), null);
    assert.equal(visionHeroOf({ ...placed, lastAction: { type: "year" } }), null);
    assert.equal(
      visionHeroOf({
        ...placed,
        lastAction: { type: "place-invent", tileId: "x", techId: "not-a-tech" },
      }),
      null
    );
    const story = decideShot({ ...placed, lastAction: { type: "story" } }, null, world);
    assert.equal(story.hero, null);
    assert.ok(!/Automator/.test(story.happening));
  });

  it("names the place, the local person, and the hero only when one is in the frame", () => {
    const shot = decideShot(placed, null, world);
    const scene = composeScenePrompt(world, shot, "prototype", { hero: shot.hero });
    assert.match(scene, /<IMAGE_0>/);
    assert.match(scene, /<IMAGE_1>/);
    assert.match(scene, /<IMAGE_2>/);
    const quiet = composeScenePrompt(world, shot, "prototype", {});
    assert.match(quiet, /<IMAGE_0>/);
    assert.match(quiet, /<IMAGE_1>/);
    assert.ok(!/<IMAGE_2>/.test(quiet));
    const clean = assertCleanImagePrompt(scene, { worldScene: world.scene });
    assert.equal(clean.ok, true, clean.issues.join("; "));
  });

  it("asks Imagine for a 16:9 edit when plates exist, and a text generation when they do not", () => {
    const withPlates = visionImageRequest({
      prompt: "scene",
      images: ["data:a", "data:b", "data:c"],
      aspectRatio: "2:3",
    });
    assert.equal(withPlates.path, "/images/edits");
    assert.equal(withPlates.payload.aspect_ratio, "16:9");
    assert.equal(withPlates.payload.images.length, 3);
    assert.equal(withPlates.payload.image, undefined);

    const single = visionImageRequest({
      prompt: "scene",
      edit: true,
      prevDataUrl: "data:image/jpeg;base64,prev",
    });
    assert.equal(single.path, "/images/edits");
    assert.equal(single.payload.aspect_ratio, "16:9");
    assert.deepEqual(single.payload.image, { url: "data:image/jpeg;base64,prev", type: "image_url" });
    assert.equal(single.payload.images, undefined);

    const fresh = visionImageRequest({ prompt: "scene", aspectRatio: "2:3" });
    assert.equal(fresh.path, "/images/generations");
    assert.equal(fresh.payload.aspect_ratio, "2:3");
  });

  it("keeps the comic tone and drops the hero when the action changes", () => {
    const shot = decideShot(placed, null, world);
    const prompt = composeGeneratePrompt(world, shot, "prototype");
    const cast = composeCastPrompts(world);
    for (const text of [prompt, cast.character, cast.location]) {
      assert.ok(!/^documentary/i.test(text));
      assert.ok(!/^photorealistic/i.test(text));
      assert.ok(!/\bdocumentary\b/i.test(text));
      assert.ok(!/\bphotorealistic\b/i.test(text));
    }
    assert.match(prompt, /superhero-comic/);
    assert.match(cast.character, /Everyday local clothes/);
    const clean = assertCleanImagePrompt(prompt, { worldScene: world.scene });
    assert.equal(clean.ok, true, clean.issues.join("; "));
    const storyBody = { ...placed, lastAction: { type: "story", tileId: "", techId: null } };
    assert.notEqual(visionFingerprint(placed), visionFingerprint(storyBody));
    assert.notEqual(shotNarrativeKey(placed), shotNarrativeKey(storyBody));
  });

  it("builds a plate edit with the location first and the hero third", () => {
    const shot = decideShot(placed, null, world);
    const prepared = prepareSceneImage({
      worldCard: world,
      shot,
      stageId: "prototype",
      cast: {
        location: "data:image/png;base64,loc",
        character: "data:image/png;base64,chr",
      },
      mode: "generate",
      prevDataUrl: "data:image/jpeg;base64,prev",
    });
    assert.equal(prepared.usedReferences, true);
    assert.equal(prepared.request.path, "/images/edits");
    assert.equal(prepared.request.payload.aspect_ratio, "16:9");
    assert.equal(prepared.request.payload.images.length, 3);
    assert.equal(prepared.request.payload.images[0].url, "data:image/png;base64,loc");
    assert.equal(prepared.request.payload.images[1].url, "data:image/png;base64,chr");
    assert.match(prepared.request.payload.images[2].url, /^data:image\/png;base64,/);
    assert.equal(prepared.request.payload.image, undefined);
    assert.match(prepared.prompt, /<IMAGE_2>/);
    assert.match(prepared.prompt, /Automator/);

    const noHero = prepareSceneImage({
      worldCard: world,
      shot: decideShot({ ...placed, lastAction: { type: "story" } }, null, world),
      cast: {
        location: "data:image/png;base64,loc",
        character: "data:image/png;base64,chr",
      },
      mode: "edit",
      prevDataUrl: "data:image/jpeg;base64,prev",
    });
    assert.equal(noHero.request.payload.images.length, 2);
    assert.ok(!/<IMAGE_2>/.test(noHero.prompt));
  });

  it("mints the character and the location once per quest, even when the year changes", async () => {
    const calls = [];
    const store = { cast: null };
    const generate = async (prompt, aspectRatio) => {
      calls.push(aspectRatio);
      return `data:image/png;base64,${aspectRatio}`;
    };
    const first = await ensureVisionCast(
      "sess-cast",
      world,
      () => store.cast,
      (cast) => {
        store.cast = cast;
      },
      generate
    );
    assert.deepEqual(calls, ["2:3", "16:9"]);
    assert.equal(first.character, "data:image/png;base64,2:3");
    assert.equal(first.location, "data:image/png;base64,16:9");
    const laterYear = buildWorldCard({ ...placeBody, year: 2030 });
    const again = await ensureVisionCast(
      "sess-cast",
      laterYear,
      () => store.cast,
      (cast) => {
        store.cast = cast;
      },
      generate
    );
    assert.equal(again, first);
    assert.equal(calls.length, 2);
  });

  it("uses shipped plates and mints only a missing plate on a scene request", async () => {
    const calls = [];
    const store = { cast: null };
    const generate = async (_prompt, aspectRatio) => {
      calls.push(aspectRatio);
      return `data:image/png;base64,${aspectRatio}`;
    };
    const read = () => store.cast;
    const write = (cast) => {
      store.cast = cast;
    };
    const installed = await ensureVisionCast("sess-shipped", world, read, write, generate, {
      supplied: {
        character: "data:image/png;base64,face",
        location: "data:image/png;base64,place",
      },
      allowGenerate: false,
    });
    assert.equal(calls.length, 0);
    assert.equal(installed.character, "data:image/png;base64,face");
    assert.equal(installed.location, "data:image/png;base64,place");

    const partialStore = { cast: null };
    const held = await ensureVisionCast(
      "sess-partial",
      world,
      () => partialStore.cast,
      (cast) => {
        partialStore.cast = cast;
      },
      generate,
      { supplied: { location: "data:image/png;base64,place" }, allowGenerate: false }
    );
    assert.equal(held, null);
    assert.equal(partialStore.cast, null);
    assert.equal(calls.length, 0);

    const minted = await ensureVisionCast(
      "sess-partial",
      world,
      () => partialStore.cast,
      (cast) => {
        partialStore.cast = cast;
      },
      generate,
      { supplied: { location: "data:image/png;base64,place" }, allowGenerate: true }
    );
    assert.deepEqual(calls, ["2:3"]);
    assert.equal(minted.character, "data:image/png;base64,2:3");
    assert.equal(minted.location, "data:image/png;base64,place");
  });

  it("reads a bundled plate from disk and refuses an unsafe URL", async () => {
    const loaded = await loadVisionReferenceUrl("assets/superheroes/power.png");
    assert.match(loaded, /^data:image\/png;base64,/);
    assert.equal(await loadVisionReferenceUrl("javascript:alert(1)"), "");
    assert.equal(await loadVisionReferenceUrl("assets/superheroes/missing.png"), "");
  });
});
