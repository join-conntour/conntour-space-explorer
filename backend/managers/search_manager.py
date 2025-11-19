import logging
import re
import uuid
from typing import Optional

from snowballstemmer import EnglishStemmer

from constants import (
    CONFIDENCE_THRESHOLD_MIN,
    MAX_SEARCH_RESULTS,
    SCORE_WEIGHT_DESCRIPTION,
    SCORE_WEIGHT_KEYWORDS,
    SCORE_WEIGHT_TITLE,
)
from db_instance import db
from models import SearchResponse, Source
from utils.date_utils import filter_items_by_date_range

logger = logging.getLogger(__name__)

# Common stop words to filter out
STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "has", "he", "in", "is", "it", "its", "of", "on", "that", "the",
    "to", "was", "will", "with"
}

# Initialize stemmer once (lightweight and efficient)
_stemmer = EnglishStemmer()

# Cache for stemmed words to avoid redundant processing
# Limited to 10,000 entries to prevent unbounded memory growth
_MAX_CACHE_SIZE = 10000
_stem_cache: dict[str, str] = {}


def stem_word(word: str) -> str:
    """
    Stem a word using Snowball stemmer with caching.

    Cache is limited to prevent unbounded memory growth.
    When cache exceeds max size, oldest entries are removed (FIFO).
    """
    if len(word) <= 2:
        return word

    word_lower = word.lower()

    # Check cache first
    if word_lower in _stem_cache:
        return _stem_cache[word_lower]

    # If cache is full, remove oldest entry (simple FIFO)
    if len(_stem_cache) >= _MAX_CACHE_SIZE:
        # Remove first (oldest) entry
        oldest_key = next(iter(_stem_cache))
        del _stem_cache[oldest_key]

    # Stem and cache
    _stem_cache[word_lower] = _stemmer.stemWord(word_lower)
    return _stem_cache[word_lower]


def tokenize_query(query: str) -> list[str]:
    """Tokenize and clean query string."""
    # Lowercase and split on whitespace
    words = query.lower().split()
    # Remove stop words and empty strings, then stem
    return [stem_word(w) for w in words if w not in STOP_WORDS and len(w) > 0]


def extract_original_query_words(query: str) -> list[str]:
    """Extract original (non-stemmed) query words, filtering stop words."""
    # Lowercase and split on whitespace
    words = query.lower().split()
    # Remove stop words and empty strings, but don't stem
    return [w for w in words if w not in STOP_WORDS and len(w) > 0]


def _normalize_keywords(keywords: list[str]) -> tuple[list[str], list[str], set[str]]:
    """Extract and normalize keywords from a list of keyword strings.

    Args:
        keywords: List of keyword strings (may contain comma-separated values)

    Returns:
        Tuple of (keywords_list, keywords_lower, keywords_stemmed)
    """
    keywords_list = []
    keywords_lower = []
    for kw in keywords:
        if isinstance(kw, str):
            for k in kw.lower().split(','):
                k_clean = k.strip()
                if k_clean:
                    keywords_list.append(k_clean)
                    keywords_lower.append(k_clean.lower())

    keywords_stemmed = {stem_word(k) for k in keywords_lower}
    return keywords_list, keywords_lower, keywords_stemmed


def _count_exact_keyword_matches(original_query_words: list[str], keywords_lower: list[str]) -> int:
    """Count exact whole-word matches between query words and keywords.

    Args:
        original_query_words: Original (non-stemmed) query words
        keywords_lower: Lowercased keyword strings

    Returns:
        Number of exact matches found
    """
    exact_matches = 0
    for orig_word in original_query_words:
        orig_lower = orig_word.lower()
        for kw_lower in keywords_lower:
            kw_words = kw_lower.split()
            if orig_lower == kw_lower or orig_lower in kw_words:
                exact_matches += 1
                break  # Count each query word only once
    return exact_matches


def _count_stemmed_keyword_matches(query_words: list[str], keywords_stemmed: set[str]) -> int:
    """Count stemmed (fuzzy) matches between query words and keywords.

    Args:
        query_words: Stemmed query words
        keywords_stemmed: Set of stemmed keywords

    Returns:
        Number of stemmed matches found
    """
    return sum(
        1
        for word in query_words
        if any(word in keyword or keyword in word for keyword in keywords_stemmed)
    )


def _apply_keyword_score_boosts(base_score: float, matches: int, query_word_count: int) -> float:
    """Apply boost multipliers to keyword score based on match completeness.

    Args:
        base_score: Base score before boosts
        matches: Number of matches found
        query_word_count: Total number of query words

    Returns:
        Score with boosts applied
    """
    # Boost if all query words match
    if matches == query_word_count and query_word_count > 1:
        base_score *= 1.5

    # Additional boost for single-word queries when keyword matches
    if matches == query_word_count == 1:
        base_score *= 1.5

    return base_score


def calculate_keyword_score(keywords: list[str], query_words: list[str], original_query_words: list[str] = None) -> float:
    """Calculate keyword matching score for query words.

    Args:
        keywords: List of keyword strings (may contain comma-separated values)
        query_words: Stemmed query words for fuzzy matching
        original_query_words: Original (non-stemmed) query words for exact matching
    """
    if not keywords or not query_words:
        return 0.0

    keywords_list, keywords_lower, keywords_stemmed = _normalize_keywords(keywords)

    # Check for exact matches first (case-insensitive) - these get highest priority
    exact_matches = 0
    if original_query_words:
        exact_matches = _count_exact_keyword_matches(original_query_words, keywords_lower)

    # Check for stemmed matches (fuzzy matching)
    stemmed_matches = _count_stemmed_keyword_matches(query_words, keywords_stemmed)

    # Use exact matches if available, otherwise fall back to stemmed matches
    matches = exact_matches if exact_matches > 0 else stemmed_matches

    # Base score: exact matches get full weight, stemmed matches get reduced weight
    if exact_matches > 0:
        base_score = exact_matches * SCORE_WEIGHT_KEYWORDS * 2.0  # 2x boost for exact matches
    else:
        base_score = stemmed_matches * SCORE_WEIGHT_KEYWORDS * 0.7  # Reduced weight for stemmed matches

    base_score = _apply_keyword_score_boosts(base_score, matches, len(query_words))

    return base_score


def calculate_title_score(title: str, query_words: list[str], original_query: str = "") -> float:
    """Calculate title matching score for query words."""
    if not title or not query_words:
        return 0.0

    title_lower = title.lower()

    # Check for exact phrase match (big boost)
    if original_query and original_query.lower() in title_lower:
        return SCORE_WEIGHT_TITLE * len(query_words) * 2.0

    # Extract words from title and stem them
    title_words = {stem_word(w) for w in re.findall(r'\b\w+\b', title_lower)}

    # Count matches: each query word that appears in title
    matches = sum(1 for word in query_words if word in title_words)

    base_score = matches * SCORE_WEIGHT_TITLE

    # Boost if all query words match in title
    if matches == len(query_words) and len(query_words) > 1:
        base_score *= 1.5

    return base_score


def calculate_description_score(description: str, query_words: list[str], original_query: str = "") -> float:
    """Calculate description matching score for query words."""
    if not description or not query_words:
        return 0.0

    description_lower = description.lower()

    # Check for exact phrase match (boost)
    if original_query and original_query.lower() in description_lower:
        return SCORE_WEIGHT_DESCRIPTION * len(query_words) * 1.5

    # Extract words from description and stem them
    description_words = {stem_word(w) for w in re.findall(r'\b\w+\b', description_lower)}

    # Count matches: each query word that appears in description
    matches = sum(1 for word in query_words if word in description_words)

    base_score = matches * SCORE_WEIGHT_DESCRIPTION

    # Boost if all query words match
    if matches == len(query_words) and len(query_words) > 1:
        base_score *= 1.3

    return base_score


def _extract_stemmed_words_from_text(text: str) -> set[str]:
    """Extract and stem all words from a text string.

    Args:
        text: Text to extract words from

    Returns:
        Set of stemmed words
    """
    return {stem_word(w) for w in re.findall(r'\b\w+\b', text.lower())}


def _find_matched_query_words(query_words: list[str], title: str, description: str, keywords: list[str]) -> set[str]:
    """Find which query words matched across title, description, and keywords.

    Args:
        query_words: Stemmed query words
        title: Source title
        description: Source description
        keywords: Source keywords

    Returns:
        Set of matched query words
    """
    title_lower = title.lower() if title else ""
    desc_lower = description.lower() if description else ""

    # Normalize keywords
    _, _, keywords_stemmed = _normalize_keywords(keywords)

    # Stem words from title and description
    title_words_stemmed = _extract_stemmed_words_from_text(title_lower)
    desc_words_stemmed = _extract_stemmed_words_from_text(desc_lower)

    all_matched_words = set()
    for word in query_words:
        if (word in title_words_stemmed or
            word in desc_words_stemmed or
            any(word in kw or kw in word for kw in keywords_stemmed)):
            all_matched_words.add(word)

    return all_matched_words


def _calculate_completeness_bonus(matched_words: set[str], query_word_count: int) -> float:
    """Calculate bonus score if all query words matched.

    Args:
        matched_words: Set of matched query words
        query_word_count: Total number of query words

    Returns:
        Completeness bonus score (0.0 if not all words matched)
    """
    if len(matched_words) == query_word_count and query_word_count > 1:
        return 0.2  # 20% bonus for matching all words
    return 0.0


def _calculate_max_possible_score(query_word_count: int) -> float:
    """Calculate the maximum possible score for normalization.

    Args:
        query_word_count: Number of query words

    Returns:
        Maximum possible score
    """
    if query_word_count == 0:
        return 1.0

    # Note: keyword score can have 2x boost for exact matches, plus 1.5x for single-word queries
    max_keyword_score = SCORE_WEIGHT_KEYWORDS * 2.0 * 1.5
    max_possible_score = (
        (max_keyword_score +
         SCORE_WEIGHT_TITLE * 2.0 +     # max boost for phrase match
         SCORE_WEIGHT_DESCRIPTION * 1.5) * query_word_count +  # max boost
        0.2  # completeness bonus
    )
    return max_possible_score


def calculate_confidence(source: dict, query_words: list[str], original_query: str = "", original_query_words: list[str] = None) -> float:
    """Calculate confidence score for a source based on query words."""
    # Get source fields
    title = source.get("name", "")
    description = source.get("description", "")
    keywords = source.get("keywords", [])

    # Calculate scores for each field
    score = (
        calculate_keyword_score(keywords, query_words, original_query_words) +
        calculate_title_score(title, query_words, original_query) +
        calculate_description_score(description, query_words, original_query)
    )

    # Find matched words and calculate completeness bonus
    matched_words = _find_matched_query_words(query_words, title, description, keywords)
    completeness_bonus = _calculate_completeness_bonus(matched_words, len(query_words))
    score += completeness_bonus

    # Normalize score
    max_possible_score = _calculate_max_possible_score(len(query_words))
    normalized = min(score / max_possible_score, 1.0) if max_possible_score > 0 else 0.0

    return normalized


def _score_and_filter_sources(
    sources: list[dict],
    query_words: list[str],
    original_query: str,
    original_query_words: list[str]
) -> list[tuple[dict, float]]:
    """Score sources and filter by confidence threshold.

    Args:
        sources: List of source dictionaries
        query_words: Stemmed query words
        original_query: Original query string
        original_query_words: Original (non-stemmed) query words

    Returns:
        List of tuples (source_dict_with_confidence, confidence_score)
    """
    scored_sources: list[tuple[dict, float]] = []
    for source in sources:
        confidence: float = calculate_confidence(source, query_words, original_query, original_query_words)
        if confidence > CONFIDENCE_THRESHOLD_MIN:
            source_with_score: dict = source.copy()
            source_with_score["confidence"] = confidence
            scored_sources.append((source_with_score, confidence))
    return scored_sources


def _convert_to_source_objects(source_dicts: list[dict]) -> list[Source]:
    """Convert source dictionaries to Source objects.

    Args:
        source_dicts: List of source dictionaries with confidence scores

    Returns:
        List of Source objects
    """
    return [
        Source(
            id=s["id"],
            name=s["name"],
            type=s["type"],
            launch_date=s["launch_date"],
            description=s["description"],
            image_url=s.get("image_url"),
            thumb_url=s.get("thumb_url"),
            medium_url=s.get("medium_url"),
            original_url=s.get("original_url"),
            medium_width=s.get("medium_width"),
            medium_height=s.get("medium_height"),
            status=s["status"],
            confidence=s.get("confidence"),
            keywords=s.get("keywords"),
        )
        for s in source_dicts
    ]


def _save_search_to_history(query: str, scored_sources: list[tuple[dict, float]]) -> str:
    """Save search results to history.

    Args:
        query: Search query string
        scored_sources: List of tuples (source_dict, confidence_score)

    Returns:
        Search ID (UUID string or temporary ID if save fails)
    """
    # Convert all scored results back to dict for storage
    all_results_dict: list[dict] = [item[0] for item in scored_sources[:MAX_SEARCH_RESULTS]]

    # Try to save search to history, but don't fail the request if it fails
    try:
        return db.save_search(query, all_results_dict)
    except Exception as e:
        # Log error but continue - search results are still valid
        logger.warning(f"Failed to save search to history: {e}", exc_info=True)
        # Generate a temporary ID for this search (won't be retrievable later)
        return f"temp-{uuid.uuid4()}"


def _filter_sources_by_date(sources: list[dict], start_date: Optional[str] = None, end_date: Optional[str] = None) -> list[dict]:
    """Filter sources by launch_date range."""
    return filter_items_by_date_range(sources, "launch_date", start_date, end_date)


def search_sources(query: str, page: int = 1, limit: int = 20, start_date: Optional[str] = None, end_date: Optional[str] = None) -> SearchResponse:
    """Search space images using natural language query with optional date filtering."""
    query = query.strip()

    if not query:
        return SearchResponse(results=[], search_id="", total=0, page=page, limit=limit, total_pages=0)

    # Tokenize query (stemmed) and extract original query words
    query_words: list[str] = tokenize_query(query)
    original_query_words: list[str] = extract_original_query_words(query)

    if not query_words:
        return SearchResponse(results=[], search_id="", total=0, page=page, limit=limit, total_pages=0)

    # Get all sources
    all_sources: list[dict] = db.get_all_sources()

    # Apply date filtering if provided (before scoring)
    filtered_sources = _filter_sources_by_date(all_sources, start_date, end_date)

    # Calculate confidence for each source
    scored_sources = _score_and_filter_sources(filtered_sources, query_words, query, original_query_words)

    # Sort by confidence descending
    scored_sources.sort(key=lambda x: x[1], reverse=True)

    # Apply pagination
    total = len(scored_sources)
    total_pages = (total + limit - 1) // limit  # Ceiling division

    start = (page - 1) * limit
    end = start + limit
    paginated_results: list[dict] = [item[0] for item in scored_sources[start:end]]

    # Convert to Source objects with confidence
    results = _convert_to_source_objects(paginated_results)

    # Save to history (save all results, not just current page)
    search_id = _save_search_to_history(query, scored_sources)

    return SearchResponse(
        results=results,
        search_id=search_id,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

