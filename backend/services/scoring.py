"""
Weighted keyword overlap scoring for natural-language search and related-image similarity.

Score formula (weights sum to 1.0):
  - Title match:       0.40  (curated, high-precision text)
  - Keywords match:    0.35  (structured metadata)
  - Description match: 0.25  (only first 500 chars to reduce noise)

Per-field score: |query_tokens ∩ field_tokens| / |query_tokens|
Final score: weighted sum, clamped to [0.0, 1.0], rounded to 2 decimal places.
"""

import re
from typing import List

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for",
    "is", "was", "are", "were", "be", "been", "it", "this", "that",
    "with", "from", "by", "as", "into",
}

WEIGHTS = {"title": 0.40, "keywords": 0.35, "description": 0.25}


def tokenize(text: str) -> set:
    """Lowercase, strip punctuation, split on non-alphanumeric, remove stopwords."""
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return {t for t in tokens if t not in STOPWORDS and len(t) > 1}


def _field_overlap(query_tokens: set, field_tokens: set) -> float:
    if not query_tokens:
        return 0.0
    return len(query_tokens & field_tokens) / len(query_tokens)


def score_source(query: str, name: str, keywords: str, description: str) -> float:
    """Compute confidence score [0.0, 1.0] for a source against a free-text query."""
    q = tokenize(query)
    if not q:
        return 0.0
    raw = (
        WEIGHTS["title"] * _field_overlap(q, tokenize(name))
        + WEIGHTS["keywords"] * _field_overlap(q, tokenize(keywords))
        + WEIGHTS["description"] * _field_overlap(q, tokenize(description[:500]))
    )
    return round(min(raw, 1.0), 2)


def score_sources(
    query: str,
    sources: List[dict],
    min_score: float = 0.05,
) -> List[tuple]:
    """
    Score all sources against a query.
    Returns (id, score) pairs sorted descending, filtered by min_score.
    """
    scored = [
        (s["id"], score_source(query, s["name"], s.get("keywords", ""), s.get("description", "")))
        for s in sources
    ]
    return sorted(
        [(id_, sc) for id_, sc in scored if sc >= min_score],
        key=lambda x: x[1],
        reverse=True,
    )
