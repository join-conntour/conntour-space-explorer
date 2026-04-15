from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class SourceModel(Base):
    """SQLAlchemy model for sources table."""

    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, nullable=False)
    type = Column(String(100), nullable=False)
    launch_date = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Active")
    keywords = Column(Text, nullable=True)


class SearchHistoryModel(Base):
    """SQLAlchemy model for search_history table."""

    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(Text, nullable=False)
    result_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    results_json = Column(Text, nullable=True)
