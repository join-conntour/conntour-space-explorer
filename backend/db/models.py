from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class SourceModel(Base):
    """SQLAlchemy model for sources table."""

    __tablename__ = "sources"
    __table_args__ = (
        Index("ix_sources_keywords_gin", "keywords", postgresql_using="gin"),
        Index("ix_sources_object_tags_gin", "object_tags", postgresql_using="gin"),
        Index("ix_sources_album_gin", "album", postgresql_using="gin"),
        Index("ix_sources_center", "center"),
        Index("ix_sources_creation_date", "creation_date"),
        Index("ix_sources_view_count", "view_count"),
        Index("ix_sources_nasa_id", "nasa_id", unique=True),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, nullable=False)
    type = Column(String(100), nullable=False)
    launch_date = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Active")

    nasa_id = Column(String(120), nullable=True)
    center = Column(String(20), nullable=True)
    location = Column(Text, nullable=True)
    photographer = Column(Text, nullable=True)
    secondary_creator = Column(Text, nullable=True)
    description_508 = Column(Text, nullable=True)
    album = Column(ARRAY(Text), nullable=False, server_default="{}")

    creation_date = Column(DateTime(timezone=True), nullable=True)
    indexed_at = Column(DateTime(timezone=True), nullable=True)
    view_count = Column(Integer, nullable=False, server_default="0", default=0)

    keywords = Column(ARRAY(Text), nullable=False, server_default="{}")
    keywords_raw = Column(ARRAY(Text), nullable=False, server_default="{}")
    object_tags = Column(ARRAY(Text), nullable=False, server_default="{}")

    image_full_url = Column(Text, nullable=True)


class SearchHistoryModel(Base):
    """Persisted natural-language search history with result snapshots."""

    __tablename__ = "search_history"
    __table_args__ = (Index("ix_history_created_id", "created_at", "id"),)

    id = Column(Integer, primary_key=True)
    query = Column(Text, nullable=False)
    filters = Column(JSONB, nullable=False, server_default="{}")
    activated_object_tags = Column(ARRAY(Text), nullable=False, server_default="{}")
    results = Column(JSONB, nullable=False, server_default="[]")
    result_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ObjectTagIntroductionModel(Base):
    """Earliest image that introduced each object classification."""

    __tablename__ = "object_tag_introductions"
    __table_args__ = (Index("ix_tag_intro_capture", "capture_date"),)

    tag = Column(Text, primary_key=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    capture_date = Column(DateTime(timezone=True), nullable=True)
    indexed_at = Column(DateTime(timezone=True), nullable=True)


class IngestIdempotencyModel(Base):
    """Durable ingest ledger so HTTP retries and Kafka at-least-once delivery stay duplicate-safe."""

    __tablename__ = "ingest_idempotency"
    __table_args__ = (Index("ix_ingest_idempotency_source", "source_id"),)

    idempotency_key = Column(Text, primary_key=True)
    request_hash = Column(Text, nullable=False)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    bus = Column(String(20), nullable=False, server_default="http")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
