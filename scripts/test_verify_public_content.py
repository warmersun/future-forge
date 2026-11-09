import unittest
from verify_public_content import matches_public_content


class PublicContentTests(unittest.TestCase):
    def test_exact_bytes_always_match(self):
        self.assertTrue(matches_public_content(b'content', b'content', is_html=False))

    def test_only_approved_head_metadata_can_be_added(self):
        original = b'<html><head><title>T</title></head><body>text</body></html>'
        metadata = b'<meta property="og:title" content="Lesson" />\n<meta name="twitter:card" content="summary_large_image" />\n'
        rendered = original.replace(b'</head>', metadata + b'</head>')
        self.assertTrue(matches_public_content(original, rendered, is_html=True))
        self.assertFalse(matches_public_content(original, rendered, is_html=False))
        self.assertFalse(matches_public_content(original, rendered.replace(b'text', b'evil'), is_html=True))
        self.assertFalse(matches_public_content(original, rendered.replace(b'og:title', b'evil:script'), is_html=True))
        self.assertFalse(matches_public_content(original, rendered.replace(b'content="Lesson"', b'content="Lesson" onload="evil"'), is_html=True))
        self.assertFalse(matches_public_content(original, rendered.replace(b'</head>', b'<script>bad()</script></head>'), is_html=True))
        self.assertFalse(matches_public_content(original, rendered.replace(b'</body>', b'x</body>'), is_html=True))

    def test_no_head_no_allowance(self):
        self.assertFalse(matches_public_content(b'no head', b'no head<meta name="twitter:card" content="x" />', is_html=True))

    def _viewer(self, raw: bytes) -> bytes:
        return (
            b'<!doctype html>\n<html><head><title>index.md</title></head><body>'
            b'<div class="md-rendered" id="rendered"><p>Formatted view</p></div>\n'
            b'<pre class="md-raw" id="raw">' + raw + b'</pre>\n'
            b'<script>function toggleView(){}</script></body></html>'
        )

    def test_markdown_viewer_embeds_exact_source(self):
        source = b"# Notes\n\nCompare today's picture.\n"
        escaped = source.replace(b"'", b'&#039;')
        self.assertTrue(matches_public_content(source, self._viewer(escaped), is_html=False))
        self.assertTrue(matches_public_content(source, self._viewer(source), is_html=False))
        self.assertTrue(matches_public_content(b'&#039;', self._viewer(b'&amp;#039;'), is_html=False))
        self.assertFalse(matches_public_content(source, self._viewer(b'# Notes\n\nCompare today\'s picture.\n\nextra\n'), is_html=False))
        self.assertFalse(matches_public_content(source, self._viewer(escaped), is_html=True))
        bare = self._viewer(escaped).replace(b'id="rendered"', b'id="other"')
        self.assertFalse(matches_public_content(source, bare, is_html=False))
        doubled = self._viewer(escaped) + b'<pre class="md-raw" id="raw">' + escaped + b'</pre>'
        self.assertFalse(matches_public_content(source, doubled, is_html=False))


if __name__ == '__main__':
    unittest.main()
