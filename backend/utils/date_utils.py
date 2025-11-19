"""Date utility functions for parsing and filtering dates."""
from datetime import datetime, timezone
from typing import Optional


def parse_iso_datetime(date_str: str) -> datetime:
    """
    Parse an ISO format datetime string to a timezone-aware datetime object.

    Args:
        date_str: ISO format datetime string (e.g., "2023-01-01" or "2023-01-01T12:00:00Z")

    Returns:
        Timezone-aware datetime object in UTC
    """
    date_clean = date_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(date_clean)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_start_date_filter(date_str: str) -> datetime:
    """
    Parse a start date filter string, setting to start of day if only date provided.

    Args:
        date_str: ISO format date string (e.g., "2023-01-01" or "2023-01-01T12:00:00Z")

    Returns:
        Timezone-aware datetime object in UTC, set to start of day if no time component
    """
    dt = parse_iso_datetime(date_str)
    # Set to start of day if only date provided (no time component)
    if "T" not in date_str:
        dt = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    return dt


def parse_end_date_filter(date_str: str) -> datetime:
    """
    Parse an end date filter string, setting to end of day if only date provided.

    Args:
        date_str: ISO format date string (e.g., "2023-01-01" or "2023-01-01T12:00:00Z")

    Returns:
        Timezone-aware datetime object in UTC, set to end of day if no time component
    """
    dt = parse_iso_datetime(date_str)
    # Set to end of day if only date provided (no time component)
    if "T" not in date_str:
        dt = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
    return dt


def is_date_in_range(
    item_date: datetime,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> bool:
    """
    Check if an item's date falls within the specified range.

    Args:
        item_date: The datetime to check (must be timezone-aware)
        start_date: Optional start of range (inclusive)
        end_date: Optional end of range (inclusive)

    Returns:
        True if item_date is within range, False otherwise
    """
    if start_date and item_date < start_date:
        return False
    if end_date and item_date > end_date:
        return False
    return True


def filter_items_by_date_range(
    items: list[dict],
    date_field: str,
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None
) -> list[dict]:
    """
    Filter a list of items by date range based on a specified date field.

    Args:
        items: List of dictionaries containing items to filter
        date_field: Name of the date field in each item dictionary
        start_date_str: Optional start date filter (ISO format)
        end_date_str: Optional end date filter (ISO format)

    Returns:
        Filtered list of items that fall within the date range
    """
    if not start_date_str and not end_date_str:
        return items

    # Parse filter dates once
    start_dt: Optional[datetime] = None
    end_dt: Optional[datetime] = None

    if start_date_str:
        start_dt = parse_start_date_filter(start_date_str)
    if end_date_str:
        end_dt = parse_end_date_filter(end_date_str)

    filtered_items = []
    for item in items:
        item_date_str = item.get(date_field, "")
        if not item_date_str:
            continue

        try:
            item_dt = parse_iso_datetime(item_date_str)
            if is_date_in_range(item_dt, start_dt, end_dt):
                filtered_items.append(item)
        except (ValueError, AttributeError):
            # Skip items with invalid date formats
            continue

    return filtered_items

