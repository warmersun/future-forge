#!/usr/bin/env python3
"""Pack, verify, inspect, and unpack a Future Forge quest package (.ffquest).

A package is a zip with manifest.json plus quests/, optional lessons/, and
optional assets/. One package is either a single quest or one learning-module
wrapper plus the lesson quests it lists.

Usage:
  python3 scripts/quest-package.py pack <srcdir> [-o out.ffquest] [--no-validate]
      [--allow-external-lessons]
  python3 scripts/quest-package.py verify <pkg.ffquest> [--allow-external-lessons]
  python3 scripts/quest-package.py inspect <pkg.ffquest> [--json]
  python3 scripts/quest-package.py unpack <pkg.ffquest> <destdir>
      [--lesson-root URL] [--asset-root URL]
      [--allow-external-lessons]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import posixpath
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

SCHEMA_V1 = "future-forge.quest-package/v1"
SCHEMA_V2 = "future-forge.quest-package/v2"
SCHEMA = SCHEMA_V1
MAX_MODULE_LESSONS = 24
# Hosts authors may still write. pack turns them into package paths.
LEGACY_LESSON_BASE = "https://warmersun.com/lessons/"
LEGACY_ASSET_BASE = "https://warmersun.com/future-forge/quests/assets/"
PATHS = {"lessons": "lessons/", "assets": "assets/"}
# Game-server stills. They are not package files unless the zip actually has them.
GAME_ASSET_PREFIXES = ("assets/problems/", "assets/quests/")
TOP_LEVEL_V1 = frozenset({"quests", "lessons", "assets"})
TOP_LEVEL = TOP_LEVEL_V1 | frozenset({"predictions"})
MAX_ZIP_ENTRIES = 512
MAX_ZIP_ENTRY_BYTES = 8_000_000
MAX_ZIP_TOTAL_BYTES = 32_000_000
ID_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$")
TITLE_RE = re.compile(r"<title>([^<]*)</title>", re.IGNORECASE)
HREF_RE = re.compile(
    r"""(?:href|src)\s*=\s*["']([^"']+)["']""", re.IGNORECASE
)
TEXT_SUFFIXES = frozenset({".json", ".html", ".htm"})
URL_STOP = set(" \t\n\r\"'<>)")


class PackageError(Exception):
    """One or more package problems. messages are already human-readable."""

    def __init__(self, messages: list[str]):
        self.messages = messages
        super().__init__("\n".join(messages))


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(1)


def sha256_hex(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


def compare_utf8_paths(left: str, right: str) -> int:
    """Sort by raw UTF-8 bytes. Matches js/package-identity.js."""
    a = left.encode("utf-8")
    b = right.encode("utf-8")
    if a < b:
        return -1
    if a > b:
        return 1
    return 0


def package_revision(schema: str, package_id: str, files: dict[str, str]) -> str:
    """sha256 of [schema, id, [[path, digest], ...]] with no whitespace."""
    pairs = []
    for rel, digest in files.items():
        if rel == "manifest.json":
            continue
        hex_digest = str(digest or "")
        if hex_digest.startswith("sha256:"):
            hex_digest = hex_digest[len("sha256:") :]
        pairs.append([rel, hex_digest.lower()])
    pairs.sort(key=lambda row: row[0].encode("utf-8"))
    encoded = json.dumps(
        [schema, package_id, pairs], ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    return sha256_hex(encoded)


def safe_zip_name(name: str) -> bool:
    if not name or name.endswith("/"):
        return False
    pure = PurePosixPath(name)
    if pure.is_absolute() or ".." in pure.parts:
        return False
    if "\\" in name or name.startswith("/"):
        return False
    return True


def read_tree_from_dir(src: Path) -> dict[str, bytes]:
    if not src.is_dir():
        die(f"not a directory: {src}")
    tree: dict[str, bytes] = {}
    for path in sorted(src.rglob("*")):
        if path.is_symlink() or not path.is_file():
            continue
        rel = path.relative_to(src).as_posix()
        if rel == "manifest.json":
            print("warning: ignoring source manifest.json; pack rebuilds it", file=sys.stderr)
            continue
        if not safe_zip_name(rel):
            die(f"refusing path {rel}")
        top = rel.split("/", 1)[0]
        if top not in TOP_LEVEL:
            die(f"unexpected file {rel} (only quests/, lessons/, assets/)")
        tree[rel] = path.read_bytes()
    return tree


def read_tree_from_zip(pkg: Path) -> dict[str, bytes]:
    if not pkg.is_file():
        die(f"not a file: {pkg}")
    tree: dict[str, bytes] = {}
    total = 0
    try:
        with ZipFile(pkg) as zf:
            infos = [info for info in zf.infolist() if not info.is_dir()]
            if len(infos) > MAX_ZIP_ENTRIES:
                die(f"package_integrity_failed: more than {MAX_ZIP_ENTRIES} entries")
            seen: set[str] = set()
            for info in infos:
                name = info.filename
                if name in seen:
                    die(f"package_integrity_failed: duplicate zip entry {name!r}")
                seen.add(name)
                if info.external_attr >> 16 & 0o170000 == 0o120000:
                    die(f"package_integrity_failed: symlink entry {name!r}")
                if not safe_zip_name(name):
                    die(f"package_integrity_failed: refusing zip entry {name!r}")
                if info.file_size > MAX_ZIP_ENTRY_BYTES:
                    die(
                        f"package_integrity_failed: {name} exceeds "
                        f"{MAX_ZIP_ENTRY_BYTES} decompressed bytes"
                    )
                total += info.file_size
                if total > MAX_ZIP_TOTAL_BYTES:
                    die(
                        f"package_integrity_failed: package exceeds "
                        f"{MAX_ZIP_TOTAL_BYTES} decompressed bytes"
                    )
                data = zf.read(info)
                if len(data) != info.file_size:
                    die(f"package_integrity_failed: size mismatch for {name}")
                tree[name] = data
    except PackageError:
        raise
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001 — zipfile raises several types
        die(f"cannot read {pkg}: {e}")
    if "manifest.json" not in tree:
        die("package has no manifest.json")
    return tree


def load_json(data: bytes, label: str) -> Any:
    try:
        return json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise PackageError([f"{label}: invalid JSON ({e})"]) from e


def lesson_title(html: bytes, folder: str) -> str:
    try:
        text = html.decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return folder
    match = TITLE_RE.search(text)
    if not match:
        return folder
    title = match.group(1).strip()
    if " · " in title:
        title = title.split(" · ", 1)[0].strip()
    return title or folder


def collect_quests(tree: dict[str, bytes]) -> list[dict[str, Any]]:
    errors: list[str] = []
    quests: list[dict[str, Any]] = []
    seen: dict[str, str] = {}
    for rel in sorted(tree):
        if not (rel.startswith("quests/") and rel.endswith(".json")):
            continue
        if rel.count("/") != 1:
            errors.append(f"{rel}: quest JSON must sit directly in quests/")
            continue
        tile = load_json(tree[rel], rel)
        if not isinstance(tile, dict):
            errors.append(f"{rel}: quest JSON must be an object")
            continue
        qid = str(tile.get("id") or "").strip()
        stem = PurePosixPath(rel).stem
        if not qid or not ID_RE.match(qid):
            errors.append(f"{rel}: id {qid!r} must be a lowercase slug")
        elif stem != qid:
            errors.append(f"{rel}: file name must be {qid}.json")
        if qid in seen:
            errors.append(f"duplicate quest id {qid} in {rel} and {seen[qid]}")
        kind = str(tile.get("kind") or "quest").strip() or "quest"
        if kind not in ("quest", "module"):
            errors.append(f"{rel}: kind must be quest or module, got {kind!r}")
        title = str(tile.get("title") or "").strip()
        entry: dict[str, Any] = {
            "id": qid,
            "file": rel,
            "kind": kind,
            "title": title,
            "tile": tile,
        }
        if kind == "quest" and tile.get("lesson") is not None:
            entry["lesson"] = tile.get("lesson")
        seen[qid] = rel
        quests.append(entry)
    if errors:
        raise PackageError(errors)
    if not quests:
        raise PackageError(["package has no quests/*.json tiles"])
    return quests


def wrapper_lessons(tile: dict[str, Any]) -> list[str]:
    raw = tile.get("lessons")
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        lid = str(item or "").strip()
        if lid:
            out.append(lid)
    return out


def wrapper_total(tile: dict[str, Any], lessons: list[str]) -> int | None:
    if tile.get("totalLessons") is None:
        return len(lessons) or None
    total = tile.get("totalLessons")
    if isinstance(total, int) and not isinstance(total, bool) and total >= 1:
        return total
    return None


def derive_module(quests: list[dict[str, Any]]) -> dict[str, Any] | None:
    wrappers = [q for q in quests if q["kind"] == "module"]
    if not wrappers:
        return None
    tile = wrappers[0]["tile"]
    lessons = wrapper_lessons(tile)
    total = wrapper_total(tile, lessons)
    title = str(tile.get("module") or tile.get("title") or "").strip()
    block: dict[str, Any] = {
        "id": wrappers[0]["id"],
        "title": title,
        "lessons": lessons,
    }
    if total is not None:
        block["totalLessons"] = total
    return block


def order_quests(
    quests: list[dict[str, Any]], module: dict[str, Any] | None
) -> list[dict[str, Any]]:
    by_id = {q["id"]: q for q in quests}
    if not module:
        return sorted(quests, key=lambda q: q["id"])
    ordered: list[dict[str, Any]] = []
    wrapper = by_id.get(module["id"])
    if wrapper:
        ordered.append(wrapper)
    for lid in module["lessons"]:
        quest = by_id.get(lid)
        if quest and quest not in ordered:
            ordered.append(quest)
    for quest in sorted(quests, key=lambda q: q["id"]):
        if quest not in ordered:
            ordered.append(quest)
    return ordered


def text_files(tree: dict[str, bytes]) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for rel, data in tree.items():
        if rel == "manifest.json":
            continue
        if PurePosixPath(rel).suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            out.append((rel, data.decode("utf-8")))
        except UnicodeDecodeError:
            continue
    return out


def lesson_folders(tree: dict[str, bytes]) -> dict[str, str]:
    """folder -> title, for every lessons/<folder>/ that contains files."""
    folders: dict[str, str] = {}
    for rel in tree:
        if not rel.startswith("lessons/"):
            continue
        parts = rel.split("/")
        if len(parts) < 2 or not parts[1]:
            continue
        folders.setdefault(parts[1], parts[1])
    for folder in list(folders):
        index = f"lessons/{folder}/index.html"
        if index in tree:
            folders[folder] = lesson_title(tree[index], folder)
    return folders


def references_lesson_folder(raw: str, lesson_base: str, folder: str) -> bool:
    """True when raw cites this folder and not a longer folder that shares its prefix."""
    prefix = lesson_base + folder
    start = 0
    while True:
        i = raw.find(prefix, start)
        if i < 0:
            return False
        after = i + len(prefix)
        if after >= len(raw) or raw[after] in "/\"' \t\n#?":
            return True
        start = after
    return False


def quests_for_folder(
    quests: list[dict[str, Any]], folder: str, lesson_base: str
) -> list[str]:
    ids: list[str] = []
    for quest in quests:
        if quest["kind"] != "quest":
            continue
        raw = json.dumps(quest["tile"], ensure_ascii=False)
        if references_lesson_folder(raw, lesson_base, folder):
            ids.append(quest["id"])
    def sort_key(qid: str) -> tuple[int, str]:
        quest = next(q for q in quests if q["id"] == qid)
        lesson = quest["tile"].get("lesson")
        if isinstance(lesson, int) and not isinstance(lesson, bool):
            return (lesson, qid)
        return (10_000, qid)

    return sorted(ids, key=sort_key)


def public_quest(quest: dict[str, Any], *, v2: bool = False) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "id": quest["id"],
        "file": quest["file"],
        "kind": quest["kind"],
        "title": quest["title"],
    }
    if "lesson" in quest and isinstance(quest["lesson"], int) and not isinstance(
        quest["lesson"], bool
    ):
        entry["lesson"] = quest["lesson"]
    if v2 and quest["kind"] != "module":
        bank_id = str(quest["tile"].get("predictionBankId") or "").strip()
        if bank_id:
            entry["predictionBankId"] = bank_id
    return entry


def tree_has_world(tree: dict[str, bytes], quests: list[dict[str, Any]]) -> bool:
    if any(rel.startswith("predictions/") and rel.endswith(".json") for rel in tree):
        return True
    return any(
        q["kind"] != "module" and str(q["tile"].get("predictionBankId") or "").strip()
        for q in quests
    )


def prediction_index(tree: dict[str, bytes]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for rel in sorted(tree):
        if not (rel.startswith("predictions/") and rel.endswith(".json")):
            continue
        if rel.count("/") != 1:
            continue
        rows.append({"id": PurePosixPath(rel).stem, "file": rel})
    rows.sort(key=lambda row: row["id"])
    return rows


def run_world_validator(src: Path) -> list[str]:
    """Call the shared Node bank binder. Not skipped by --no-validate."""
    script = Path(__file__).resolve().parent / "validate-quest-package.mjs"
    node = shutil.which("node")
    if node is None:
        return ["node is not on PATH; cannot validate package banks"]
    if not script.is_file():
        return [f"missing world validator {script}"]
    result = subprocess.run(
        [node, str(script), str(src)],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return []
    detail = (result.stdout or result.stderr or "").strip()
    messages = [detail or "package world validation failed"]
    try:
        payload = json.loads(result.stdout or "")
    except json.JSONDecodeError:
        return messages
    parsed = []
    for item in payload.get("errors") or []:
        if isinstance(item, dict) and item.get("message"):
            parsed.append(str(item["message"]))
        elif item:
            parsed.append(str(item))
    return parsed or messages


def build_description(
    tree: dict[str, bytes],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Manifest without files/createdAt/revision, plus the ordered quest records."""
    quests = collect_quests(tree)
    module = derive_module(quests)
    ordered = order_quests(quests, module)
    folders = lesson_folders(tree)
    lessons = []
    for folder in sorted(folders):
        lessons.append(
            {
                "folder": folder,
                "title": folders[folder],
                "questIds": quests_for_folder(quests, folder, PATHS["lessons"]),
            }
        )
    package_id = module["id"] if module else ordered[0]["id"]
    title = ""
    if module:
        title = module["title"]
    else:
        title = ordered[0]["title"]
    v2 = tree_has_world(tree, quests)
    manifest: dict[str, Any] = {
        "schema": SCHEMA_V2 if v2 else SCHEMA_V1,
        "id": package_id,
        "version": 2 if v2 else 1,
        "title": title,
        "quests": [public_quest(q, v2=v2) for q in ordered],
        "lessons": lessons,
        "paths": dict(PATHS),
    }
    if v2:
        manifest["predictions"] = prediction_index(tree)
    if module:
        manifest["module"] = module
    return manifest, ordered


def check_module(
    quests: list[dict[str, Any]],
    manifest_module: dict[str, Any] | None,
    allow_external: bool,
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    wrappers = [q for q in quests if q["kind"] == "module"]
    if len(wrappers) > 1:
        ids = ", ".join(q["id"] for q in wrappers)
        errors.append(f"package has {len(wrappers)} module wrappers ({ids}); expected one")
        return errors, warnings
    derived = derive_module(quests)
    if manifest_module is not None or derived is not None:
        if manifest_module != derived:
            errors.append("manifest.module does not match the module wrapper")
            if derived is None:
                return errors, warnings
    if derived is None:
        learning = [
            q
            for q in quests
            if q["kind"] == "quest" and q["tile"].get("isLearningModule") is True
        ]
        if len(learning) > 1:
            errors.append(
                "multiple learning quests require a kind:module wrapper ("
                + ", ".join(q["id"] for q in learning)
                + ")"
            )
        return errors, warnings

    tile = wrappers[0]["tile"]
    lessons = derived["lessons"]
    if not isinstance(tile.get("lessons"), list):
        errors.append(f"{wrappers[0]['file']}: lessons must be an array")
        return errors, warnings
    if len(lessons) < 1:
        errors.append(f"{derived['id']}: module lessons list is empty")
    if len(lessons) > MAX_MODULE_LESSONS:
        errors.append(
            f"{derived['id']}: {len(lessons)} lessons exceeds {MAX_MODULE_LESSONS}"
        )
    if len(lessons) != len(set(lessons)):
        errors.append(f"{derived['id']}: duplicate id in module lessons")

    total = derived.get("totalLessons")
    if tile.get("totalLessons") is not None and total is None:
        errors.append(f"{derived['id']}: totalLessons must be a positive integer")
    if isinstance(total, int) and lessons and total != len(lessons):
        errors.append(
            f"{derived['id']}: totalLessons {total} does not match "
            f"{len(lessons)} lesson ids"
        )

    by_id = {q["id"]: q for q in quests}
    module_title = derived["title"]
    listed = set(lessons)
    for index, lid in enumerate(lessons, start=1):
        quest = by_id.get(lid)
        if quest is None:
            msg = f"module lesson {lid} is not in the package"
            if allow_external:
                warnings.append(msg + " (allowed as external)")
            else:
                errors.append(msg)
            continue
        if quest["kind"] != "quest":
            errors.append(f"module lesson {lid} is not a kind:quest tile")
            continue
        lesson_tile = quest["tile"]
        if lesson_tile.get("isLearningModule") is not True:
            errors.append(f"{lid}: module lesson must set isLearningModule true")
        got_module = str(lesson_tile.get("module") or "").strip()
        if got_module != module_title:
            errors.append(
                f"{lid}: module {got_module!r} does not match wrapper {module_title!r}"
            )
        got_total = lesson_tile.get("totalLessons")
        if total is not None and got_total != total:
            errors.append(
                f"{lid}: totalLessons {got_total!r} does not match wrapper {total}"
            )
        got_lesson = lesson_tile.get("lesson")
        if got_lesson != index:
            errors.append(
                f"{lid}: lesson {got_lesson!r} is not {index} "
                f"(wrapper order is 1..{len(lessons)})"
            )

    for quest in quests:
        if quest["kind"] != "quest":
            continue
        if quest["tile"].get("isLearningModule") is True and quest["id"] not in listed:
            errors.append(f"{quest['id']}: learning quest is not listed in the module")
        elif quest["id"] not in listed:
            warnings.append(f"{quest['id']}: quest is not part of the module")
    return errors, warnings


def path_boundary_before(text: str, index: int) -> bool:
    if index <= 0:
        return True
    return text[index - 1] in URL_STOP or text[index - 1] in "([`"


def iter_path_tokens(text: str, prefix: str) -> list[tuple[int, int, str]]:
    """Package paths such as lessons/folder/page.html, bounded so a host is not matched."""
    found: list[tuple[int, int, str]] = []
    start = 0
    while True:
        i = text.find(prefix, start)
        if i < 0:
            break
        if not path_boundary_before(text, i):
            start = i + len(prefix)
            continue
        k = i + len(prefix)
        while k < len(text) and text[k] not in URL_STOP:
            k += 1
        raw = text[i:k].split("#", 1)[0].split("?", 1)[0].rstrip(".,;:")
        token = raw
        found.append((i, i + len(token), token))
        start = k
    return found


def resolve_package_token(token: str) -> str | None:
    """Map a lessons/ or assets/ token onto a zip path. None when it names no file."""
    token = token.strip()
    if token in ("lessons", "lessons/", "assets", "assets/"):
        return None
    parts = [p for p in token.split("/") if p and p != "."]
    if not parts or any(p == ".." for p in parts):
        return ""
    if "." not in parts[-1]:
        parts.append("index.html")
    return "/".join(parts)


def is_game_asset(token: str) -> bool:
    return token.startswith(GAME_ASSET_PREFIXES)


def check_links(tree: dict[str, bytes]) -> list[str]:
    errors: list[str] = []
    for rel, text in text_files(tree):
        for _start, _end, token in iter_path_tokens(text, PATHS["lessons"]):
            target = resolve_package_token(token)
            if target is None:
                continue
            if target == "" or target not in tree:
                errors.append(f"{rel}: missing lesson file for {token}")
        for _start, _end, token in iter_path_tokens(text, PATHS["assets"]):
            target = resolve_package_token(token)
            if target is None:
                continue
            if target in tree:
                continue
            if is_game_asset(token):
                continue
            errors.append(f"{rel}: missing asset file for {token}")
        if not rel.endswith((".html", ".htm")):
            continue
        base_dir = str(PurePosixPath(rel).parent)
        for match in HREF_RE.finditer(text):
            ref = match.group(1).strip()
            if not ref or ref.startswith(("#", "mailto:", "data:", "javascript:")):
                continue
            if "://" in ref or ref.startswith("//") or ref.startswith("/"):
                continue
            ref = ref.split("#", 1)[0].split("?", 1)[0]
            if not ref or ref.startswith("lessons/") or ref.startswith("assets/"):
                continue
            resolved = posixpath.normpath(posixpath.join(base_dir, ref))
            if resolved.startswith("..") or resolved not in tree:
                errors.append(f"{rel}: missing relative file {ref}")
    return errors


def check_tree(
    tree: dict[str, bytes],
    manifest: dict[str, Any] | None,
    allow_external: bool,
    expect_hashes: bool,
) -> tuple[dict[str, Any], list[str], list[str]]:
    """Return the canonical manifest, errors, and warnings.

    When manifest is None (pack), the canonical manifest is built from the tree.
    When manifest is provided (verify), it must match that canonical manifest.
    """
    errors: list[str] = []
    warnings: list[str] = []
    try:
        built, quests = build_description(tree)
    except PackageError as e:
        return {}, e.messages, []

    for rel in tree:
        if rel == "manifest.json":
            continue
        if not safe_zip_name(rel):
            errors.append(f"unsafe path {rel}")
        top = rel.split("/", 1)[0]
        if top not in TOP_LEVEL:
            errors.append(f"unexpected file {rel}")

    folders = lesson_folders(tree)
    for folder in folders:
        if not ID_RE.match(folder):
            errors.append(f"lesson folder {folder!r} must be a lowercase slug")
        if f"lessons/{folder}/index.html" not in tree:
            errors.append(f"lessons/{folder}/ has no index.html")

    mod_errors, mod_warnings = check_module(
        quests, built.get("module"), allow_external
    )
    errors.extend(mod_errors)
    warnings.extend(mod_warnings)
    errors.extend(check_links(tree))

    files = {
        rel: sha256_hex(data)
        for rel, data in sorted(tree.items())
        if rel != "manifest.json"
    }
    canonical = dict(built)
    canonical["files"] = files
    if built.get("version") == 2:
        canonical["revision"] = package_revision(SCHEMA_V2, built["id"], files)

    if manifest is None:
        return canonical, errors, warnings

    schema = manifest.get("schema")
    version = manifest.get("version")
    if schema == SCHEMA_V1 and version == 1:
        if built.get("version") != 1:
            errors.append(
                "package_version_unsupported: v1 manifest cannot describe world data"
            )
    elif schema == SCHEMA_V2 and version == 2:
        if built.get("version") != 2:
            errors.append("manifest schema v2 requires packaged world data")
    else:
        errors.append(
            "package_version_unsupported: "
            f"manifest schema {schema!r} version {version!r} is not supported"
        )
    if not str(manifest.get("createdAt") or "").strip():
        errors.append("manifest createdAt is missing")
    else:
        canonical["createdAt"] = manifest["createdAt"]

    compare_keys = ["id", "title", "quests", "lessons", "paths"]
    if built.get("version") == 2:
        compare_keys.append("predictions")
    for key in compare_keys:
        if manifest.get(key) != built.get(key):
            errors.append(f"manifest {key} does not match the package contents")
    if manifest.get("module") != built.get("module"):
        errors.append("manifest.module does not match the module wrapper")
    if built.get("version") == 2 and manifest.get("revision") != canonical.get("revision"):
        errors.append("manifest revision does not match the package contents")
    if expect_hashes and manifest.get("files") != files:
        errors.append("manifest files hashes do not match the package contents")
        stored = manifest.get("files") if isinstance(manifest.get("files"), dict) else {}
        for rel, digest in files.items():
            if stored.get(rel) != digest:
                errors.append(f"hash mismatch for {rel}")
        for rel in stored:
            if rel not in files:
                errors.append(f"manifest lists missing file {rel}")
    return canonical, errors, warnings


def run_validator(src: Path) -> list[str]:
    script = Path(__file__).resolve().parent / "validate-quest.mjs"
    node = shutil.which("node")
    if node is None:
        return ["node is not on PATH; cannot validate quest tiles"]
    if not script.is_file():
        return [f"missing validator {script}"]
    errors: list[str] = []
    for path in sorted(src.glob("quests/*.json")):
        result = subprocess.run(
            [node, str(script), "--strict", str(path)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "").strip()
            errors.append(f"validate-quest failed for {path.name}:\n{detail}")
    return errors


def write_zip(dest: Path, tree: dict[str, bytes], manifest: dict[str, Any]) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    payload = dict(tree)
    payload["manifest.json"] = (
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    ).encode("utf-8")
    with ZipFile(dest, "w") as zf:
        for rel in sorted(payload):
            info = ZipInfo(rel, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            zf.writestr(info, payload[rel])


def report(errors: list[str], warnings: list[str]) -> None:
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)


def load_manifest(tree: dict[str, bytes]) -> dict[str, Any]:
    manifest = load_json(tree["manifest.json"], "manifest.json")
    if not isinstance(manifest, dict):
        die("manifest.json must be an object")
    return manifest


def content_tree(tree: dict[str, bytes]) -> dict[str, bytes]:
    return {rel: data for rel, data in tree.items() if rel != "manifest.json"}


def normalize_legacy_urls(tree: dict[str, bytes]) -> None:
    """Turn known production hosts into package paths before hashing."""
    for rel, data in list(tree.items()):
        if PurePosixPath(rel).suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            continue
        updated = text.replace(LEGACY_LESSON_BASE, PATHS["lessons"]).replace(
            LEGACY_ASSET_BASE, PATHS["assets"]
        )
        if updated != text:
            tree[rel] = updated.encode("utf-8")


def cmd_pack(args: argparse.Namespace) -> None:
    src = Path(args.srcdir).expanduser().resolve()
    tree = read_tree_from_dir(src)
    normalize_legacy_urls(tree)
    canonical, errors, warnings = check_tree(
        tree, None, args.allow_external_lessons, expect_hashes=False
    )
    if canonical.get("version") == 2 or any(
        rel.startswith("predictions/") for rel in tree
    ):
        errors = list(errors) + run_world_validator(src)
    if not args.no_validate:
        errors = list(errors) + run_validator(src)
    report(errors, warnings)
    canonical["createdAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    # createdAt is not part of the content revision. revision excludes itself.
    ordered = {
        "schema": canonical["schema"],
        "id": canonical["id"],
        "version": canonical["version"],
        "createdAt": canonical["createdAt"],
        "title": canonical["title"],
        "quests": canonical["quests"],
    }
    if "module" in canonical:
        ordered["module"] = canonical["module"]
    if canonical.get("version") == 2:
        ordered["predictions"] = canonical.get("predictions") or []
        ordered["revision"] = canonical["revision"]
    ordered["lessons"] = canonical["lessons"]
    ordered["paths"] = canonical["paths"]
    ordered["files"] = canonical["files"]
    dest = Path(args.output).expanduser() if args.output else Path.cwd() / (
        canonical["id"] + ".ffquest"
    )
    write_zip(dest, tree, ordered)
    print(
        f"packed {dest} ({len(canonical['quests'])} quests, "
        f"{len(canonical['lessons'])} lesson folders)"
    )


def cmd_verify(args: argparse.Namespace) -> None:
    pkg = Path(args.package)
    tree = read_tree_from_zip(pkg)
    manifest = load_manifest(tree)
    _canonical, errors, warnings = check_tree(
        content_tree(tree), manifest, args.allow_external_lessons, expect_hashes=True
    )
    if manifest.get("version") == 2:
        work = Path(tempfile.mkdtemp(prefix="ffquest-verify-"))
        try:
            for rel, data in content_tree(tree).items():
                target = work / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
            errors = list(errors) + run_world_validator(work)
        finally:
            shutil.rmtree(work, ignore_errors=True)
    report(errors, warnings)
    print(f"ok: {manifest.get('id')} ({len(manifest.get('files') or {})} files)")


def cmd_inspect(args: argparse.Namespace) -> None:
    tree = read_tree_from_zip(Path(args.package))
    manifest = load_manifest(tree)
    _canonical, errors, warnings = check_tree(
        content_tree(tree), manifest, False, expect_hashes=True
    )
    if args.json:
        json.dump(
            {
                "ok": not errors,
                "errors": errors,
                "warnings": warnings,
                "manifest": manifest,
            },
            sys.stdout,
            indent=2,
            ensure_ascii=False,
        )
        sys.stdout.write("\n")
        if errors:
            raise SystemExit(1)
        return
    files = manifest.get("files") or {}
    size = sum(len(data) for rel, data in tree.items() if rel != "manifest.json")
    print(manifest.get("id"))
    print(f"  title: {manifest.get('title')}")
    print(f"  files: {len(files)} ({size} bytes)")
    module = manifest.get("module")
    if isinstance(module, dict):
        total = module.get("totalLessons", len(module.get("lessons") or []))
        print(f"  module: {module.get('title')} ({total} lessons)")
        by_id = {q.get("id"): q for q in manifest.get("quests") or []}
        folders_for: dict[str, list[str]] = {}
        for lesson in manifest.get("lessons") or []:
            for qid in lesson.get("questIds") or []:
                folders_for.setdefault(qid, []).append(lesson.get("folder") or "")
        for index, lid in enumerate(module.get("lessons") or [], start=1):
            quest = by_id.get(lid) or {}
            folder = ", ".join(folders_for.get(lid) or []) or "-"
            present = "external" if lid not in by_id else folder
            print(
                f"    {index}/{total}  {lid}  {quest.get('title') or ''}  {present}"
            )
    else:
        print("  quests:")
        for quest in manifest.get("quests") or []:
            print(f"    {quest.get('kind')}  {quest.get('id')}  {quest.get('title')}")
    print("  lessons:")
    lessons = manifest.get("lessons") or []
    if not lessons:
        print("    (none)")
    for lesson in lessons:
        ids = ", ".join(lesson.get("questIds") or []) or "-"
        print(f"    {lesson.get('folder')}  {lesson.get('title')}  quests: {ids}")
    if errors:
        print("  links: failed")
        report(errors, warnings)
    else:
        print("  links: ok")
        if manifest.get("revision"):
            print(f"  revision: {manifest.get('revision')}")
        predictions = manifest.get("predictions") or []
        if predictions:
            print("  predictions:")
            for row in predictions:
                print(f"    {row.get('id')}  {row.get('file')}")
        for warning in warnings:
            print(f"warning: {warning}", file=sys.stderr)


def ensure_slash(root: str) -> str:
    root = root.strip()
    if root and not root.endswith("/"):
        root += "/"
    return root


def bind_roots(tree: dict[str, bytes], lesson_root: str, asset_root: str) -> None:
    """Join package paths to absolute roots. Only paths that name a file in the zip."""
    lesson_root = ensure_slash(lesson_root)
    asset_root = ensure_slash(asset_root)
    if not lesson_root and not asset_root:
        return
    for rel, data in list(tree.items()):
        if rel == "manifest.json":
            continue
        if PurePosixPath(rel).suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            continue
        spans: list[tuple[int, int, str]] = []
        if lesson_root:
            for start, end, token in iter_path_tokens(text, PATHS["lessons"]):
                target = resolve_package_token(token)
                if target and target in tree:
                    spans.append((start, end, lesson_root + token[len(PATHS["lessons"]) :]))
        if asset_root:
            for start, end, token in iter_path_tokens(text, PATHS["assets"]):
                target = resolve_package_token(token)
                if target and target in tree:
                    spans.append((start, end, asset_root + token[len(PATHS["assets"]) :]))
        if not spans:
            continue
        for start, end, replacement in sorted(spans, key=lambda item: item[0], reverse=True):
            text = text[:start] + replacement + text[end:]
        tree[rel] = text.encode("utf-8")


def cmd_unpack(args: argparse.Namespace) -> None:
    tree = read_tree_from_zip(Path(args.package))
    manifest = load_manifest(tree)
    _canonical, errors, warnings = check_tree(
        content_tree(tree), manifest, args.allow_external_lessons, expect_hashes=True
    )
    report(errors, warnings)
    dest = Path(args.destdir).expanduser().resolve()
    if dest.exists() and any(dest.iterdir()):
        die(f"refusing to unpack into non-empty directory {dest}")
    dest.mkdir(parents=True, exist_ok=True)
    raw_dir = dest / "raw" if manifest.get("version") == 2 else None
    if raw_dir is not None:
        raw_dir.mkdir(parents=True, exist_ok=True)
        for rel, data in tree.items():
            if not safe_zip_name(rel):
                die(f"refusing path {rel}")
            target = raw_dir / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    projected = dict(tree)
    if args.lesson_root or args.asset_root:
        bind_roots(projected, args.lesson_root or "", args.asset_root or "")
    elif manifest.get("version") == 2:
        print(f"unpacked {manifest.get('id')} raw bytes to {raw_dir}")
        return
    for rel, data in projected.items():
        if not safe_zip_name(rel):
            die(f"refusing path {rel}")
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    if raw_dir is not None:
        print(
            f"unpacked {manifest.get('id')} raw bytes to {raw_dir}; "
            f"delivery projection to {dest}"
        )
    else:
        print(f"unpacked {manifest.get('id')} to {dest}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Future Forge quest package (.ffquest)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    pack = sub.add_parser("pack", help="zip a quests/ lessons/ assets/ directory")
    pack.add_argument("srcdir")
    pack.add_argument("-o", "--output", help="output .ffquest path")
    pack.add_argument(
        "--no-validate",
        action="store_true",
        help="skip node scripts/validate-quest.mjs --strict",
    )
    pack.add_argument("--allow-external-lessons", action="store_true")
    pack.set_defaults(func=cmd_pack)

    verify = sub.add_parser("verify", help="check a .ffquest package")
    verify.add_argument("package")
    verify.add_argument("--allow-external-lessons", action="store_true")
    verify.set_defaults(func=cmd_verify)

    inspect_p = sub.add_parser("inspect", help="print a package summary")
    inspect_p.add_argument("package")
    inspect_p.add_argument("--json", action="store_true")
    inspect_p.set_defaults(func=cmd_inspect)

    unpack = sub.add_parser("unpack", help="extract a package into a directory")
    unpack.add_argument("package")
    unpack.add_argument("destdir")
    unpack.add_argument("--lesson-root", help="absolute base joined to lessons/ paths")
    unpack.add_argument("--asset-root", help="absolute base joined to assets/ paths that are in the package")
    unpack.add_argument("--allow-external-lessons", action="store_true")
    unpack.set_defaults(func=cmd_unpack)

    args = parser.parse_args()
    try:
        args.func(args)
    except PackageError as e:
        report(e.messages, [])


if __name__ == "__main__":
    main()
