import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  plainTextFromMarkdown,
  excerptFromBrief,
  renderMarkdownSafe,
  renderChatMarkdown,
  isSafeHttpUrl,
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

  it("default brief render does not emit images", () => {
    const html = renderMarkdownSafe(
      "See ![diagram](https://example.com/a.png) here"
    );
    assert.equal(html.includes("<img"), false);
    assert.match(html, /diagram/);
  });

  it("allowImages renders safe https images", () => {
    const html = renderMarkdownSafe(
      "![diagram](https://example.com/a.png)",
      { allowImages: true }
    );
    assert.match(html, /<img class="md-img"/);
    assert.match(html, /src="https:\/\/example.com\/a.png"/);
    assert.match(html, /alt="diagram"/);
    assert.match(html, /loading="lazy"/);
    assert.match(html, /referrerpolicy="no-referrer"/);
  });

  it("rejects unsafe image URLs", () => {
    const js = renderMarkdownSafe("![x](javascript:alert(1))", {
      allowImages: true,
    });
    assert.equal(js.includes("<img"), false);
    assert.match(js, /x/);

    const data = renderMarkdownSafe("![x](data:image/png;base64,xxx)", {
      allowImages: true,
    });
    assert.equal(data.includes("<img"), false);
  });

  it("autolink bare https URLs when enabled", () => {
    const html = renderMarkdownSafe("Read https://example.com/path please.", {
      autolink: true,
    });
    assert.match(
      html,
      /<a href="https:\/\/example.com\/path"[^>]*>https:\/\/example.com\/path<\/a>/
    );
  });

  it("renderChatMarkdown enables images and autolink", () => {
    const html = renderChatMarkdown(
      "See ![pic](https://cdn.example.com/i.jpg) and https://docs.example.com"
    );
    assert.match(html, /<img class="md-img"/);
    assert.match(html, /href="https:\/\/docs.example.com"/);
  });

  it("isSafeHttpUrl", () => {
    assert.equal(isSafeHttpUrl("https://a.com"), true);
    assert.equal(isSafeHttpUrl("http://a.com/x"), true);
    assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
    assert.equal(isSafeHttpUrl("data:text/html,x"), false);
    assert.equal(isSafeHttpUrl("not a url"), false);
  });
});
