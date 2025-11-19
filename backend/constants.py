"""Constants for confidence score thresholds and image processing."""

# Confidence score thresholds
CONFIDENCE_THRESHOLD_MIN: float = 0.25  # Minimum confidence to include in results (increased to filter weak matches)
CONFIDENCE_THRESHOLD_HIGH: float = 0.7  # High confidence threshold (green)
CONFIDENCE_THRESHOLD_MEDIUM: float = 0.4  # Medium confidence threshold (yellow)

# Search algorithm scoring weights
SCORE_WEIGHT_TITLE: float = 0.5  # Weight for title matches
SCORE_WEIGHT_DESCRIPTION: float = 0.2  # Weight for description matches
SCORE_WEIGHT_KEYWORDS: float = 0.6  # Weight for keyword matches (increased - keywords are more curated and specific)

# Search result limits
MAX_SEARCH_RESULTS: int = 50  # Maximum number of results to return

# Mapping of image size names to their URL patterns in NASA API responses
IMAGE_SIZE_PATTERNS: dict[str, str] = {
    "thumb": "~thumb",
    "small": "~small",
    "medium": "~medium",
    "original": "~orig",
    "orig": "~orig",
}

