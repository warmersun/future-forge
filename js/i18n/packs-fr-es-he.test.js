/**
 * Pack smoke tests for French, Spanish, and Hebrew locale trees.
 * Loads real JSON from locales/{fr,es,he}/ and exercises content resolvers
 * plus UI catalog lookup via the shipped i18n helpers.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  t,
  normalizeLocale,
  outputLanguageName,
  aiLocaleContext,
  isRtlLocale,
  documentDirection,
  DEFAULT_CONTENT_FILES,
  SUPPORTED_LOCALES,
  _setCatalogForTests,
  _setContentCatalogForTests,
  _resetI18nForTests,
} from "../i18n.js";
import { locGlobal, locTech, domainLabel } from "./content.js";
import { GLOBALS, TECHS } from "../data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const NEW_LOCALES = ["fr", "es", "he"];

function readJson(rel) {
  const p = path.join(ROOT, rel);
  assert.ok(fs.existsSync(p), `missing pack file: ${rel}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function countStrings(obj) {
  let n = 0;
  const walk = (x) => {
    if (typeof x === "string") n += 1;
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") Object.values(x).forEach(walk);
  };
  walk(obj);
  return n;
}

describe("fr/es/he locale packs", () => {
  beforeEach(() => {
    _resetI18nForTests();
  });

  for (const code of NEW_LOCALES) {
    it(`has ui.json + default content files for ${code}`, () => {
      assert.ok(SUPPORTED_LOCALES.includes(code));
      const ui = readJson(`locales/${code}/ui.json`);
      assert.equal(typeof ui, "object");
      assert.ok(countStrings(ui) >= 50, `${code} ui.json should have many strings`);
      for (const file of DEFAULT_CONTENT_FILES) {
        const pack = readJson(`locales/${code}/${file}`);
        assert.equal(typeof pack, "object");
        assert.ok(
          countStrings(pack) >= 1,
          `${code}/${file} should contain at least one string`
        );
      }
    });

    it(`resolves non-English UI + content for ${code}`, () => {
      const ui = readJson(`locales/${code}/ui.json`);
      const domains = readJson(`locales/${code}/domains.json`);
      const globals = readJson(`locales/${code}/globals.json`);
      const techs = readJson(`locales/${code}/techs.json`);

      _setCatalogForTests(ui, code);
      _setContentCatalogForTests({
        domains,
        globals,
        techs,
      });

      assert.equal(normalizeLocale(code), code);
      assert.equal(getOutput(code), outputLanguageName(code));

      const tagline = t("title.tagline", null, "Invent local solutions with emerging tech");
      assert.equal(typeof tagline, "string");
      assert.ok(tagline.length > 0);
      // Should not be the English default when pack has a title.tagline
      if (ui?.title?.tagline) {
        assert.equal(tagline, ui.title.tagline);
        assert.notEqual(tagline, "Invent local solutions with emerging tech");
      }

      const power = domainLabel("power");
      assert.ok(power.length > 0);
      if (domains?.power?.label) {
        assert.equal(power, domains.power.label);
      }

      const climate = GLOBALS.find((g) => g.id === "climate");
      if (climate && globals?.climate?.title) {
        assert.equal(locGlobal(climate).title, globals.climate.title);
        assert.notEqual(locGlobal(climate).title, climate.title);
      }

      const ai = TECHS.find((x) => x.id === "ai");
      if (ai && techs?.ai?.name) {
        assert.equal(locTech(ai).name, techs.ai.name);
      }

      assert.deepEqual(aiLocaleContext(code), {
        locale: code,
        outputLanguage: outputLanguageName(code),
      });

      if (code === "he") {
        assert.equal(isRtlLocale(code), true);
        assert.equal(documentDirection(code), "rtl");
      } else {
        assert.equal(isRtlLocale(code), false);
        assert.equal(documentDirection(code), "ltr");
      }
    });
  }
});

function getOutput(code) {
  return outputLanguageName(code);
}
