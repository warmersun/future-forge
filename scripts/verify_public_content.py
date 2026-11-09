"""Compare published bytes to what here.now actually serves.

HTML may gain the site's social meta tags immediately before </head>.
Markdown is served as an HTML viewer: the file bytes live in
<pre class="md-raw" id="raw">, with text escaped (an apostrophe becomes &#039;).
"""
import re
from html import unescape

# here.now can insert these inert tags immediately before </head> at response time.
# All authored bytes, including any original metadata, must otherwise match exactly.
_METADATA = re.compile(
    rb'(?:<meta (?:property|name)="(?:og:(?:title|description|url|type|image|image:width|image:height)|twitter:(?:image|card))" content="[^"<>\r\n]*"\s*/>\s*)+'
)
# Attribute order varies; both class and id are required on the same tag.
_MARKDOWN_RAW = re.compile(
    br'<pre\b(?=[^>]*\bclass="[^"]*\bmd-raw\b)(?=[^>]*\bid="raw")[^>]*>(.*?)</pre>',
    re.DOTALL,
)


def _html_with_social_metadata(expected: bytes, actual: bytes) -> bool:
    head = expected.lower().find(b'</head>')
    if head < 0 or not actual.startswith(expected[:head]) or not actual.endswith(expected[head:]):
        return False
    added = actual[head:len(actual) - len(expected[head:])]
    return len(added) <= 8192 and _METADATA.fullmatch(added) is not None


def _markdown_viewer(expected: bytes, actual: bytes) -> bool:
    """True when here.now's markdown viewer embeds the exact source text."""
    if b'<!doctype html' not in actual[:200].lower() or b'id="rendered"' not in actual:
        return False
    found = _MARKDOWN_RAW.findall(actual)
    if len(found) != 1:
        return False
    raw = found[0]
    if raw == expected:
        return True
    try:
        restored = unescape(raw.decode('utf-8')).encode('utf-8')
    except UnicodeDecodeError:
        return False
    return restored == expected


def matches_public_content(expected: bytes, actual: bytes, *, is_html: bool) -> bool:
    if actual == expected:
        return True
    if is_html:
        return _html_with_social_metadata(expected, actual)
    return _markdown_viewer(expected, actual)
