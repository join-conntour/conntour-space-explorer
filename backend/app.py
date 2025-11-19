import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import history, search, sources

app = FastAPI()

# Rate limiting can be added later if needed using slowapi
# For now, it's disabled to keep things simple

# CORS configuration - use environment variable or default to allow localhost for development
# In production, set CORS_ORIGINS environment variable to comma-separated list of allowed origins
# Example: CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
cors_origins_env = os.getenv("CORS_ORIGINS")

if cors_origins_env:
    # Production: use specific origins from environment variable
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
else:
    # Development: temporarily allow all origins to debug CORS issues
    # TODO: Restrict to localhost only once working
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins for development debugging
        allow_credentials=False,  # Must be False when allow_origins=["*"]
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register routers
app.include_router(sources.router)
app.include_router(search.router)
app.include_router(history.router)
