"""Simulated confidence scoring for text + object-tag search."""

from __future__ import annotations

import re
from dataclasses import dataclass
from itertools import product

from services.tag_extractor import find_lexicon_phrases, load_lexicon

STOPWORDS = frozenset(
    {
        "a",
        "an",
        "the",
        "of",
        "with",
        "and",
        "in",
        "on",
        "for",
        "to",
        "from",
        "by",
        "at",
        "or",
    }
)

# Lightweight plural / gender-group expansions for curated visual tags.
_SYNONYMS: dict[str, set[str]] = {
    "man": {"men"},
    "men": {"man"},
    "woman": {"women"},
    "women": {"woman"},
    "shirt": {"shirts"},
    "shirts": {"shirt"},
    "person": {"people"},
    "people": {"person"},
    "smile": {"smiling", "smiles"},
    "smiling": {"smile", "smiles"},
    "smiles": {"smile", "smiling"},
}

_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9\-]*", re.IGNORECASE)
_BOUNDARY = r"(?<![a-z0-9]){phrase}(?![a-z0-9])"


@dataclass(frozen=True)
class ScoreResult:
    confidence: float
    activated_object_tags: list[str]
    matched_object_tags: list[str]
    matched_keywords: list[str]
    matched_terms: list[str]


def _whole_word_present(haystack: str, needle: str) -> bool:
    if not needle:
        return False
    return re.search(_BOUNDARY.format(phrase=re.escape(needle)), haystack, re.IGNORECASE) is not None


def _expand_term(term: str) -> set[str]:
    variants = {term}
    variants.update(_SYNONYMS.get(term, set()))
    return variants


def _query_parts(query: str) -> tuple[list[str], list[str]]:
    """Return (activated phrases P, remaining content tokens Q)."""
    normalized = (query or "").lower().strip()
    if not normalized:
        return [], []

    phrases = find_lexicon_phrases(normalized, load_lexicon())
    occupied = [False] * len(normalized)
    for phrase in phrases:
        pattern = re.compile(_BOUNDARY.format(phrase=re.escape(phrase)), re.IGNORECASE)
        for match in pattern.finditer(normalized):
            for i in range(match.start(), match.end()):
                occupied[i] = True

    tokens: list[str] = []
    for match in _TOKEN_RE.finditer(normalized):
        start, end = match.start(), match.end()
        if any(occupied[start:end]):
            continue
        token = match.group(0).lower()
        if token in STOPWORDS:
            continue
        tokens.append(token)
    return phrases, tokens


def _tag_matches(term: str, image_tags: set[str]) -> bool:
    return any(variant in image_tags for variant in _expand_term(term))


def _proximity_bonus(description: str, matched: list[str]) -> float:
    if not matched:
        return 0.0
    words = _TOKEN_RE.findall((description or "").lower())
    if not words:
        return 0.0

    positions: list[list[int]] = []
    for term in matched:
        term_words = term.lower().split()
        term_hits: list[int] = []
        if len(term_words) == 1:
            for idx, word in enumerate(words):
                if word == term_words[0] or word in _expand_term(term_words[0]):
                    term_hits.append(idx)
        else:
            n = len(term_words)
            for idx in range(len(words) - n + 1):
                if words[idx : idx + n] == term_words:
                    term_hits.append(idx)
        if not term_hits:
            return 0.0
        positions.append(term_hits)

    for combo in product(*positions):
        if max(combo) - min(combo) < 8:
            return 0.05
    return 0.0


def score_source(
    *,
    query: str,
    title: str,
    description: str,
    keywords: list[str] | None,
    object_tags: list[str] | None,
) -> ScoreResult:
    """Score one image against a free-text query. Confidence is 0..100."""
    phrases, tokens = _query_parts(query)
    activated = list(phrases)
    query_terms = list(dict.fromkeys([*phrases, *tokens]))
    if not query_terms:
        return ScoreResult(0.0, activated, [], [], [])

    image_tags = set(object_tags or [])
    image_keywords = set(keywords or [])
    title_l = (title or "").lower()
    description_l = (description or "").lower()
    text_blob = f"{title_l} {description_l}"

    matched_object_tags = [p for p in phrases if _tag_matches(p, image_tags)]
    # Also count synonym token hits against object tags when the phrase list missed them.
    for token in tokens:
        if _tag_matches(token, image_tags) and token not in matched_object_tags:
            # Promote token-level visual hits into object matches for scoring weight.
            matched_object_tags.append(token)
            if token not in activated:
                activated.append(token)

    # Visual/object phrases in the query are AND constraints: every activated phrase
    # must appear on the image (via tag or synonym) or the hit is discarded.
    if phrases and len(matched_object_tags) < len(phrases):
        return ScoreResult(0.0, activated, matched_object_tags, [], [])

    matched_keywords = [t for t in query_terms if t in image_keywords or any(v in image_keywords for v in _expand_term(t))]
    matched_terms = [
        t
        for t in query_terms
        if _whole_word_present(text_blob, t)
        or any(_whole_word_present(text_blob, v) for v in _expand_term(t))
    ]

    denom = len(query_terms)
    object_score = 1.0 if phrases and matched_object_tags else (
        (len(matched_object_tags) / max(1, len([t for t in tokens if _tag_matches(t, image_tags)])))
        if matched_object_tags
        else 0.0
    )

    keyword_score = len(matched_keywords) / denom
    text_score = len(matched_terms) / denom

    title_bonus = (
        0.05
        if any(
            _whole_word_present(title_l, t) or any(_whole_word_present(title_l, v) for v in _expand_term(t))
            for t in query_terms
        )
        else 0.0
    )
    proximity_bonus = _proximity_bonus(description_l, matched_terms)

    if phrases or matched_object_tags:
        raw = (
            0.60 * object_score
            + 0.20 * keyword_score
            + 0.15 * text_score
            + title_bonus
            + proximity_bonus
        )
    else:
        raw = 0.45 * keyword_score + 0.50 * text_score + title_bonus + proximity_bonus

    confidence = round(max(0.0, min(100.0, 100.0 * raw)), 1)
    return ScoreResult(
        confidence=confidence,
        activated_object_tags=activated,
        matched_object_tags=matched_object_tags,
        matched_keywords=matched_keywords,
        matched_terms=matched_terms,
    )
