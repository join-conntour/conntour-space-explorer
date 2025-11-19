from fastapi import status


class TestSearchEndpoint:
    """Integration tests for /api/search endpoint."""

    def test_search_with_valid_query(self, client):
        """Test search with a valid query string."""
        response = client.get("/api/search?q=mars")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "results" in data
        assert "search_id" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "total_pages" in data
        assert isinstance(data["results"], list)
        assert isinstance(data["search_id"], str)
        assert data["page"] == 1
        assert data["limit"] == 20

    def test_search_with_pagination(self, client):
        """Test search with pagination parameters."""
        response = client.get("/api/search?q=space&page=1&limit=5")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["results"]) <= 5

    def test_search_with_different_pages(self, client):
        """Test search with different page numbers."""
        # Get first page
        response1 = client.get("/api/search?q=space&page=1&limit=2")
        assert response1.status_code == status.HTTP_200_OK
        data1 = response1.json()

        # Get second page
        response2 = client.get("/api/search?q=space&page=2&limit=2")
        assert response2.status_code == status.HTTP_200_OK
        data2 = response2.json()

        # Results should be different (unless there's only one page)
        if data1["total_pages"] > 1:
            assert data1["results"] != data2["results"]

    def test_search_missing_query_parameter(self, client):
        """Test search endpoint without required query parameter."""
        response = client.get("/api/search")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_search_with_empty_query(self, client):
        """Test search with empty query string."""
        response = client.get("/api/search?q=")

        # FastAPI should still process it, but results may be empty
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_CONTENT]

    def test_search_with_invalid_page(self, client):
        """Test search with invalid page number."""
        response = client.get("/api/search?q=mars&page=0")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_search_with_invalid_limit_too_low(self, client):
        """Test search with limit below minimum."""
        response = client.get("/api/search?q=mars&limit=0")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_search_with_invalid_limit_too_high(self, client):
        """Test search with limit above maximum."""
        response = client.get("/api/search?q=mars&limit=101")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_search_creates_history_entry(self, client, mock_db):
        """Test that search creates a history entry."""
        initial_history_count = len(mock_db._history)

        response = client.get("/api/search?q=test+query")

        assert response.status_code == status.HTTP_200_OK
        assert len(mock_db._history) == initial_history_count + 1

        # Verify the search was saved
        search_id = response.json()["search_id"]
        saved_search = mock_db.get_search_by_id(search_id)
        assert saved_search is not None
        assert saved_search["query"] == "test query"

    def test_search_response_structure(self, client):
        """Test that search response has correct structure."""
        response = client.get("/api/search?q=galaxy")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all required fields exist
        required_fields = ["results", "search_id", "total", "page", "limit", "total_pages"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

        # Verify results contain Source objects
        if data["results"]:
            result = data["results"][0]
            assert "id" in result
            assert "name" in result
            assert "type" in result
            assert "status" in result

    def test_search_with_start_date_only(self, client):
        """Test filtering search results by start_date only (date format)."""
        # Filter from 2020-01-01 onwards
        response = client.get("/api/search?q=mars&start_date=2020-01-01")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results have launch_date >= start_date
        for result in data["results"]:
            assert "launch_date" in result
            if result["launch_date"]:
                # Parse and compare dates
                from datetime import datetime
                launch_dt = datetime.fromisoformat(result["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2020-01-01T00:00:00+00:00")
                assert launch_dt >= start_dt

    def test_search_with_start_date_datetime(self, client):
        """Test filtering search results by start_date with datetime format."""
        # Filter from 2020-01-01T12:00:00Z onwards
        response = client.get("/api/search?q=mars&start_date=2020-01-01T12:00:00Z")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results have launch_date >= start_date
        for result in data["results"]:
            assert "launch_date" in result
            if result["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(result["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2020-01-01T12:00:00+00:00")
                assert launch_dt >= start_dt

    def test_search_with_end_date_only(self, client):
        """Test filtering search results by end_date only (date format)."""
        # Filter up to 2010-01-01
        response = client.get("/api/search?q=mars&end_date=2010-01-01")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results have launch_date <= end_date (end of day)
        for result in data["results"]:
            assert "launch_date" in result
            if result["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(result["launch_date"].replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat("2010-01-01T23:59:59.999999+00:00")
                assert launch_dt <= end_dt

    def test_search_with_end_date_datetime(self, client):
        """Test filtering search results by end_date with datetime format."""
        # Filter up to 2010-01-01T12:00:00Z
        response = client.get("/api/search?q=mars&end_date=2010-01-01T12:00:00Z")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results have launch_date <= end_date
        for result in data["results"]:
            assert "launch_date" in result
            if result["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(result["launch_date"].replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat("2010-01-01T12:00:00+00:00")
                assert launch_dt <= end_dt

    def test_search_with_both_dates(self, client):
        """Test filtering search results by both start_date and end_date."""
        # Filter between 2010-01-01 and 2020-01-01
        response = client.get("/api/search?q=mars&start_date=2010-01-01&end_date=2020-01-01")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results fall within the date range
        for result in data["results"]:
            assert "launch_date" in result
            if result["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(result["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2010-01-01T00:00:00+00:00")
                end_dt = datetime.fromisoformat("2020-01-01T23:59:59.999999+00:00")
                assert start_dt <= launch_dt <= end_dt

    def test_search_with_date_range_no_results(self, client):
        """Test filtering search results with date range that has no results."""
        # Filter for dates in 2030 (should return empty or very few results)
        response = client.get("/api/search?q=mars&start_date=2030-01-01&end_date=2030-12-31")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Should return empty results or results within the range
        assert isinstance(data["results"], list)
        assert data["total"] >= 0
        for result in data["results"]:
            if result.get("launch_date"):
                from datetime import datetime
                launch_dt = datetime.fromisoformat(result["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2030-01-01T00:00:00+00:00")
                end_dt = datetime.fromisoformat("2030-12-31T23:59:59.999999+00:00")
                assert start_dt <= launch_dt <= end_dt

    def test_search_with_date_filter_and_pagination(self, client):
        """Test date filtering combined with pagination."""
        # Filter between 2000-01-01 and 2020-01-01 with limit 5
        response = client.get("/api/search?q=mars&start_date=2000-01-01&end_date=2020-01-01&page=1&limit=5")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["results"]) <= 5
        assert data["page"] == 1
        assert data["limit"] == 5
        assert data["total"] >= 0

        # Verify all results fall within the date range
        for result in data["results"]:
            assert "launch_date" in result
            if result["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(result["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2000-01-01T00:00:00+00:00")
                end_dt = datetime.fromisoformat("2020-01-01T23:59:59.999999+00:00")
                assert start_dt <= launch_dt <= end_dt

