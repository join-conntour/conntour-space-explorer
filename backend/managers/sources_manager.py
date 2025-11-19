import json
import os
from typing import Optional

from constants import IMAGE_SIZE_PATTERNS
from models import Source, SourcesResponse
from utils.date_utils import filter_items_by_date_range


def extract_image_url_from_links(
    links: list[dict], preferred_size: str = "medium"
) -> Optional[str]:
    """
    Extract the image URL from a list of link objects.

    Args:
        links: List of link dictionaries from NASA API
        preferred_size: Preferred image size - "thumb", "small", "medium", "original", or "orig"
                       Falls back to first available image if preferred size not found.

    Returns:
        Image URL string or None if no image link found
    """
    # Normalize preferred_size for URL matching
    preferred_pattern = IMAGE_SIZE_PATTERNS.get(preferred_size.lower(), "~medium")

    # First pass: try to find preferred size
    for link in links:
        if link.get("render") == "image":
            href = link.get("href", "")
            if preferred_pattern in href:
                return href

    # Fallback: return first available image link
    for link in links:
        if link.get("render") == "image":
            return link.get("href")

    return None


def extract_all_image_urls_from_links(links: list[dict]) -> dict[str, Optional[str]]:
    """
    Extract all image URLs (thumb, medium, original) and dimensions from a list of link objects.

    Args:
        links: List of link dictionaries from NASA API

    Returns:
        Dictionary with keys: 'thumb_url', 'medium_url', 'original_url', 'medium_width', 'medium_height'
    """
    urls = {
        "thumb_url": None,
        "medium_url": None,
        "original_url": None,
        "medium_width": None,
        "medium_height": None,
    }

    for link in links:
        if link.get("render") == "image":
            href = link.get("href", "")
            # Check each pattern independently to ensure we capture all available sizes
            if "~thumb" in href and urls["thumb_url"] is None:
                urls["thumb_url"] = href
            if "~medium" in href and urls["medium_url"] is None:
                urls["medium_url"] = href
                urls["medium_width"] = link.get("width")
                urls["medium_height"] = link.get("height")
            if "~orig" in href and urls["original_url"] is None:
                urls["original_url"] = href

    return urls


def normalize_keywords(keywords: list[str]) -> list[str]:
    """Normalize keywords by splitting comma-separated strings into individual keywords."""
    normalized = []
    for kw in keywords:
        if isinstance(kw, str):
            # Split on commas and add individual keywords
            for k in kw.split(','):
                k = k.strip()
                if k:
                    normalized.append(k)
        else:
            # If it's not a string, convert to string and add
            normalized.append(str(kw).strip())
    return normalized


def transform_item_to_source(item: dict, item_id: int, preferred_image_size: str = "thumb") -> dict:
    """Transform a NASA API item into a source dictionary."""
    data = item.get("data", [{}])[0]
    links = item.get("links", [])
    image_url = extract_image_url_from_links(links, preferred_size=preferred_image_size)
    all_image_urls = extract_all_image_urls_from_links(links)

    # Normalize keywords: split comma-separated strings into individual keywords
    raw_keywords = data.get("keywords", [])
    normalized_keywords = normalize_keywords(raw_keywords) if raw_keywords else []

    return {
        "id": item_id,
        "name": data.get("title", f"NASA Item {item_id}"),
        "type": data.get("media_type", "unknown"),
        "launch_date": data.get("date_created", ""),
        "description": data.get("description", ""),
        "image_url": image_url,
        "thumb_url": all_image_urls["thumb_url"],
        "medium_url": all_image_urls["medium_url"],
        "original_url": all_image_urls["original_url"],
        "medium_width": all_image_urls["medium_width"],
        "medium_height": all_image_urls["medium_height"],
        "status": "Active",
        "keywords": normalized_keywords,
    }


def load_mock_data() -> dict:
    """Load and parse the mock data JSON file."""
    # Get the path relative to this file's location
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(current_dir, "..", "data", "mock_data.json")
    with open(data_path) as f:
        return json.load(f)


def load_and_parse_sources(preferred_image_size: str = "thumb") -> list[dict]:
    """Load mock data and parse it into a list of source dictionaries."""
    json_data = load_mock_data()
    items = json_data.get("collection", {}).get("items", [])

    sources = []
    for idx, item in enumerate(items, start=1):
        source = transform_item_to_source(item, idx, preferred_image_size)
        sources.append(source)

    return sources


def get_all_sources() -> list[Source]:
    """Get all space image sources."""
    # Import here to avoid circular import
    from db_instance import db
    sources = db.get_all_sources()
    return sources


def _filter_sources_by_date(sources: list[dict], start_date: Optional[str] = None, end_date: Optional[str] = None) -> list[dict]:
    """Filter sources by launch_date range."""
    return filter_items_by_date_range(sources, "launch_date", start_date, end_date)


def get_all_sources_paginated(page: int, limit: int, start_date: Optional[str] = None, end_date: Optional[str] = None) -> SourcesResponse:
    """Get paginated space image sources with optional date filtering."""
    from db_instance import db

    all_sources = db.get_all_sources()

    # Apply date filtering if provided
    filtered_sources = _filter_sources_by_date(all_sources, start_date, end_date)

    total = len(filtered_sources)
    total_pages = (total + limit - 1) // limit  # Ceiling division

    start = (page - 1) * limit
    end = start + limit
    paginated_sources = filtered_sources[start:end]

    # Convert to Source objects
    results = [
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
            keywords=s.get("keywords"),
        )
        for s in paginated_sources
    ]

    return SourcesResponse(
        results=results,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

