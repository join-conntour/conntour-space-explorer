from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from controllers import (
    admin_router,
    facets_router,
    history_router,
    search_router,
    source_router,
)
from db import Base, engine
from db import models as _db_models  # noqa: F401  — register ORM tables on Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - creates tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Space Explorer API",
    description="API for browsing and searching NASA images",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(source_router)
app.include_router(facets_router)
app.include_router(search_router)
app.include_router(history_router)
app.include_router(admin_router)
