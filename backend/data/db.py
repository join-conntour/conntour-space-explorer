import json
import logging
import os
import uuid
from datetime import datetime
from typing import Optional

from managers.sources_manager import load_and_parse_sources
from utils.date_utils import filter_items_by_date_range

# Configure logger
logger = logging.getLogger(__name__)


class SpaceDB:
    def __init__(self, preferred_image_size: str = "thumb") -> None:
        """
        Initialize SpaceDB instance.

        Args:
            preferred_image_size: Preferred image size for sources - "thumb", "small",
                                 "medium", "original", or "orig". Defaults to "thumb".
        """
        self._preferred_image_size: str = preferred_image_size
        self._sources: list[dict] = load_and_parse_sources(preferred_image_size)
        self._next_id: int = len(self._sources) + 1
        self._history_file: str = self._get_history_file_path()
        self._history: list[dict] = []
        self._load_history()

    def _get_history_file_path(self) -> str:
        """Get the path to the search history JSON file."""
        return os.path.join(os.path.dirname(__file__), "search_history.json")

    def _load_history(self) -> None:
        """Load search history from JSON file."""
        if os.path.exists(self._history_file):
            try:
                with open(self._history_file) as f:
                    self._history = json.load(f)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse history file {self._history_file}: {e}")
                self._history = []
            except OSError as e:
                logger.error(f"Failed to read history file {self._history_file}: {e}")
                self._history = []
        else:
            self._history = []

    def _save_history(self) -> None:
        """
        Save search history to JSON file with atomic write and proper error handling.

        Uses atomic write pattern: write to temp file, then rename to ensure
        data integrity even if process crashes during write.
        """
        temp_file = f"{self._history_file}.tmp"
        try:
            # Write to temporary file first
            with open(temp_file, "w") as f:
                json.dump(self._history, f, indent=2)

            # Atomic rename (works on Unix-like systems and Windows)
            os.replace(temp_file, self._history_file)
        except OSError as e:
            logger.error(f"Failed to save history file {self._history_file}: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except OSError:
                    pass
            # Raise exception so caller knows save failed
            raise RuntimeError(f"Failed to save search history: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error saving history file {self._history_file}: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except OSError:
                    pass
            raise

    def get_all_sources(self) -> list[dict]:
        """Get all space sources."""
        return self._sources

    def save_search(self, query: str, results: list[dict]) -> str:
        """Save a search to history and return search_id."""
        search_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + "Z"

        search_entry = {
            "id": search_id,
            "query": query,
            "timestamp": timestamp,
            "results": results,
        }

        self._history.append(search_entry)
        self._save_history()
        return search_id

    def get_search_history(self, page: int, limit: int, start_date: Optional[str] = None, end_date: Optional[str] = None) -> tuple[list[dict], int]:
        """Get paginated search history with optional date filtering."""
        # Filter by date range if provided
        filtered_history = filter_items_by_date_range(self._history, "timestamp", start_date, end_date)

        total = len(filtered_history)
        start = (page - 1) * limit
        end = start + limit

        # Return history items in reverse chronological order (newest first)
        reversed_history = list(reversed(filtered_history))
        items = reversed_history[start:end]

        # Format items for response (without full results)
        formatted_items = [
            {
                "id": item["id"],
                "query": item["query"],
                "timestamp": item["timestamp"],
                "result_count": len(item.get("results", [])),
            }
            for item in items
        ]

        return formatted_items, total

    def get_search_by_id(self, search_id: str) -> Optional[dict]:
        """Get a specific search by ID."""
        for item in self._history:
            if item["id"] == search_id:
                return item
        return None

    def delete_search(self, search_id: str) -> bool:
        """Delete a search from history."""
        original_length = len(self._history)
        self._history = [item for item in self._history if item["id"] != search_id]

        if len(self._history) < original_length:
            self._save_history()
            return True
        return False
