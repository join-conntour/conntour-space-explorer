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
│   ├── pyproject.toml        # Python dependencies (uv)
│   ├── Dockerfile            # Backend Docker image
│   ├── controllers/          # HTTP routing layer
│   │   └── source.py         # Source routes (APIRouter)
│   ├── db/                   # Database layer
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   └── session.py        # Database session management
│   ├── repositories/         # Data access layer
│   │   ├── base.py           # Generic Repository interface
│   │   └── source.py         # PostgreSQL implementation
│   ├── scripts/              # Utility scripts
│   │   └── seed_db.py        # Database seeding from mock data
│   └── data/                 # Mock data
│       └── mock_data.json    # NASA images seed data
├── frontend/                 # React frontend
│   ├── src/                  # Source files
│   ├── public/               # Static files
│   ├── Dockerfile            # Production Docker image
│   ├── Dockerfile.dev        # Development Docker image
│   └── nginx.conf            # Nginx configuration
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

## Quick Start with Docker Compose

### Production Mode

Build and run the entire application with a single command:

```bash
docker compose up --build
```

This will:
- Start PostgreSQL database (seeded with NASA images from `mock_data.json`)
- Build and start the FastAPI backend on http://localhost:5001
- Build and start the React frontend (served via Nginx) on http://localhost:3001

The frontend will proxy API requests to the backend automatically.

### Development Mode (with Hot Reload)

For development with hot-reloading enabled for both frontend and backend:

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


## Cool Feature: "Discover Similar" — Related Images Recommendation Drawer

### Feature name
**Discover Similar** — a slide-in drawer that surfaces the most thematically related NASA images for any selected image.

### Why this feature
When browsing or searching a large image catalog, users often discover interesting images by accident and want to explore related content — but have no natural path to do so. A "more like this" pattern solves the exploration dead-end: instead of returning to the grid and manually reformulating queries, users can click one button and immediately see the 5 most similar images with visual similarity indicators.

### Implementation details

**Backend — `GET /api/sources/{id}/related?limit=5`**

The endpoint constructs a _pseudo-query_ from the source's own metadata (`name + keywords + description[:200]`) and runs it through the same weighted keyword-overlap scoring engine used for natural language search. Other sources are ranked by similarity score and the top N are returned.

The scoring algorithm (`backend/services/scoring.py`) tokenizes text fields, removes stopwords, then computes a per-field overlap ratio (`|query_tokens ∩ field_tokens| / |query_tokens|`). Weights are: title 0.40, keywords 0.35, description 0.25. These weights reflect the signal quality of each field — curated titles carry more meaning per token than free-form description text.

Using the same scoring engine for both search and related-image similarity meant no duplicate logic and a single surface for tuning quality.

**Frontend — `RelatedDrawer.tsx`**

A fixed right-side panel with CSS `transform: translateX` animation driven by `isOpen` state. The `useRelated` hook only fires when `sourceId` changes (not on every open/close), so re-opening the same card doesn't re-fetch. Each related item includes a proportional fill bar (`div` width = `similarity * 100%`) giving instant visual weight to the scores without requiring a chart library.

**Key challenges:**
- Route ordering: `POST /sources/search` must be declared before `GET /sources/{id}` in FastAPI to prevent the string literal `"search"` from being captured as an integer path parameter.
- Tailwind JIT: drawer animation classes (`translate-x-0`, `translate-x-full`) must appear as literal strings in the JSX rather than being dynamically interpolated, so the content scanner includes them in the CSS bundle.
- Keyword normalization: the mock data uses inconsistent keyword formats (proper arrays vs. comma-delimited strings in a single array element). The seeding script normalizes both forms to a flat comma-separated lowercase string before storage.

### Demo

> _Screenshots/GIFs to be added after running the app locally._
>
> To try it: `docker compose -f docker-compose.dev.yml up --build`, then visit http://localhost:3001/browse and click **Discover Similar** on any image card.

---

## Deliverables

- A GitHub repository with your implementation (fork this one if you'd like)
- Document your **Cool Feature** in the README:
  1. **Feature name**: What did you build?
  2. **Why this feature**: What problem does it solve for users?
  3. **Implementation details**: Key technical decisions and challenges
  4. **Demo**: Screenshots or GIFs showing it in action

## Use Your Own Stack (Optional)
If you prefer, you are **not required** to fork or use this repository. You may build your own stack—language, framework, and tooling of your choice—so long as you meet the [requirements](#requirements) above.

Feel free to organize your codebase however you like and push it to a new repository.
