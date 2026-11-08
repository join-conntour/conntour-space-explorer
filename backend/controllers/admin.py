from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import AnalyticsResponse
from repositories.analytics import AnalyticsRepository

router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_analytics_repository(session: AsyncSession = Depends(get_db)) -> AnalyticsRepository:
    return AnalyticsRepository(session)


def require_admin_token(x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")) -> None:
    expected = os.getenv("ADMIN_TOKEN", "dev-admin-token")
    if not x_admin_token or x_admin_token != expected:
        raise HTTPException(status_code=401, detail="Invalid admin token")


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    _: None = Depends(require_admin_token),
    repository: AnalyticsRepository = Depends(get_analytics_repository),
) -> AnalyticsResponse:
    return await repository.get_analytics()
