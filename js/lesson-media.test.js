import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LESSON_IMAGE_CAP,
  LESSON_LINK_CAP,
  hasLessonMedia,
  listLessonMedia,
  tutorNotesForVoice,
} from "./lesson-media.js";

const lesson = `
SEQUENCE:
1) Offer [Page 07 — Software that can pay](https://warmersun.com/lessons/same-day-dollars/07-software-that-can-pay.html).
RESOURCES:
- [Page 07 — Software that can pay](https://warmersun.com/lessons/same-day-dollars/07-software-that-can-pay.html)
- [Page 03 — Two clocks](https://warmersun.com/lessons/same-day-dollars/03-two-clocks.html)
ILLUSTRATIONS:
- ![Software that can pay](https://warmersun.com/lessons/same-day-dollars/illustrations/07-visual.png)
- ![Skip me](http://insecure.example/x.png)
- ![Skip me too](javascript:alert(1))
`;

describe("listLessonMedia", () => {
  it("lists https images and links, and shares one URL across sequence and resources", () => {
    const media = listLessonMedia(lesson);
    assert.deepEqual(
      media.images.map((item) => item.id),
      ["img1"]
    );
    assert.equal(media.images[0].alt, "Software that can pay");
    assert.deepEqual(
      media.links.map((item) => [item.id, item.label]),
      [
        ["link1", "Page 07 — Software that can pay"],
        ["link2", "Page 03 — Two clocks"],
      ]
    );
    assert.equal(hasLessonMedia(media), true);
    assert.equal(hasLessonMedia({ images: [], links: [] }), false);
  });

  it("drops non-https URLs", () => {
    const media = listLessonMedia(lesson);
    assert.equal(
      media.images.some((item) => item.url.startsWith("http://")),
      false
    );
    assert.equal(media.images.some((item) => /javascript:/i.test(item.url)), false);
  });

  it("keeps a localhost content root and drops file URLs from node", () => {
    const media = listLessonMedia(
      "[Page](http://127.0.0.1:8765/content/lessons/harbor/01.html)\n" +
        "[Disk](file:///tmp/pkg/lessons/harbor/01.html)\n" +
        "[Elsewhere](http://example.com/lessons/01.html)"
    );
    assert.deepEqual(
      media.links.map((item) => item.url),
      ["http://127.0.0.1:8765/content/lessons/harbor/01.html"]
    );
  });

  it("caps images and links", () => {
    const images = Array.from({ length: LESSON_IMAGE_CAP + 3 }, (_, i) => {
      return `![Pic ${i}](https://example.com/i${i}.png)`;
    }).join("\n");
    const links = Array.from({ length: LESSON_LINK_CAP + 3 }, (_, i) => {
      return `[Page ${i}](https://example.com/p${i})`;
    }).join("\n");
    const media = listLessonMedia(`${images}\n${links}`);
    assert.equal(media.images.length, LESSON_IMAGE_CAP);
    assert.equal(media.links.length, LESSON_LINK_CAP);
    assert.equal(media.images[0].id, "img1");
    assert.equal(media.images.at(-1).id, `img${LESSON_IMAGE_CAP}`);
  });
});

describe("tutorNotesForVoice", () => {
  it("replaces markdown with ids and leaves no URL", () => {
    const notes = tutorNotesForVoice(lesson);
    assert.match(notes, /img1/);
    assert.match(notes, /link1/);
    assert.match(notes, /link2/);
    assert.doesNotMatch(notes, /https?:\/\//);
    assert.doesNotMatch(notes, /javascript:/);
  });
});
