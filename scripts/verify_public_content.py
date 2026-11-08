"""Compare published bytes, allowing here.now's injected social metadata in HTML."""
import re

# here.now can insert these inert tags immediately before </head> at response time.
# All authored bytes, including any original metadata, must otherwise match exactly.
_METADATA = re.compile(
    rb'(?:<meta (?:property|name)="(?:og:(?:title|description|url|type|image|image:width|image:height)|twitter:(?:image|card))" content="[^"<>\r\n]*"\s*/>\s*)+'
)


def matches_public_content(expected: bytes, actual: bytes, *, is_html: bool) -> bool:
    if actual == expected:
        return True
    if not is_html:
        return False
    head = expected.lower().find(b'</head>')
    if head < 0 or not actual.startswith(expected[:head]) or not actual.endswith(expected[head:]):
        return False
    added = actual[head:len(actual) - len(expected[head:])]
    return len(added) <= 8192 and _METADATA.fullmatch(added) is not None
