import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  plainTextFromMarkdown,
  excerptFromBrief,
  renderMarkdownSafe,
} from "./md-lite.js";

describe("md-lite", () => {
  it("escapes HTML", () => {
    assert.equal(escapeHtml(`<a "x">`), "&lt;a &quot;x&quot;&gt;");
  });

  it("renders headings, bold, lists", () => {
    const html = renderMarkdownSafe(
      "## The place\n\nHello **world**.\n\n- one\n- two\n"
    );
    assert.match(html, /<h2>The place<\/h2>/);
    assert.match(html, /<strong>world<\/strong>/);
    assert.match(html, /<ul>.*<li>one<\/li>.*<li>two<\/li>.*<\/ul>/s);
  });

  it("allows https links only", () => {
    const ok = renderMarkdownSafe("[x](https://example.com)");
    assert.match(ok, /href="https:\/\/example.com"/);
    assert.match(ok, /rel="noopener noreferrer"/);

    const bad = renderMarkdownSafe("[x](javascript:alert(1))");
    assert.equal(bad.includes("javascript"), false);
    assert.match(bad, /<p>x<\/p>/);
  });

  it("strips raw HTML tags", () => {
    const html = renderMarkdownSafe("Hi <script>alert(1)</script> there");
    assert.equal(html.includes("<script"), false);
    assert.match(html, /Hi/);
  });

  it("plainText and excerpt", () => {
    const plain = plainTextFromMarkdown("## Title\n\n**Bold** text");
    assert.equal(plain.includes("##"), false);
    assert.match(plain, /Bold text/);
    const ex = excerptFromBrief("a".repeat(300), 20);
    assert.ok(ex.endsWith("…"));
    assert.ok(ex.length <= 20);
  });
});
