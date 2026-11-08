#!/usr/bin/env python
"""Kafka/Redpanda consumer that applies ingest commands through IngestService."""

from __future__ import annotations

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.session import AsyncSessionLocal  # noqa: E402
from models import SourceCreate  # noqa: E402
from repositories.idempotency import IdempotencyRepository  # noqa: E402
from repositories.source import SourceRepository  # noqa: E402
from services.ingest import IngestService  # noqa: E402


async def handle_message(raw: bytes) -> None:
    payload = json.loads(raw.decode("utf-8"))
    create = SourceCreate.model_validate(payload["payload"])
    key = payload.get("idempotency_key")
    async with AsyncSessionLocal() as session:
        service = IngestService(
            sources=SourceRepository(session),
            idempotency=IdempotencyRepository(session),
        )
        result = await service.apply(create, idempotency_key=key, bus="kafka")
        print(
            f"applied key={result.idempotency_key} source_id={result.source.id if result.source else None} "
            f"replayed={result.replayed}",
            flush=True,
        )


async def main() -> None:
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "redpanda:9092")
    topic = os.getenv("KAFKA_INGEST_TOPIC", "sources.ingest.v1")
    group = os.getenv("KAFKA_INGEST_GROUP", "sources-ingest-workers")

    try:
        from aiokafka import AIOKafkaConsumer  # type: ignore
    except ImportError as exc:
        raise SystemExit(
            "aiokafka is required for the ingest worker. Install with: uv add aiokafka"
        ) from exc

    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=bootstrap,
        group_id=group,
        enable_auto_commit=False,
        auto_offset_reset="earliest",
    )
    await consumer.start()
    print(f"ingest worker listening on {topic} @ {bootstrap}", flush=True)
    try:
        async for message in consumer:
            await handle_message(message.value)
            await consumer.commit()
    finally:
        await consumer.stop()


if __name__ == "__main__":
    asyncio.run(main())
