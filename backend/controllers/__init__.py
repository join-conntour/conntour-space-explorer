from .admin import router as admin_router
from .history import router as history_router
from .search import router as search_router
from .source import facets_router
from .source import router as source_router

__all__ = [
    "admin_router",
    "facets_router",
    "history_router",
    "search_router",
    "source_router",
]
