import json
import os
import tempfile

import pytest
from fastapi.testclient import TestClient

import db_instance
import managers.history_manager
import managers.search_manager
from app import app
from data.db import SpaceDB


@pytest.fixture
def temp_history_file():
    """Create a temporary history file for testing."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_path = f.name
        json.dump([], f)

    yield temp_path

    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def mock_db(temp_history_file, monkeypatch):
    """Create a mock database instance for testing."""
    # Save original db instance
    original_db = db_instance.db

    # Create a new test database instance
    test_db = SpaceDB(preferred_image_size="thumb")

    # Replace the history file path
    test_db._history_file = temp_history_file
    test_db._history = []
    test_db._save_history()

    # Monkeypatch the db instance in db_instance module
    monkeypatch.setattr(db_instance, "db", test_db)

    # Also patch db in manager modules that import it at module level
    monkeypatch.setattr(managers.history_manager, "db", test_db)
    monkeypatch.setattr(managers.search_manager, "db", test_db)
    # Note: sources_manager imports db inside functions, so patching db_instance.db is sufficient

    yield test_db

    # Restore original db
    monkeypatch.setattr(db_instance, "db", original_db)
    monkeypatch.setattr(managers.history_manager, "db", original_db)
    monkeypatch.setattr(managers.search_manager, "db", original_db)


@pytest.fixture
def client(mock_db):
    """Create a test client with mocked database."""
    return TestClient(app)


@pytest.fixture
def sample_search_history(mock_db):
    """Add sample search history entries for testing."""
    sample_searches = [
        {
            "id": "test-search-1",
            "query": "mars rover",
            "timestamp": "2024-01-01T00:00:00Z",
            "results": [
                {
                    "id": 1,
                    "name": "Mars Rover",
                    "type": "rover",
                    "launch_date": "2020-07-30",
                    "description": "Mars exploration rover",
                    "status": "active",
                }
            ],
        },
        {
            "id": "test-search-2",
            "query": "jupiter mission",
            "timestamp": "2024-01-02T00:00:00Z",
            "results": [
                {
                    "id": 2,
                    "name": "Jupiter Probe",
                    "type": "probe",
                    "launch_date": "2021-08-05",
                    "description": "Jupiter exploration mission",
                    "status": "active",
                }
            ],
        },
    ]

    mock_db._history = sample_searches
    mock_db._save_history()

    return sample_searches

