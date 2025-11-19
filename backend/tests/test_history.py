from fastapi import status


class TestSearchHistoryEndpoints:
    """Integration tests for /api/search-history endpoints."""

    def test_get_search_history_empty(self, client):
        """Test getting search history when empty."""
        response = client.get("/api/search-history")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["limit"] == 10
        assert data["total_pages"] == 0

    def test_get_search_history_with_data(self, client, sample_search_history):
        """Test getting search history with existing data."""
        response = client.get("/api/search-history")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 2
        assert data["total"] == 2
        assert data["page"] == 1
        assert data["limit"] == 10

        # Verify items are in reverse chronological order (newest first)
        assert data["items"][0]["id"] == "test-search-2"
        assert data["items"][1]["id"] == "test-search-1"

    def test_get_search_history_pagination(self, client, sample_search_history):
        """Test search history pagination."""
        response = client.get("/api/search-history?page=1&limit=1")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 1
        assert data["page"] == 1
        assert data["limit"] == 1
        assert data["total"] == 2
        assert data["total_pages"] == 2

    def test_get_search_history_second_page(self, client, sample_search_history):
        """Test getting second page of search history."""
        response = client.get("/api/search-history?page=2&limit=1")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 1
        assert data["page"] == 2
        assert data["items"][0]["id"] == "test-search-1"

    def test_get_search_history_invalid_page(self, client):
        """Test getting search history with invalid page number."""
        response = client.get("/api/search-history?page=0")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_get_search_history_invalid_limit(self, client):
        """Test getting search history with invalid limit."""
        response = client.get("/api/search-history?limit=0")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_get_search_history_limit_too_high(self, client):
        """Test getting search history with limit above maximum."""
        response = client.get("/api/search-history?limit=101")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_get_search_history_item_structure(self, client, sample_search_history):
        """Test that search history items have correct structure."""
        response = client.get("/api/search-history")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        if data["items"]:
            item = data["items"][0]
            assert "id" in item
            assert "query" in item
            assert "timestamp" in item
            assert "result_count" in item
            assert isinstance(item["result_count"], int)

    def test_get_search_history_with_start_date_only(self, client, sample_search_history):
        """Test filtering search history by start_date only (date format)."""
        # Filter from 2024-01-02 onwards (should include test-search-2 only)
        response = client.get("/api/search-history?start_date=2024-01-02")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 1
        assert data["total"] == 1
        assert data["items"][0]["id"] == "test-search-2"

    def test_get_search_history_with_start_date_datetime(self, client, sample_search_history):
        """Test filtering search history by start_date with datetime format."""
        # Filter from 2024-01-01T12:00:00Z onwards (should include test-search-2 only)
        response = client.get("/api/search-history?start_date=2024-01-01T12:00:00Z")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 1
        assert data["total"] == 1
        assert data["items"][0]["id"] == "test-search-2"

    def test_get_search_history_with_end_date_only(self, client, sample_search_history):
        """Test filtering search history by end_date only (date format)."""
        # Filter up to 2024-01-01 (should include test-search-1 only)
        response = client.get("/api/search-history?end_date=2024-01-01")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 1
        assert data["total"] == 1
        assert data["items"][0]["id"] == "test-search-1"

    def test_get_search_history_with_end_date_datetime(self, client, sample_search_history):
        """Test filtering search history by end_date with datetime format."""
        # Filter up to 2024-01-01T12:00:00Z (should include test-search-1 only)
        response = client.get("/api/search-history?end_date=2024-01-01T12:00:00Z")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 1
        assert data["total"] == 1
        assert data["items"][0]["id"] == "test-search-1"

    def test_get_search_history_with_both_dates(self, client, sample_search_history):
        """Test filtering search history by both start_date and end_date."""
        # Filter between 2024-01-01 and 2024-01-02 (should include both)
        response = client.get("/api/search-history?start_date=2024-01-01&end_date=2024-01-02")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 2
        assert data["total"] == 2
        assert data["items"][0]["id"] == "test-search-2"
        assert data["items"][1]["id"] == "test-search-1"

    def test_get_search_history_with_date_range_single_item(self, client, sample_search_history):
        """Test filtering search history with date range that includes only one item."""
        # Filter between 2024-01-01T00:00:00Z and 2024-01-01T12:00:00Z (should include test-search-1 only)
        response = client.get("/api/search-history?start_date=2024-01-01T00:00:00Z&end_date=2024-01-01T12:00:00Z")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 1
        assert data["total"] == 1
        assert data["items"][0]["id"] == "test-search-1"

    def test_get_search_history_with_date_range_no_results(self, client, sample_search_history):
        """Test filtering search history with date range that has no results."""
        # Filter for dates in 2025 (should return empty)
        response = client.get("/api/search-history?start_date=2025-01-01&end_date=2025-01-31")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 0
        assert data["total"] == 0
        assert data["total_pages"] == 0

    def test_get_search_history_with_date_filter_and_pagination(self, client, sample_search_history):
        """Test date filtering combined with pagination."""
        # Filter between 2024-01-01 and 2024-01-02 (both items) with limit 1
        response = client.get("/api/search-history?start_date=2024-01-01&end_date=2024-01-02&page=1&limit=1")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 1
        assert data["total"] == 2
        assert data["page"] == 1
        assert data["limit"] == 1
        assert data["total_pages"] == 2
        assert data["items"][0]["id"] == "test-search-2"

    def test_get_search_history_with_date_filter_boundary_start(self, client, sample_search_history):
        """Test date filtering with start_date exactly matching an item's timestamp."""
        # Filter from exactly 2024-01-01T00:00:00Z (should include both)
        response = client.get("/api/search-history?start_date=2024-01-01T00:00:00Z")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 2
        assert data["total"] == 2

    def test_get_search_history_with_date_filter_boundary_end(self, client, sample_search_history):
        """Test date filtering with end_date exactly matching an item's timestamp."""
        # Filter up to exactly 2024-01-02T00:00:00Z (should include both)
        response = client.get("/api/search-history?end_date=2024-01-02T00:00:00Z")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["items"]) == 2
        assert data["total"] == 2


class TestGetSearchByIdEndpoint:
    """Integration tests for GET /api/search-history/{search_id} endpoint."""

    def test_get_search_by_id_exists(self, client, sample_search_history):
        """Test getting a search by ID that exists."""
        response = client.get("/api/search-history/test-search-1")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == "test-search-1"
        assert data["query"] == "mars rover"
        assert "timestamp" in data
        assert "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) == 1

    def test_get_search_by_id_not_found(self, client):
        """Test getting a search by ID that doesn't exist."""
        response = client.get("/api/search-history/non-existent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "detail" in response.json()
        assert "not found" in response.json()["detail"].lower()

    def test_get_search_by_id_response_structure(self, client, sample_search_history):
        """Test that get search by ID response has correct structure."""
        response = client.get("/api/search-history/test-search-1")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        required_fields = ["id", "query", "timestamp", "results"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

        # Verify results contain Source objects
        if data["results"]:
            result = data["results"][0]
            assert "id" in result
            assert "name" in result


class TestDeleteSearchEndpoint:
    """Integration tests for DELETE /api/search-history/{search_id} endpoint."""

    def test_delete_search_exists(self, client, sample_search_history, mock_db):
        """Test deleting a search that exists."""
        initial_count = len(mock_db._history)

        response = client.delete("/api/search-history/test-search-1")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert len(mock_db._history) == initial_count - 1

        # Verify it's actually deleted
        deleted_search = mock_db.get_search_by_id("test-search-1")
        assert deleted_search is None

    def test_delete_search_not_found(self, client):
        """Test deleting a search that doesn't exist."""
        response = client.delete("/api/search-history/non-existent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "detail" in response.json()
        assert "not found" in response.json()["detail"].lower()

    def test_delete_search_removes_from_history_list(self, client, sample_search_history, mock_db):
        """Test that deleted search is removed from history list endpoint."""
        # Delete a search
        client.delete("/api/search-history/test-search-1")

        # Verify it's not in the history list
        response = client.get("/api/search-history")
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        search_ids = [item["id"] for item in data["items"]]
        assert "test-search-1" not in search_ids

