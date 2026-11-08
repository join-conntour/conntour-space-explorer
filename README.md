# Conntour Space Explorer – Home Assignment

## Overview

Build a small web application that allows users to explore and search a set of images retrieved from NASA. The goal is to create a smooth and intelligent experience for browsing and querying these images.

---

## Requirements

1. **Browse Images**  
   - Users should be able to view all the images retrieved from the `/sources` API.  
   - The browsing experience should be clear, visually friendly, and support viewing image metadata.

2. **Search Using Natural Language**  
   - Users should be able to type free-text queries (e.g., _"images of Mars rovers"_, _"solar flares"_).  
   - The app should return a list of images that match the query, with a **confidence score** shown per result.

3. **Search History**  
   - The app should keep a history of previous user searches and the images that were returned.  
   - Users should be able to revisit past queries and view their results again.
   - Users should be able to **delete individual searches** from their history.
   - Since history can grow large over time, the UI should **support pagination** or an alternative way to handle large result sets efficiently.

4. **Special Feature**  
   - Implement **one creative feature** that showcases your full-stack skills.
   - This should be something beyond the basic requirements that demonstrates your ability to think creatively and execute technically.
   - Document the feature in your submission (see [Deliverables](#deliverables)).

---

## Notes & Suggestions

- **Implementing real machine learning or NLP is _not_ required.**  
  You can simulate search relevance and confidence scores using a basic scoring method, such as keyword overlap or a hash function.

- Focus on building an intuitive and well-structured user experience.

- Bonus points for adding filtering, pagination, or authentication — but those are not required.

---

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL
- **Frontend**: React + TypeScript + Tailwind CSS
- **Infrastructure**: Docker Compose, Nginx, uv (Python package manager)

## Project Structure

```
space-explorer/
├── backend/                  # FastAPI backend
│   ├── app.py                # App setup, middleware, router registration
│   ├── models.py             # Pydantic domain models
│   ├── services/             # Tag extraction + confidence scoring
│   ├── controllers/          # HTTP routing layer (sources, search, history, admin)
│   ├── db/                   # SQLAlchemy models + session
│   ├── repositories/         # Data access layer
│   ├── scripts/seed_db.py    # Additive schema + seed
│   └── data/                 # mock_data.json + object_lexicon.json
├── frontend/                 # React + TypeScript + shadcn/ui
│   └── src/                  # Explorer, filters, modal, history, admin
├── scripts/setup.sh          # One-command local setup
├── plans/                    # Architecture blueprint
├── docker-compose.yml        # Production compose file
├── docker-compose.dev.yml    # Development compose file
└── README.md                 # This file
```

## Prerequisites

- Docker and Docker Compose
- (Optional for local development):
  - Python 3.11+
  - Node.js 20+
  - PostgreSQL 16+
  - uv (Python package installer)

---

## Quick Start

The fastest way to run the app locally is the one-command setup script:

```bash
./scripts/setup.sh
```

This will:
- Start Docker Desktop on macOS when needed
- Build and start the development Docker Compose stack
- Wait until Postgres, the API (`http://localhost:5001`), and the frontend (`http://localhost:3001`) are healthy
- Apply the additive database seed (metadata, keywords, object tags)
- Install frontend dependencies into the container volume when needed

Useful flags:
- `--no-build` skip image rebuilds
- `--install` force `npm install` in the frontend container
- `--reset` destroy containers and the Postgres volume, then rebuild

Once the script finishes:
- App: http://localhost:3001
- API docs: http://localhost:5001/docs
- Admin analytics: http://localhost:3001/admin (token default: `dev-admin-token`)

### Production Mode

```bash
docker compose up --build
```

This will:
- Start PostgreSQL database (seeded with NASA images from `mock_data.json`)
- Build and start the FastAPI backend on http://localhost:5001
- Build and start the React frontend (served via Nginx) on http://localhost:3001

The frontend will proxy API requests to the backend automatically.

### Development Mode (with Hot Reload)

If you prefer Compose directly instead of `./scripts/setup.sh`:

```bash
docker compose -f docker-compose.dev.yml up --build
```

This enables:
- PostgreSQL database with persistent volume
- Backend: Auto-reload on Python file changes
- Frontend: React development server with hot module replacement

### Useful Docker Commands

```bash
# Start services in background
docker compose up -d

# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend

# Stop services
docker compose down

# Rebuild and restart a specific service
docker compose up --build backend

# Clean up everything (including volumes and database data)
docker compose down -v --rmi all

# Connect to PostgreSQL database
docker compose exec db psql -U postgres -d space_explorer
```

---

## Local Development Setup (Without Docker)

### Prerequisites

1. Install uv:

   **Mac/Linux:**
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

   **Windows (PowerShell):**
   ```powershell
   powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```

2. Install and start PostgreSQL, then create the database:
   ```bash
   createdb space_explorer
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Set the database URL (adjust if your PostgreSQL uses different credentials):

   **Mac/Linux:**
   ```bash
   export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/space_explorer"
   ```

   **Windows (PowerShell):**
   ```powershell
   $env:DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/space_explorer"
   ```

3. Install dependencies:
   ```bash
   uv sync
   ```

4. Seed the database:
   ```bash
   uv run python scripts/seed_db.py
   ```

5. Run the server:
   ```bash
   uv run uvicorn app:app --reload --port 5001
   ```

   The backend will run on http://localhost:5001
   - API docs available at http://localhost:5001/docs

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

   The frontend will run on http://localhost:3001

---


## Cool Feature: Dynamic Classification & Semantic Tag Filtering

1. **Feature name**  
   Dynamic Classification & Semantic Tag Filtering System, plus an Admin Analytics dashboard.

2. **Why this feature**  
   Free-text NASA captions mention concrete objects (`rover`, `astronaut`, `launch pad`) and centers (`JPL`, `KSC`), but the original seed path dropped that structure. Users needed a way to combine natural-language search with precise multi-select filters over classifications, keywords, NASA centers, and capture dates, then revisit those searches later.

3. **Implementation details**
   - Object tags are extracted deterministically from title/description/keywords against a frozen lexicon in `backend/data/object_lexicon.json`. Appearance tags (`man`, `women`, `smile`, `blue shirt`, …) are **visual-only**: curated in `backend/data/visual_annotations.json` after looking at the photo, never inferred from captions (so a helicopter rescue caption that mentions a women-in-aerospace forum does not get tagged `women`).
   - PostgreSQL stores `keywords` and `object_tags` as `TEXT[]` with GIN indexes; browse filters use containment (`@>`), and search scores combine object-tag membership, keyword hits, and description proximity (with synonym expansion such as `men`↔`man`, `smile`↔`smiling`).
   - Search history stores query + filters + a result snapshot so reopen is instant and independent of score recomputation.
   - View counts are incremented through `POST /api/sources/{id}/view` with an `X-View-Key` guard for React Strict Mode.
   - Admin analytics (`GET /api/admin/analytics`) is gated by `X-Admin-Token` / `ADMIN_TOKEN` and surfaces top keywords, most-viewed images, usage totals, and newly introduced classifications.
   - Image ingest is idempotent: `Idempotency-Key` + Postgres ledger + `nasa_id` upsert. Novel operator tags are persisted into `dynamic_object_tags.json` and appear under Filters after save. Default bus is local HTTP; optional Kafka/Redpanda profile (`--profile kafka`) shares the same apply path for high-scale workers.
   - Full blueprint: [`plans/search-images-architecture.md`](plans/search-images-architecture.md).

### Features implemented

| Area | What shipped |
| --- | --- |
| Browse | Infinite-scroll gallery (page size 20), Most Recent / Most Viewed / Highest Confidence sorts |
| Natural-language search | Lexicon-activated pills, confidence badges, AND constraints for multi-phrase visual queries (`men with blue shirt`) |
| Visual classification | Curated appearance tags for people/clothing/smile; caption-safe `VISUAL_ONLY_TAGS` |
| Filters | Centers, keywords, object tags, date range; clear-search drops search-activated tags without stranding leftover facets |
| Search history | Paginated sidebar, restore snapshot, delete one / clear all (AlertDialog) |
| Image details | Immersive modal with overview, classifications, record metadata, live view count |
| Add image | Same classify pipeline as seed, appearance quick-picks, novel-tag candidates → Filters, idempotent ingest |
| Admin | Token-gated analytics for usage, top keywords, top viewed, new classifications |
| Quality | Backend unit tests (tags, scoring, idempotency), frontend unit tests + production build, Playwright e2e locally against the live stack; GitHub Actions CI for unit/build stages |

### Demo

[Watch the demo](demo.mp4)

### If we had more time

- **Better classification** — vision-assisted suggestions (still human-confirmed for appearance tags), richer clothing/color lexicon, bulk re-audit UI for `visual_annotations.json`.
- **Astro-Bookmarks / Space Collections** — named folders with notes and many-to-many membership (`collections` + `collection_sources`), “Save to collection” in the modal.
- **Voyage Timeline** — year (and Mars Sol) density chart under the header; click a bucket to set the date filter.
- **Ingest at scale** — turn on the Kafka profile by default in staging, dead-letter queue, operator replay UI for failed idempotency keys.
- **Search UX** — saved filter presets, shareable query URLs, “why this matched” breakdown next to confidence.
- **Coverage** — broader Playwright paths for Filters + Add image novel tags; visual regression on the modal.

## Deliverables

- A GitHub repository with your implementation (fork this one if you'd like)
- The **Cool Feature** documentation above
- Architecture plan in `plans/search-images-architecture.md`
- Demo recording at the repo root (`demo.mp4`)

## Use Your Own Stack (Optional)
If you prefer, you are **not required** to fork or use this repository. You may build your own stack—language, framework, and tooling of your choice—so long as you meet the [requirements](#requirements) above.

Feel free to organize your codebase however you like and push it to a new repository.
