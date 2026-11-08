"""Deterministic object-tag extraction from NASA seed text + curated visuals."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_LEXICON_PATH = _DATA_DIR / "object_lexicon.json"
_VISUAL_PATH = _DATA_DIR / "visual_annotations.json"
_DYNAMIC_PATH = _DATA_DIR / "dynamic_object_tags.json"
_BOUNDARY = r"(?<![a-z0-9]){phrase}(?![a-z0-9])"

# Appearance / people labels must come from curated visual annotations, not caption text.
# Captions often mention "women", "person of color", etc. without those people being in frame.
VISUAL_ONLY_TAGS = frozenset(
    {
        "blue shirt",
        "green shirt",
        "man",
        "men",
        "orange suit",
        "people",
        "person",
        "shirt",
        "shirts",
        "smile",
        "smiling",
        "woman",
        "women",
    }
)

# Appearance chips offered in Add Image so operators classify people the same way
# as curated visual_annotations.json (never inferred from captions alone).
APPEARANCE_TAG_CHOICES: tuple[str, ...] = (
    "man",
    "men",
    "woman",
    "women",
    "smile",
    "smiling",
    "blue shirt",
    "green shirt",
    "orange suit",
    "shirt",
    "astronaut",
    "spacesuit",
)


@lru_cache(maxsize=1)
def load_visual_annotations() -> dict[str, dict]:
    if not _VISUAL_PATH.exists():
        return {}
    payload = json.loads(_VISUAL_PATH.read_text(encoding="utf-8"))
    return payload if isinstance(payload, dict) else {}


@lru_cache(maxsize=1)
def load_dynamic_object_tags() -> tuple[str, ...]:
    if not _DYNAMIC_PATH.exists():
        return ()
    payload = json.loads(_DYNAMIC_PATH.read_text(encoding="utf-8"))
    phrases = [str(p).strip().lower() for p in payload.get("phrases", []) if str(p).strip()]
    return tuple(sorted(set(phrases), key=lambda p: (-len(p), p)))


@lru_cache(maxsize=1)
def load_lexicon() -> tuple[str, ...]:
    """Load the frozen allow-list of object phrases, longest first."""
    payload = json.loads(_LEXICON_PATH.read_text(encoding="utf-8"))
    phrases = [str(p).strip().lower() for p in payload.get("phrases", []) if str(p).strip()]
    # Include curated visual phrases so queries can activate the same pills.
    for entry in load_visual_annotations().values():
        for tag in entry.get("object_tags", []):
            cleaned = str(tag).strip().lower()
            if cleaned:
                phrases.append(cleaned)
    phrases.extend(load_dynamic_object_tags())
    return tuple(sorted(set(phrases), key=lambda p: (-len(p), p)))


def remember_object_tags(tags: list[str] | None) -> list[str]:
    """Persist novel operator/detected tags so they enter search + filter vocabulary."""
    cleaned = sorted(
        {
            str(tag).strip().lower()
            for tag in tags or []
            if str(tag).strip()
        }
    )
    if not cleaned:
        return []

    existing = set(load_dynamic_object_tags())
    known = set(load_lexicon())
    novel = [tag for tag in cleaned if tag not in known]
    if not novel:
        return []

    existing.update(novel)
    _DYNAMIC_PATH.write_text(
        json.dumps({"phrases": sorted(existing)}, indent=2) + "\n",
        encoding="utf-8",
    )
    load_dynamic_object_tags.cache_clear()
    load_lexicon.cache_clear()
    return novel


def normalize_keywords(raw_keywords: list[str] | None) -> list[str]:
    """Split, lowercase, and dedupe NASA keyword strings."""
    if not raw_keywords:
        return []
    tokens: list[str] = []
    seen: set[str] = set()
    for raw in raw_keywords:
        for part in re.split(r"[,;/|]+", str(raw)):
            token = part.strip().lower()
            if len(token) < 2 or token in seen:
                continue
            seen.add(token)
            tokens.append(token)
    return tokens


def _find_spans(text: str, phrases: tuple[str, ...] | None = None) -> list[tuple[int, int, str]]:
    """Return non-overlapping phrase spans, longest match first left-to-right."""
    haystack = text.lower()
    lexicon = phrases or load_lexicon()
    occupied = [False] * len(haystack)
    matches: list[tuple[int, int, str]] = []

    for phrase in lexicon:
        pattern = re.compile(_BOUNDARY.format(phrase=re.escape(phrase)), re.IGNORECASE)
        for match in pattern.finditer(haystack):
            start, end = match.start(), match.end()
            if any(occupied[start:end]):
                continue
            for i in range(start, end):
                occupied[i] = True
            matches.append((start, end, phrase))

    matches.sort(key=lambda item: item[0])
    return matches


def find_lexicon_phrases(text: str, phrases: tuple[str, ...] | None = None) -> list[str]:
    """Return unique lexicon phrases found in text, longest-match suppressed."""
    seen: set[str] = set()
    ordered: list[str] = []
    for _, _, phrase in _find_spans(text, phrases):
        if phrase not in seen:
            seen.add(phrase)
            ordered.append(phrase)
    return ordered


def extract_object_tags(
    *,
    title: str = "",
    description: str = "",
    description_508: str = "",
    keywords: list[str] | None = None,
) -> list[str]:
    """Extract unique sorted object tags that literally occur in the source text."""
    blob = " ".join(
        [
            title or "",
            description or "",
            description_508 or "",
            " ".join(keywords or []),
        ]
    )
    tags = [
        tag
        for tag in find_lexicon_phrases(blob)
        if tag not in VISUAL_ONLY_TAGS
    ]
    return sorted(set(tags))


def visual_tags_for(nasa_id: str | None) -> list[str]:
    if not nasa_id:
        return []
    entry = load_visual_annotations().get(nasa_id) or {}
    return sorted(
        {
            str(tag).strip().lower()
            for tag in entry.get("object_tags", [])
            if str(tag).strip()
        }
    )


def novel_tag_candidates(
    *,
    keywords: list[str] | None = None,
    extra_object_tags: list[str] | None = None,
    known_object_tags: list[str] | None = None,
) -> list[str]:
    """Keyword / operator tokens not yet in the lexicon — pin to grow Filters."""
    known = set(load_lexicon())
    known.update(str(t).strip().lower() for t in known_object_tags or [] if str(t).strip())
    candidates: list[str] = []
    seen: set[str] = set()
    for raw in [*(keywords or []), *(extra_object_tags or [])]:
        token = str(raw).strip().lower()
        if len(token) < 3 or token in known or token in seen or token in VISUAL_ONLY_TAGS:
            continue
        # Skip pure numeric / id-like tokens.
        if token.isdigit():
            continue
        seen.add(token)
        candidates.append(token)
    return candidates


def classify_source(
    *,
    title: str = "",
    description: str = "",
    description_508: str = "",
    keywords: list[str] | None = None,
    nasa_id: str | None = None,
    extra_object_tags: list[str] | None = None,
    persist_novel_tags: bool = False,
) -> list[str]:
    """Merge text extraction, curated visuals, and optional operator-supplied tags."""
    tags = set(
        extract_object_tags(
            title=title,
            description=description,
            description_508=description_508,
            keywords=keywords,
        )
    )
    tags.update(visual_tags_for(nasa_id))
    for tag in extra_object_tags or []:
        cleaned = str(tag).strip().lower()
        if cleaned:
            tags.add(cleaned)
    ordered = sorted(tags)
    if persist_novel_tags:
        remember_object_tags(ordered)
    return ordered
