from fastapi import status


class TestSourcesEndpoint:
    """Integration tests for /api/sources endpoint."""

    def test_get_sources_default_pagination(self, client):
        """Test getting sources with default pagination."""
        response = client.get("/api/sources")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "results" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "total_pages" in data
        assert isinstance(data["results"], list)
        assert data["page"] == 1
        assert data["limit"] == 20

    def test_get_sources_with_pagination(self, client):
        """Test getting sources with custom pagination."""
        response = client.get("/api/sources?page=1&limit=5")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["results"]) <= 5

    def test_get_sources_different_pages(self, client):
        """Test getting different pages of sources."""
        # Get first page
        response1 = client.get("/api/sources?page=1&limit=2")
        assert response1.status_code == status.HTTP_200_OK
        data1 = response1.json()

        # Get second page
        response2 = client.get("/api/sources?page=2&limit=2")
        assert response2.status_code == status.HTTP_200_OK
        data2 = response2.json()

        # Results should be different (unless there's only one page)
        if data1["total_pages"] > 1:
            assert data1["results"] != data2["results"]

    def test_get_sources_invalid_page(self, client):
        """Test getting sources with invalid page number."""
        response = client.get("/api/sources?page=0")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_get_sources_invalid_limit_too_low(self, client):
        """Test getting sources with limit below minimum."""
        response = client.get("/api/sources?limit=0")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_get_sources_invalid_limit_too_high(self, client):
        """Test getting sources with limit above maximum."""
        response = client.get("/api/sources?limit=101")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_get_sources_response_structure(self, client):
        """Test that sources response has correct structure."""
        response = client.get("/api/sources")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all required fields exist
        required_fields = ["results", "total", "page", "limit", "total_pages"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

        # Verify results contain Source objects
        if data["results"]:
            source = data["results"][0]
            assert "id" in source
            assert "name" in source
            assert "type" in source
            assert "launch_date" in source
            assert "description" in source
            assert "status" in source

    def test_get_sources_pagination_consistency(self, client):
        """Test that pagination metadata is consistent."""
        response = client.get("/api/sources?page=1&limit=10")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify total_pages calculation
        expected_total_pages = (data["total"] + data["limit"] - 1) // data["limit"]
        if data["total"] == 0:
            expected_total_pages = 0
        assert data["total_pages"] == expected_total_pages

    def test_get_sources_empty_result(self, client):
        """Test getting sources when there are no sources (edge case)."""
        # This test assumes the database might be empty
        # In practice, this might not happen, but we test the structure
        response = client.get("/api/sources")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Even with no results, structure should be correct
        assert isinstance(data["results"], list)
        assert data["total"] >= 0
        assert data["total_pages"] >= 0

    def test_get_sources_with_start_date_only(self, client):
        """Test filtering sources by start_date only (date format)."""
        # Filter from 2020-01-01 onwards
        response = client.get("/api/sources?start_date=2020-01-01")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results have launch_date >= start_date
        for source in data["results"]:
            assert "launch_date" in source
            if source["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(source["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2020-01-01T00:00:00+00:00")
                assert launch_dt >= start_dt

    def test_get_sources_with_start_date_datetime(self, client):
        """Test filtering sources by start_date with datetime format."""
        # Filter from 2020-01-01T12:00:00Z onwards
        response = client.get("/api/sources?start_date=2020-01-01T12:00:00Z")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results have launch_date >= start_date
        for source in data["results"]:
            assert "launch_date" in source
            if source["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(source["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2020-01-01T12:00:00+00:00")
                assert launch_dt >= start_dt

    def test_get_sources_with_end_date_only(self, client):
        """Test filtering sources by end_date only (date format)."""
        # Filter up to 2010-01-01
        response = client.get("/api/sources?end_date=2010-01-01")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results have launch_date <= end_date (end of day)
        for source in data["results"]:
            assert "launch_date" in source
            if source["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(source["launch_date"].replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat("2010-01-01T23:59:59.999999+00:00")
                assert launch_dt <= end_dt

    def test_get_sources_with_end_date_datetime(self, client):
        """Test filtering sources by end_date with datetime format."""
        # Filter up to 2010-01-01T12:00:00Z
        response = client.get("/api/sources?end_date=2010-01-01T12:00:00Z")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results have launch_date <= end_date
        for source in data["results"]:
            assert "launch_date" in source
            if source["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(source["launch_date"].replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat("2010-01-01T12:00:00+00:00")
                assert launch_dt <= end_dt

    def test_get_sources_with_both_dates(self, client):
        """Test filtering sources by both start_date and end_date."""
        # Filter between 2010-01-01 and 2020-01-01
        response = client.get("/api/sources?start_date=2010-01-01&end_date=2020-01-01")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify all results fall within the date range
        for source in data["results"]:
            assert "launch_date" in source
            if source["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(source["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2010-01-01T00:00:00+00:00")
                end_dt = datetime.fromisoformat("2020-01-01T23:59:59.999999+00:00")
                assert start_dt <= launch_dt <= end_dt

    def test_get_sources_with_date_range_no_results(self, client):
        """Test filtering sources with date range that has no results."""
        # Filter for dates in 2030 (should return empty or very few results)
        response = client.get("/api/sources?start_date=2030-01-01&end_date=2030-12-31")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Should return empty results or results within the range
        assert isinstance(data["results"], list)
        assert data["total"] >= 0
        for source in data["results"]:
            if source.get("launch_date"):
                from datetime import datetime
                launch_dt = datetime.fromisoformat(source["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2030-01-01T00:00:00+00:00")
                end_dt = datetime.fromisoformat("2030-12-31T23:59:59.999999+00:00")
                assert start_dt <= launch_dt <= end_dt

    def test_get_sources_with_date_filter_and_pagination(self, client):
        """Test date filtering combined with pagination."""
        # Filter between 2000-01-01 and 2020-01-01 with limit 5
        response = client.get("/api/sources?start_date=2000-01-01&end_date=2020-01-01&page=1&limit=5")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data["results"]) <= 5
        assert data["page"] == 1
        assert data["limit"] == 5
        assert data["total"] >= 0

        # Verify all results fall within the date range
        for source in data["results"]:
            assert "launch_date" in source
            if source["launch_date"]:
                from datetime import datetime
                launch_dt = datetime.fromisoformat(source["launch_date"].replace("Z", "+00:00"))
                start_dt = datetime.fromisoformat("2000-01-01T00:00:00+00:00")
                end_dt = datetime.fromisoformat("2020-01-01T23:59:59.999999+00:00")
                assert start_dt <= launch_dt <= end_dt

    def test_get_sources_with_date_filter_boundary_start(self, client):
        """Test date filtering with start_date exactly matching a launch_date."""
        # Get all sources first to find a specific launch_date
        all_response = client.get("/api/sources?limit=100")
        assert all_response.status_code == status.HTTP_200_OK
        all_data = all_response.json()

        if all_data["results"]:
            # Use the first source's launch_date as boundary
            first_launch_date = all_data["results"][0]["launch_date"]
            if first_launch_date:
                response = client.get(f"/api/sources?start_date={first_launch_date}")

                assert response.status_code == status.HTTP_200_OK
                data = response.json()

                # Verify all results have launch_date >= boundary
                for source in data["results"]:
                    if source.get("launch_date"):
                        from datetime import datetime
                        launch_dt = datetime.fromisoformat(source["launch_date"].replace("Z", "+00:00"))
                        boundary_dt = datetime.fromisoformat(first_launch_date.replace("Z", "+00:00"))
                        assert launch_dt >= boundary_dt

    def test_get_sources_with_date_filter_boundary_end(self, client):
        """Test date filtering with end_date exactly matching a launch_date."""
        # Get all sources first to find a specific launch_date
        all_response = client.get("/api/sources?limit=100")
        assert all_response.status_code == status.HTTP_200_OK
        all_data = all_response.json()

        if all_data["results"]:
            # Use the first source's launch_date as boundary
            first_launch_date = all_data["results"][0]["launch_date"]
            if first_launch_date:
                response = client.get(f"/api/sources?end_date={first_launch_date}")

                assert response.status_code == status.HTTP_200_OK
                data = response.json()

                # Verify all results have launch_date <= boundary
                for source in data["results"]:
                    if source.get("launch_date"):
                        from datetime import datetime
                        launch_dt = datetime.fromisoformat(source["launch_date"].replace("Z", "+00:00"))
                        boundary_dt = datetime.fromisoformat(first_launch_date.replace("Z", "+00:00"))
                        assert launch_dt <= boundary_dt

