import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  t,
  tc,
  normalizeLocale,
  localeStorageKey,
  getLocale,
  outputLanguageName,
  _setCatalogForTests,
  _setContentCatalogForTests,
  _resetI18nForTests,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from "./i18n.js";

describe("i18n core", () => {
  beforeEach(() => {
    _resetI18nForTests();
  });

  it("normalizes locale codes", () => {
    assert.equal(normalizeLocale("hu"), "hu");
    assert.equal(normalizeLocale("HU"), "hu");
    assert.equal(normalizeLocale("hu-HU"), "hu");
    assert.equal(normalizeLocale("en-US"), "en");
    assert.equal(normalizeLocale("xx"), DEFAULT_LOCALE);
    assert.equal(normalizeLocale(""), DEFAULT_LOCALE);
  });

  it("lists supported locales", () => {
    assert.deepEqual(SUPPORTED_LOCALES, ["en", "hu"]);
  });

  it("t falls back to defaultEn when pack missing", () => {
    assert.equal(t("title.tagline", null, "Hello"), "Hello");
    assert.equal(getLocale(), "en");
  });

  it("t uses catalog and interpolates", () => {
    _setCatalogForTests(
      {
        title: { welcome: "Szia, {name}!" },
        toast: { noAp: "Nincs AP" },
      },
      "hu"
    );
    assert.equal(getLocale(), "hu");
    assert.equal(t("title.welcome", { name: "Ada" }, "Hi {name}"), "Szia, Ada!");
    assert.equal(t("toast.noAp", null, "No AP"), "Nincs AP");
    assert.equal(t("missing.key", null, "Fallback EN"), "Fallback EN");
  });

  it("tc reads content catalog", () => {
    _setContentCatalogForTests({
      globals: { climate: { title: "Klímaválság" } },
    });
    _setCatalogForTests({}, "hu");
    assert.equal(tc("globals.climate.title", "Climate Crises"), "Klímaválság");
    assert.equal(tc("globals.missing.title", "Missing"), "Missing");
  });

  it("localeStorageKey scopes non-en keys", () => {
    assert.equal(localeStorageKey("future-forge:scenarioCache:v8", "en"), "future-forge:scenarioCache:v8");
    assert.equal(
      localeStorageKey("future-forge:scenarioCache:v8", "hu"),
      "future-forge:scenarioCache:v8:hu"
    );
  });

  it("outputLanguageName for prompts", () => {
    assert.equal(outputLanguageName("en"), "English");
    assert.equal(outputLanguageName("hu"), "Hungarian");
  });

  it("aiLocaleContext carries locale for co-invent API", async () => {
    const { aiLocaleContext, _setCatalogForTests, _resetI18nForTests } =
      await import("./i18n.js");
    _resetI18nForTests();
    _setCatalogForTests({}, "hu");
    assert.deepEqual(aiLocaleContext(), {
      locale: "hu",
      outputLanguage: "Hungarian",
    });
    _resetI18nForTests();
    assert.deepEqual(aiLocaleContext("en"), {
      locale: "en",
      outputLanguage: "English",
    });
  });
});
