import test from "node:test";
import assert from "node:assert/strict";
import { approvedPackageDeliveryRoot, projectPackageDelivery } from "./package-delivery.mjs";

const options = { deliveryRoot: "https://media.example/root/", objectRoot: "private/packages/fixture/revision", members: { "assets/chart.png": "digest", "lessons/start.html": "digest" } };

test("delivery roots reject unsafe protocols, credentials, traversal and URL metadata", () => {
  for (const root of ["http://example.com/", "file:///content", "/content", "//example.com", "https://u:p@example.com/", "https://example.com/?token=secret", "https://example.com/#frag", "https://example.com/a/../b", "https://example.com/%2e%2e/", " https://example.com/", "https://example.com/\\evil"]) {
    assert.throws(() => approvedPackageDeliveryRoot(root), { code: "package_delivery_root_forbidden" }, root);
  }
});

test("only hashed assets and lessons may be projected; traversal and source world links fail", () => {
  for (const url of ["assets/../quests/private.json", "../lessons/start.html", "/assets/chart.png", "//evil.example/image", "assets/%2e%2e/secret", "assets/evil\\image", "quests/private.json", "predictions/private.json", "javascript:alert(1)"]) {
    assert.throws(() => projectPackageDelivery({ mission: { titleImageUrl: url } }, options), { code: "package_delivery_path_forbidden" }, url);
  }
  assert.throws(() => projectPackageDelivery({ mission: { briefMd: "[Missing](lessons/missing.html)" } }, options), { code: "package_dependency_missing" });
});

test("engine-served stills stay on the game origin unless the release actually ships them", () => {
  const imageUrl = "assets/quests/companion-moonshots-304/title.jpg";
  const source = { mission: { imageUrl } };
  const unshipped = projectPackageDelivery(source, { ...options, deliveryRoot: undefined });
  assert.equal(unshipped.record.mission.imageUrl, imageUrl);
  const shipped = projectPackageDelivery(source, { ...options, members: { [imageUrl]: "digest" } });
  assert.equal(shipped.record.mission.imageUrl, `${shipped.deliveryRoot}${imageUrl}`);
  assert.throws(() => projectPackageDelivery({ imageUrl: "assets/missing.png" }, options), { code: "package_dependency_missing" });
});

test("nested beat/module fields and tutor markdown project with no source mutation", () => {
  const source = { coverImageUrl: "./assets/chart.png", overviewMd: "[Lesson](lessons/start.html#intro)", mission: { briefBeats: [{ imageUrl: "assets/chart.png" }], aiTutorContext: "[Guide](lessons/start.html)", grounding: "[External](https://example.com/source)" } };
  const before = structuredClone(source);
  const result = projectPackageDelivery(source, options);
  assert.equal(result.record.coverImageUrl, `${result.deliveryRoot}assets/chart.png`);
  assert.equal(result.record.mission.briefBeats[0].imageUrl, result.record.coverImageUrl);
  assert.ok(result.record.overviewMd.includes(`${result.deliveryRoot}lessons/start.html#intro`));
  assert.ok(result.record.mission.aiTutorContext.includes(`${result.deliveryRoot}lessons/start.html`));
  assert.equal(result.record.mission.grounding, source.mission.grounding);
  assert.deepEqual(source, before);
  assert.deepEqual(projectPackageDelivery({ mission: { briefMd: "No shipped links." } }, { ...options, deliveryRoot: undefined }).record, { mission: { briefMd: "No shipped links." } });
});
