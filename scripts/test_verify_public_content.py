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


if __name__ == '__main__':
    unittest.main()
