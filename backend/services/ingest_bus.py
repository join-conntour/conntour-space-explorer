"""Ingest entry buses: local sync apply, or Kafka publish for high-scale workers."""

from __future__ import annotations

import json
import os
from typing import Protocol

from models import SourceCreate, SourceIngestResponse
from services.ingest import IngestService, resolve_idempotency_key


class IngestBus(Protocol):
    async def submit(
        self,
        payload: SourceCreate,
        *,
        idempotency_key: str | None,
        service: IngestService,
    ) -> SourceIngestResponse: ...


class LocalIngestBus:
    """Default path: apply immediately through IngestService (duplicate-safe via ledger)."""

    async def submit(
        self,
        payload: SourceCreate,
        *,
        idempotency_key: str | None,
        service: IngestService,
    ) -> SourceIngestResponse:
        return await service.apply(payload, idempotency_key=idempotency_key, bus="http")


class KafkaIngestBus:
    """
    Scale-out path: publish to Kafka/Redpanda topic `sources.ingest.v1`.

    When INGEST_BUS_SYNC_FALLBACK=1 (default in compose profile), also apply locally
    so the UI still receives the source while the log remains durable for workers.
    """

    def __init__(self, bootstrap_servers: str | None = None, topic: str | None = None):
        self.bootstrap_servers = bootstrap_servers or os.getenv(
            "KAFKA_BOOTSTRAP_SERVERS", "redpanda:9092"
        )
        self.topic = topic or os.getenv("KAFKA_INGEST_TOPIC", "sources.ingest.v1")
        self.sync_fallback = os.getenv("INGEST_BUS_SYNC_FALLBACK", "1") == "1"

    async def submit(
        self,
        payload: SourceCreate,
        *,
        idempotency_key: str | None,
        service: IngestService,
    ) -> SourceIngestResponse:
        key = resolve_idempotency_key(payload, idempotency_key)
        message = {
            "idempotency_key": key,
            "payload": payload.model_dump(mode="json"),
        }
        try:
            from aiokafka import AIOKafkaProducer  # type: ignore
        except ImportError as exc:  # pragma: no cover - optional dependency
            if self.sync_fallback:
                return await service.apply(payload, idempotency_key=key, bus="http")
            raise RuntimeError(
                "aiokafka is required when INGEST_BUS=kafka. "
                "Install with: uv add aiokafka"
            ) from exc

        producer = AIOKafkaProducer(bootstrap_servers=self.bootstrap_servers)
        await producer.start()
        try:
            await producer.send_and_wait(
                self.topic,
                json.dumps(message).encode("utf-8"),
                key=key.encode("utf-8"),
            )
        finally:
            await producer.stop()

        if self.sync_fallback:
            return await service.apply(payload, idempotency_key=key, bus="kafka")

        return SourceIngestResponse(
            source=None,
            replayed=False,
            idempotency_key=key,
            bus="kafka",
            status="accepted",
        )


def get_ingest_bus() -> IngestBus:
    mode = os.getenv("INGEST_BUS", "local").strip().lower()
    if mode == "kafka":
        return KafkaIngestBus()
    return LocalIngestBus()
