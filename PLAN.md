# Space Explorer App Implementation Plan

## Overview
Build a complete web application that allows users to browse NASA space images, search using natural language queries, and manage search history with pagination. All API endpoints use FastAPI's built-in Pydantic validation for type-safe contracts.

## Current State Analysis
- Backend: FastAPI with `/api/sources` endpoint returning all images
- Frontend: React app displaying images in a grid layout
- Data: NASA images loaded from `mock_data.json` with title, description, keywords, and image URLs

## Implementation Plan

### Backend Changes (`backend/`)

#### 1. Dependencies (`backend/requirements.txt`)
- `fastapi` - Web framework
- `uvicorn[standard]` - ASGI server
- `snowballstemmer==2.2.0` - Word stemming for search algorithm
- `pytest>=7.0.0` - Testing framework
- `httpx>=0.24.0` - HTTP client for tests
- `slowapi>=0.1.9` - Rate limiting (optional, prepared for future use)
- `ruff` - Code linting

#### 2. Pydantic Models (`backend/models.py`)
Comprehensive request/response models using Pydantic:

**Response Models:**
- `Source`: Core model with fields:
  - `id: int`, `name: str`, `type: str`, `launch_date: str`, `description: str`
  - `image_url: Optional[str]`, `thumb_url: Optional[str]`, `medium_url: Optional[str]`, `original_url: Optional[str]`
  - `medium_width: Optional[int]`, `medium_height: Optional[int]`
  - `status: str`
  - `confidence: Optional[float] = None` (only present in search results)
  - `keywords: Optional[list[str]] = None` (normalized keywords array)
- `SourcesResponse`: `{results: List[Source], total: int, page: int, limit: int, total_pages: int}`
- `SearchResponse`: `{results: List[Source], search_id: str, total: int, page: int, limit: int, total_pages: int}`
- `SearchHistoryItem`: `{id: str, query: str, timestamp: str, result_count: int}`
- `SearchHistoryResponse`: `{items: List[SearchHistoryItem], total: int, page: int, limit: int, total_pages: int}`
- `SearchHistoryDetailResponse`: `{id: str, query: str, timestamp: str, results: List[Source], total: int, page: int, limit: int, total_pages: int}` (supports pagination)

**Note**: Request validation is handled via FastAPI's `Query` parameters with Pydantic field validators, not separate request models.

#### 3. Route Organization (`backend/api/`)
Route modules using FastAPI's `APIRouter`:

**API Structure:**
- `api/__init__.py` - Package init file
- `api/sources.py` - Browse endpoints (`GET /api/sources`)
- `api/search.py` - Search endpoint (`GET /api/search`)
- `api/history.py` - Search history endpoints (`GET /api/search-history`, `GET /api/search-history/{id}`, `DELETE /api/search-history/{id}`)

**Route Implementation:**
- All routes use `APIRouter` with `prefix="/api"` and appropriate tags
- Validation via FastAPI's `Query` parameters with Pydantic validators (`min_length`, `max_length`, `ge`, `le`)
- Response models specified via `response_model` parameter on route decorators
- Error handling with `HTTPException` for validation and business logic errors

#### 4. Business Logic Layer (`backend/managers/`)
Business logic separated from API routes:

**Managers:**
- `managers/sources_manager.py`: Source data loading and transformation
  - `load_and_parse_sources()` - Loads and parses NASA mock data
  - `transform_item_to_source()` - Transforms NASA API format to internal format
  - `normalize_keywords()` - Splits comma-separated keywords into array
  - `extract_image_url_from_links()` - Extracts image URLs by size preference
  - `extract_all_image_urls_from_links()` - Extracts all image sizes and dimensions
  - `get_all_sources_paginated()` - Returns paginated sources
- `managers/search_manager.py`: Search algorithm implementation
  - `search_sources()` - Main search function with pagination
  - `calculate_confidence()` - Calculates confidence scores for sources
  - `calculate_keyword_score()` - Keyword matching with exact/stemmed distinction
  - `calculate_title_score()` - Title matching with phrase boost
  - `calculate_description_score()` - Description matching
  - Helper functions for keyword normalization, exact matching, etc.
- `managers/history_manager.py`: Search history management
  - `get_search_history()` - Get paginated history list
  - `get_search_by_id()` - Get specific search with pagination
  - `delete_search()` - Delete search from history

#### 5. Database Layer (`backend/data/db.py` and `backend/db_instance.py`)
- `db_instance.py`: Creates singleton `SpaceDB` instance for application-wide use
- `data/db.py`: `SpaceDB` class implementation
  - Loads sources from `mock_data.json` on initialization
  - Manages search history in `search_history.json` file
  - Atomic file writes for history persistence
  - Methods: `get_all_sources()`, `save_search()`, `get_search_history()`, `get_search_by_id()`, `delete_search()`

#### 6. Main Application (`backend/app.py`)
- FastAPI app initialization
- CORS middleware configuration:
  - Production: Uses `CORS_ORIGINS` environment variable
  - Development: Allows all origins (`*`) for debugging
- Router registration: `sources.router`, `search.router`, `history.router`

#### 7. Constants (`backend/constants.py`)
Configuration constants:
- `CONFIDENCE_THRESHOLD_MIN: 0.25` - Minimum confidence to include in results
- `CONFIDENCE_THRESHOLD_HIGH: 0.7` - High confidence threshold (green badge)
- `CONFIDENCE_THRESHOLD_MEDIUM: 0.4` - Medium confidence threshold (yellow badge)
- `SCORE_WEIGHT_TITLE: 0.5` - Weight for title matches
- `SCORE_WEIGHT_DESCRIPTION: 0.2` - Weight for description matches
- `SCORE_WEIGHT_KEYWORDS: 0.6` - Weight for keyword matches (highest)
- `MAX_SEARCH_RESULTS: 50` - Maximum results to return
- `IMAGE_SIZE_PATTERNS` - Mapping of size names to URL patterns

### Frontend Changes (`frontend/src/`)

#### 8. Frontend Components (`frontend/src/components/`)

**SearchBar.tsx:**
- Search input with submit button
- GET `/api/search?q={query}&page={page}&limit={limit}&start_date={date}&end_date={date}` with query parameters
- Handles loading and error states
- Calls `onSearchResults` callback with results, search_id, query, and pagination info
- Accepts `startDate` and `endDate` props for date filtering

**SearchHistory.tsx:**
- Displays paginated list of past searches
- GET `/api/search-history?page={page}&limit={limit}&start_date={date}&end_date={date}` for pagination
- Each item shows: query text, timestamp, result count
- Click to GET `/api/search-history/{id}?page={page}&limit={limit}` and display results (supports pagination)
- DELETE button per item calling `/api/search-history/{id}`
- Pagination controls via `Pagination` component
- Supports inline mode for tab-based navigation
- Accepts `startDate` and `endDate` props for date filtering

**SearchHistoryItem.tsx:**
- Individual history item component
- Displays query, timestamp, and result count
- Delete button with confirmation
- Click handler to load search results

**Sources.tsx:**
- Image grid component with responsive layout
- Displays sources with thumbnails, titles, descriptions
- Confidence badges (color-coded: green >0.7, yellow 0.4-0.7, red <0.4)
- Click handler for navigation to detail view
- Pagination support via `Pagination` component
- Optional `sources` prop for search results, otherwise fetches all sources
- Accepts `startDate` and `endDate` props for date filtering

**ImageDetail.tsx:**
- Detailed view of a single image
- Displays medium-sized image (`medium_url`)
- Full title, description, launch date, status
- Keywords displayed as colored tag badges
- "View Full Image" button opens `original_url` in new tab
- Back button to return to previous view

**Pagination.tsx:**
- Reusable pagination component
- Shows page numbers, previous/next buttons
- Handles page changes via callback

**LoadingSpinner.tsx:**
- Loading indicator component
- Used during data fetching

**ResultsCount.tsx:**
- Displays result count information
- Shows "Found X results" message

**DateFilter.tsx:**
- Reusable date picker component using MUI X Date Pickers
- Accepts `label`, `value`, `onChange`, `minDate`, `maxDate` props
- Styled with custom MUI theme matching the space-themed UI
- Uses `textFieldSxMuiStyling` and `popperSxMuiStyling` constants for styling

**FiltersSection.tsx:**
- Container component for shared date filters
- Wraps `LocalizationProvider` from MUI X Date Pickers
- Contains Start Date and End Date `DateFilter` components
- Includes "Clear Filters" button that appears when dates are selected
- Accepts `startDate`, `endDate`, `onStartDateChange`, `onEndDateChange`, `onClear` props
- Shared across Browse, Search, and History views

#### 9. Main App Layout (`frontend/src/App.tsx`)
- **View Modes**: `'browse' | 'search' | 'history' | 'detail'`
- **State Management**:
  - `viewMode` - Current view state
  - `searchResults` - Current search results
  - `currentSearchId` - ID of current search (for history pagination)
  - `selectedSource` - Currently viewed image detail
  - `searchQuery` - Current search query string
  - `searchPagination` - Pagination info for search results
  - `startDate` - Start date filter (Dayjs | null)
  - `endDate` - End date filter (Dayjs | null)
- **Features**:
  - Starfield animated background
  - Sticky header with title and back button (in detail mode)
  - Search bar always visible
  - Shared date filters section (`FiltersSection`) visible on all views (browse, search, history)
  - Tab navigation: Browse, History, Search Results (when available)
  - Smooth scroll to top on view changes
  - Detail view with back navigation
  - Search result pagination
  - History result pagination
  - Date filtering: Filters apply to Browse, Search, and History views
  - Date filters reset page to 1 when changed

#### 10. Frontend Types (`frontend/src/types.ts`)
TypeScript type definitions:
- `Source` - Source object type matching backend model
- `ViewMode` - Union type: `'browse' | 'search' | 'history' | 'detail'`
- `SearchResponse` - Search API response type
- `SearchHistoryResponse` - History list response type
- `SearchHistoryDetailResponse` - History detail response type

#### 11. API Client (`frontend/src/api.ts`)
- Axios-based API client
- Base URL configuration
- Centralized HTTP client for all API calls

#### 12. Date Filtering (`frontend/src/`)
- **Components**:
  - `components/DateFilter.tsx` - Reusable MUI date picker component
  - `components/FiltersSection.tsx` - Container for shared date filters
- **Constants**:
  - `constants/muiDatePickerStyles.ts` - MUI styling constants (`textFieldSxMuiStyling`, `popperSxMuiStyling`)
- **Features**:
  - Date filters shared across Browse, Search, and History views
  - Uses MUI X Date Pickers with custom space-themed styling
  - Start Date and End Date pickers with validation (end date >= start date)
  - "Clear Filters" button appears when dates are selected
  - Dates formatted as `YYYY-MM-DD` strings for API calls
  - Filters passed as query parameters: `start_date` and `end_date`
  - Page resets to 1 when filters change

#### 12.5. API Call Protections (`frontend/src/`)
- **Debouncing**:
  - All API calls triggered by filter changes are debounced with 400ms delay using lodash `debounce`
  - Prevents excessive API calls when users rapidly change filters or pagination
  - Implemented in:
    - `components/Sources.tsx` - Debounces API calls when date filters or pagination change
    - `components/SearchHistory.tsx` - Debounces API calls when date filters or pagination change
  - Debounced functions are stored in `useRef` to persist across renders
  - Pending debounced calls are canceled when dependencies change (cleanup in `useEffect`)
  - Uses `DebouncedFunc` type from lodash for proper TypeScript typing

- **Invalid Date Validation**:
  - Prevents API calls when date filters contain "Invalid Date"
  - Validation utility function: `utils/dateUtils.ts::isInvalidDate()`
    - Checks if date string contains "Invalid Date" substring
    - Validates date parsing (checks if `new Date(dateString)` results in invalid date)
    - Returns `false` for empty strings/undefined (considered valid - no filter)
  - Implemented in:
    - `components/Sources.tsx` - Validates `startDate` and `endDate` before API calls
    - `components/SearchHistory.tsx` - Validates `startDate` and `endDate` before API calls
    - `components/SearchBar.tsx` - Validates dates before search, shows error message "Please select valid dates"
    - `App.tsx::handleSearchPageChange()` - Validates Dayjs objects using `.isValid()` and formatted strings
  - For Dayjs objects: Checks `.isValid()` method before formatting to string
  - API calls are skipped entirely when invalid dates are detected (no error thrown, graceful handling)

- **Dependencies**:
  - `lodash` - Provides `debounce` function and `DebouncedFunc` type
  - `@types/lodash` - TypeScript type definitions for lodash

#### 13. UI/UX Enhancements (Final Polish Steps)

**Design System & Visual Improvements:**
- Modern color scheme: Use space-themed gradients (dark blues, purples) with good contrast
- Typography: Improve font hierarchy with clear headings and readable body text
- Spacing: Consistent padding/margins using Tailwind spacing scale
- Shadows & borders: Subtle elevation for cards, clean borders for separation

**Search Bar (`SearchBar.tsx`):**
- Large, prominent search input with icon (magnifying glass)
- Smooth focus states with border color transitions
- Clear button (X) appears when typing
- Search button with hover effects
- Placeholder text: "Search NASA images... (e.g., 'Mars rovers', 'solar flares')"
- Loading state: Show spinner or skeleton while searching
- Error state: User-friendly error messages with retry option

**Image Cards (`Sources.tsx`):**
- Card hover effects: Slight lift/shadow increase on hover
- Image lazy loading with placeholder/blur effect
- Smooth image load transitions
- Confidence badge: Rounded pill design with icon (star/checkmark)
- Truncate long descriptions with "Read more" expand option
- Date formatting: Human-readable format (e.g., "2 days ago", "Jan 15, 2024")
- Responsive grid: 1 column mobile, 2 tablet, 3 desktop, 4+ large screens

**Search History (`SearchHistory.tsx`):**
- Collapsible sidebar or drawer component
- History items: Card-based design with hover states
- Icon indicators: Clock icon for timestamp, image icon for result count
- Delete button: Trash icon with confirmation dialog/modal
- Click to view: Smooth transition to show results
- Empty state: Friendly message "No search history yet"
- Pagination: Modern pagination UI with page numbers, prev/next buttons
- Active search highlight: Visual indicator for currently viewed search

**Loading States:**
- Skeleton loaders instead of spinners for image grid
- Shimmer effect on skeleton cards
- Progressive loading: Show images as they load

**Animations & Transitions:**
- Smooth page transitions between browse/search/history views
- Fade-in animations for search results
- Stagger animation for grid items (appear sequentially)
- Smooth scroll behavior
- Button press feedback (scale down slightly on click)

**Error Handling:**
- Toast notifications for errors (non-intrusive)
- Inline error messages for form validation
- Empty states with helpful messages and illustrations
- 404 state for missing search history items

**Responsive Design:**
- Mobile-first approach
- Touch-friendly button sizes (min 44x44px)
- Swipe gestures for mobile history navigation
- Collapsible sections for smaller screens
- Sticky header with search bar on scroll

**Accessibility:**
- Proper ARIA labels for screen readers
- Keyboard navigation support
- Focus indicators visible
- Color contrast meets WCAG AA standards
- Alt text for all images

**Additional Polish:**
- Smooth scroll to top when new search results load
- Debounced search input (optional: search-as-you-type)
- Result count display: "Found 15 results for 'Mars rovers'"
- Clear visual separation between sections
- Consistent icon usage throughout (use heroicons or similar)

### Search Algorithm Details

#### Overview
The search algorithm uses a sophisticated scoring system that prioritizes exact matches over fuzzy matches, with special handling for keywords (which are more curated and specific). The algorithm distinguishes between semantically different words (e.g., "engine" vs "engineer") while still allowing stemmed matching for related terms.

#### Scoring Weights

**Base Weights:**
- **Title**: `0.5` per matching word
- **Description**: `0.2` per matching word
- **Keywords**: `0.6` per matching keyword (highest weight - keywords are most specific)

#### Matching Types

**1. Keyword Matching (Most Important)**
- **Exact Match**: When query word appears as whole word in keywords
  - Base score: `0.6 × 2.0 = 1.2` per match (2x boost for exact matches)
  - Example: Query "engine" matches keyword "engine" → exact match
- **Stemmed Match**: When query word matches after stemming (fuzzy)
  - Base score: `0.6 × 0.7 = 0.42` per match (reduced weight to discourage false positives)
  - Example: Query "engine" stems to "engin", keyword "engineer" stems to "engin" → stemmed match (lower score)
- **Additional Boosts**:
  - All query words match: `× 1.5` multiplier
  - Single-word query with keyword match: `× 1.5` multiplier
  - Maximum keyword score: `0.6 × 2.0 × 1.5 × 1.5 = 2.7` (for single-word exact match)

**2. Title Matching**
- **Exact Phrase Match**: When entire query appears in title
  - Score: `0.5 × query_word_count × 2.0`
  - Example: Query "Mars rovers" in title "Mars Rovers Mission" → phrase match
- **Word Match**: When individual query words appear in title
  - Base score: `0.5` per matching word
  - Boost: All words match → `× 1.5` multiplier
  - Maximum title score: `0.5 × 2.0 × query_word_count` (phrase match)

**3. Description Matching**
- **Exact Phrase Match**: When entire query appears in description
  - Score: `0.2 × query_word_count × 1.5`
- **Word Match**: When individual query words appear in description
  - Base score: `0.2` per matching word
  - Boost: All words match → `× 1.3` multiplier
  - Maximum description score: `0.2 × 1.5 × query_word_count` (phrase match)

#### Completeness Bonus
- If ALL query words matched across any combination of title/description/keywords: `+0.2` bonus
- Only applies to multi-word queries (2+ words)

#### Normalization
- Raw scores are normalized to 0-1 range by dividing by maximum possible score
- Maximum possible score calculation accounts for all boosts and bonuses
- Final confidence: `min(score / max_possible_score, 1.0)`

#### Filtering & Ranking
- Results with confidence < `0.25` are filtered out
- Remaining results sorted by confidence descending
- Top 50 results returned

#### Example Scoring Scenarios

**Example 1: Query "engine"**

**Article A: KSC-04pd1644**
- Title: "KSC-04pd1644" (no match)
- Description: Contains "engine" multiple times (1 match)
- Keywords: ["engine", "ssme", "space shuttle main engine"]
  - Exact match: "engine" → `0.6 × 2.0 = 1.2`
  - Single-word boost: `× 1.5` → `1.2 × 1.5 = 1.8`
- Description score: `0.2 × 1 = 0.2`
- **Total raw score**: `1.8 + 0.2 = 2.0`
- **Normalized confidence**: `~0.31`

**Article B: "Test Engineer"**
- Title: Contains "Engineer" (1 match via stemming)
- Description: Contains "Engineer" (1 match via stemming)
- Keywords: ["Engineer"]
  - Stemmed match only: "engine" stems to "engin", "Engineer" stems to "engin"
  - Stemmed score: `0.6 × 0.7 = 0.42`
- Title score: `0.5 × 1 = 0.5`
- Description score: `0.2 × 1 = 0.2`
- **Total raw score**: `0.42 + 0.5 + 0.2 = 1.12`
- **Normalized confidence**: `~0.17` (below threshold, filtered out)

**Result**: Article A ranks higher because it has exact keyword match, even though Article B has matches in title.

**Example 2: Query "Mars rovers"**

**Article C: "Mars Rover Mission"**
- Title: Contains both "Mars" and "rovers" (2 matches)
  - Score: `0.5 × 2 = 1.0`
  - All words match boost: `× 1.5` → `1.0 × 1.5 = 1.5`
- Description: Contains "Mars" and "rovers" (2 matches)
  - Score: `0.2 × 2 = 0.4`
  - All words match boost: `× 1.3` → `0.4 × 1.3 = 0.52`
- Keywords: ["Mars", "Rover"]
  - Exact matches: 2 matches → `0.6 × 2.0 × 2 = 2.4`
  - All words match boost: `× 1.5` → `2.4 × 1.5 = 3.6`
- Completeness bonus: `+0.2` (all words matched)
- **Total raw score**: `1.5 + 0.52 + 3.6 + 0.2 = 5.82`
- **Max possible score**: `(2.7 + 1.0 + 0.3) × 2 + 0.2 = 8.2`
- **Normalized confidence**: `5.82 / 8.2 ≈ 0.71` (high confidence)

#### Scoring Flow Diagram

```
Query: "engine"
│
├─ Tokenize & Stem
│  ├─ Original: ["engine"]
│  └─ Stemmed: ["engin"]
│
└─ For each article:
   │
   ├─ Keyword Matching
   │  ├─ Exact match? "engine" in keywords?
   │  │  ├─ YES → Score: 0.6 × 2.0 × 1.5 = 1.8
   │  │  └─ NO → Check stemmed match
   │  │     ├─ "engin" matches stemmed keywords?
   │  │     │  ├─ YES → Score: 0.6 × 0.7 = 0.42
   │  │     │  └─ NO → Score: 0.0
   │  │
   ├─ Title Matching
   │  ├─ Extract words from title → stem
   │  ├─ Count matches: "engin" in title words?
   │  └─ Score: matches × 0.5
   │
   ├─ Description Matching
   │  ├─ Extract words from description → stem
   │  ├─ Count matches: "engin" in description words?
   │  └─ Score: matches × 0.2
   │
   ├─ Calculate Total Raw Score
   │  └─ keyword_score + title_score + description_score
   │
   ├─ Check Completeness Bonus
   │  └─ All words matched? → +0.2
   │
   ├─ Normalize Score
   │  └─ score / max_possible_score
   │
   └─ Filter & Sort
      ├─ confidence >= 0.25?
      └─ Sort by confidence DESC
```

#### Visual Example: "engine" Query Scoring

```
┌─────────────────────────────────────────────────────────────┐
│ Query: "engine"                                              │
│ Original words: ["engine"]                                  │
│ Stemmed words: ["engin"]                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │ Article: KSC-04pd1644             │
        │ Title: "KSC-04pd1644"             │
        │ Description: "...engine..."        │
        │ Keywords: ["engine", "ssme"]       │
        └───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐        ┌──────────┐       ┌──────────┐
   │Keywords │        │  Title   │       │Description│
   │         │        │          │       │           │
   │ Exact:  │        │ Matches: │       │ Matches:  │
   │ "engine"│        │    0     │       │     1     │
   │         │        │          │       │           │
   │ Score:  │        │ Score:   │       │ Score:    │
   │ 1.8     │        │ 0.0     │       │ 0.2       │
   └─────────┘        └──────────┘       └──────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Raw Score: 2.0  │
                   │ Max Possible:   │
                   │ ~6.4            │
                   │                 │
                   │ Confidence:    │
                   │ 2.0 / 6.4      │
                   │ ≈ 0.31         │
                   └─────────────────┘
```

```
┌─────────────────────────────────────────────────────────────┐
│ Query: "engine"                                              │
│ Original words: ["engine"]                                  │
│ Stemmed words: ["engin"]                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │ Article: "Test Engineer"          │
        │ Title: "...Test Engineer..."      │
        │ Description: "...Engineer..."     │
        │ Keywords: ["Engineer"]            │
        └───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐        ┌──────────┐       ┌──────────┐
   │Keywords │        │  Title   │       │Description│
   │         │        │          │       │           │
   │ Exact:  │        │ Matches: │       │ Matches:  │
   │   NO    │        │    1     │       │     1     │
   │         │        │(stemmed) │       │(stemmed)  │
   │ Stemmed:│        │          │       │           │
   │ "engin" │        │ Score:   │       │ Score:    │
   │         │        │ 0.5     │       │ 0.2       │
   │ Score:  │        │          │       │           │
   │ 0.42    │        │          │       │           │
   └─────────┘        └──────────┘       └──────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Raw Score: 1.12 │
                   │ Max Possible:   │
                   │ ~6.4            │
                   │                 │
                   │ Confidence:    │
                   │ 1.12 / 6.4     │
                   │ ≈ 0.17         │
                   │                 │
                   │ FILTERED OUT    │
                   │ (< 0.25)        │
                   └─────────────────┘
```

#### Key Design Decisions

1. **Keywords Weight Highest (0.6)**: Keywords are manually curated and most specific, so they should have the highest weight
2. **Exact Match Boost (2x)**: Exact keyword matches get 2x boost to prioritize semantically correct matches
3. **Stemmed Match Penalty (0.7x)**: Stemmed matches get reduced weight to avoid false positives (e.g., "engine" vs "engineer")
4. **Title Weight (0.5)**: Titles are important but less specific than keywords
5. **Description Weight (0.2)**: Descriptions are least specific but still valuable
6. **Completeness Bonus**: Rewards articles that match all query words across any fields
7. **Minimum Threshold (0.25)**: Filters out very weak matches to improve result quality

### File Structure
```
backend/
├── app.py (main FastAPI app, CORS config, router registration)
├── constants.py (scoring weights, thresholds, image size patterns)
├── models.py (Pydantic request/response models)
├── db_instance.py (singleton SpaceDB instance)
├── requirements.txt (dependencies)
├── pyproject.toml (project configuration)
├── pytest.ini (pytest configuration)
├── api/
│   ├── __init__.py
│   ├── sources.py (GET /api/sources - browse endpoints)
│   ├── search.py (GET /api/search - search endpoint)
│   └── history.py (GET/DELETE /api/search-history - history endpoints)
├── managers/
│   ├── __init__.py
│   ├── sources_manager.py (source loading, transformation, pagination)
│   ├── search_manager.py (search algorithm, scoring functions)
│   └── history_manager.py (history CRUD operations)
├── data/
│   ├── db.py (SpaceDB class - data persistence)
│   ├── mock_data.json (NASA image data)
│   └── search_history.json (created at runtime - search history storage)
└── tests/
    ├── __init__.py
    ├── conftest.py (pytest fixtures)
    ├── test_sources.py
    ├── test_search.py
    └── test_history.py

frontend/src/
├── App.tsx (main app component - view management, state)
├── api.ts (Axios API client configuration)
├── types.ts (TypeScript type definitions)
├── index.tsx (React app entry point)
├── index.css (global styles, starfield animation)
├── setupTests.ts (test configuration)
├── testUtils.tsx (testing utilities)
├── constants/
│   └── muiDatePickerStyles.ts (MUI date picker styling constants)
├── utils/
│   └── dateUtils.ts (date utility functions: formatDate, formatRelativeDate, scrollToTop, isInvalidDate)
└── components/
    ├── SearchBar.tsx (search input component with debounce and date validation)
    ├── SearchHistory.tsx (history list component with debounce and date validation)
    ├── SearchHistoryItem.tsx (individual history item)
    ├── Sources.tsx (image grid component with debounce and date validation)
    ├── ImageDetail.tsx (image detail view)
    ├── Pagination.tsx (pagination controls)
    ├── LoadingSpinner.tsx (loading indicator)
    ├── ResultsCount.tsx (result count display)
    ├── DateFilter.tsx (reusable date picker component)
    └── FiltersSection.tsx (shared date filters container)
```

### API Contract Examples

**GET /api/sources?page=1&limit=20&start_date=2024-01-01&end_date=2024-12-31**
- Query params: `{page: int (default: 1, min: 1), limit: int (default: 20, min: 1, max: 100), start_date: str (optional, format: YYYY-MM-DD), end_date: str (optional, format: YYYY-MM-DD)}`
- Response: `{"results": [Source, ...], "total": 100, "page": 1, "limit": 20, "total_pages": 5}`
- Date filtering: Filters sources by `launch_date` field within the specified date range

**GET /api/search?q=Mars+rovers&page=1&limit=20&start_date=2024-01-01&end_date=2024-12-31**
- Query params: `{q: str (required, min_length: 1, max_length: 500), page: int (default: 1, min: 1), limit: int (default: 20, min: 1, max: 100), start_date: str (optional, format: YYYY-MM-DD), end_date: str (optional, format: YYYY-MM-DD)}`
- Response: `{"results": [Source with confidence, ...], "search_id": "uuid", "total": 15, "page": 1, "limit": 20, "total_pages": 1}`
- Validation: Query is stripped, sanitized (null bytes removed), and validated for length
- Date filtering: Filters search results by `launch_date` field within the specified date range

**GET /api/search-history?page=1&limit=10&start_date=2024-01-01&end_date=2024-12-31**
- Query params: `{page: int (default: 1, min: 1), limit: int (default: 10, min: 1, max: 100), start_date: str (optional, format: YYYY-MM-DD), end_date: str (optional, format: YYYY-MM-DD)}`
- Response: `{"items": [{"id": "uuid", "query": "...", "timestamp": "...", "result_count": 5}, ...], "total": 25, "page": 1, "limit": 10, "total_pages": 3}`
- Date filtering: Filters history items by `timestamp` field within the specified date range

**GET /api/search-history/{search_id}?page=1&limit=10**
- Path param: `{search_id: str}` (UUID)
- Query params: `{page: int (default: 1, min: 1), limit: int (default: 10, min: 1, max: 100)}`
- Response: `{"id": "uuid", "query": "...", "timestamp": "...", "results": [Source, ...], "total": 15, "page": 1, "limit": 10, "total_pages": 2}`
- Error: `404 Not Found` if search_id doesn't exist

**DELETE /api/search-history/{search_id}**
- Path param: `{search_id: str}` (UUID)
- Response: `204 No Content` on success
- Error: `404 Not Found` if search_id doesn't exist

---

## Appendix: Search Route Flow Explanation

### Step-by-Step Process

1. **User Input**: User types a query (e.g., "Mars rovers") in the search bar and submits.

2. **Frontend Request**: Frontend sends `GET /api/search?q=Mars+rovers&page=1&limit=20` to the backend.

3. **FastAPI Validation**: FastAPI validates query parameters using Pydantic validators:
   - `q`: Required string, min_length=1, max_length=500
   - `page`: Optional int, default=1, ge=1
   - `limit`: Optional int, default=20, ge=1, le=100
   - Additional validation: Query is stripped and sanitized (null bytes removed)
   - If invalid, returns 400 Bad Request

4. **Query Tokenization**: Backend tokenizes the query:
   - Lowercase: "mars rovers"
   - Split: ["mars", "rovers"]
   - Remove stop words (if any)

5. **Search Algorithm**: For each source in the database:
   - Check title for query words → +0.5 per match
   - Check description for query words → +0.2 per match
   - Check keywords array for matches → +0.3 per match
   - Sum scores and normalize to 0-1 range

6. **Result Filtering & Sorting**:
   - Filter results with confidence >= 0.25 (CONFIDENCE_THRESHOLD_MIN)
   - Sort by confidence descending
   - Take top 50 results (MAX_SEARCH_RESULTS)
   - Apply pagination (page, limit)
   - Add `confidence` field to each `Source` object

7. **Generate Search ID**: Create a UUID for this search.

8. **Save to History**: Call `db.save_search()` to persist:
   - `id`: UUID
   - `query`: "Mars rovers"
   - `timestamp`: current ISO timestamp
   - `results`: list of result dictionaries

9. **Response**: Return `SearchResponse`:
   ```json
   {
     "results": [
       {"id": 1, "name": "...", "confidence": 0.85, ...},
       {"id": 5, "name": "...", "confidence": 0.72, ...}
     ],
     "search_id": "uuid-1234-5678"
   }
   ```

10. **Frontend Display**: Frontend receives results and displays them in a grid with confidence badges (green/yellow/red).

### Sequence Diagram

```
User          Frontend          FastAPI          SpaceDB          Managers          History File
│                │                 │                 │                 │                 │
│  Type query    │                 │                 │                 │                 │
├───────────────>│                 │                 │                 │                 │
│                │                 │                 │                 │                 │
│  Submit        │                 │                 │                 │                 │
├───────────────>│                 │                 │                 │                 │
│                │                 │                 │                 │                 │
│                │  GET /api/search?q=...&page=1&limit=20            │                 │
│                ├──────────────────────────────────>│                 │                 │
│                │                 │                 │                 │                 │
│                │                 │  Validate query params (FastAPI Pydantic)        │
│                │                 │  Strip & sanitize query                           │
│                │                 │                 │                 │                 │
│                │                 │  get_all_sources()               │                 │
│                │                 ├──────────────────────────────────>│                 │
│                │                 │                 │                 │                 │
│                │                 │                 │  Return sources │                 │
│                │                 │<──────────────────────────────────┤                 │
│                │                 │                 │                 │                 │
│                │                 │  search_sources(query, page, limit)                │
│                │                 ├───────────────────────────────────────────────────>│
│                │                 │                 │                 │                 │
│                │                 │                 │  Tokenize query & calculate scores
│                │                 │                 │  Filter & sort results
│                │                 │                 │  Apply pagination
│                │                 │                 │                 │                 │
│                │                 │                 │  save_search(query, results)    │
│                │                 │                 ├──────────────────────────────────>│
│                │                 │                 │                 │                 │
│                │                 │                 │                 │  Write to JSON  │
│                │                 │                 │                 ├─────────────────>│
│                │                 │                 │                 │                 │
│                │                 │                 │  Return search_id│                 │
│                │                 │<─────────────────────────────────────────────────────┤
│                │                 │                 │                 │                 │
│                │                 │  Return SearchResponse            │                 │
│                │<──────────────────────────────────┤                 │                 │
│                │                 │                 │                 │                 │
│                │  Display results with confidence badges            │                 │
│<───────────────┤                 │                 │                 │                 │
│                │                 │                 │                 │                 │
```

### Key Points

- **Validation First**: FastAPI validates query parameters using Pydantic validators before processing
- **Search Happens In-Memory**: Uses `get_all_sources()` from SpaceDB (already loaded into memory)
- **Business Logic Separation**: Search algorithm in `managers/search_manager.py`, API routes in `api/search.py`
- **History Persistence**: Search is saved to JSON file after successful search with atomic writes
- **Confidence Scores**: Added to Source objects only for search results (not for `/api/sources`)
- **Pagination**: All endpoints support pagination (page, limit parameters)
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes (400, 404, 500)
- **Idempotent**: Same query returns same results (but creates new history entry each time)

