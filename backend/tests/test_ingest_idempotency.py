from models import SourceCreate
from services.ingest import canonical_request_hash, resolve_idempotency_key


def test_resolve_prefers_provided_key():
    payload = SourceCreate(name="A", image_url="https://example.com/a.jpg", nasa_id="X")
    assert resolve_idempotency_key(payload, " client-key ") == "client-key"


def test_resolve_uses_nasa_id_when_header_missing():
    payload = SourceCreate(name="A", image_url="https://example.com/a.jpg", nasa_id="PIA22505")
    assert resolve_idempotency_key(payload, None) == "nasa:PIA22505"


def test_resolve_uses_fingerprint_without_nasa_id():
    payload = SourceCreate(name="Probe", image_url="https://example.com/a.jpg")
    key = resolve_idempotency_key(payload, None)
    assert key.startswith("fp:")
    assert resolve_idempotency_key(payload, None) == key


def test_request_hash_stable_for_equivalent_payloads():
    left = SourceCreate(
        name="Probe",
        image_url="https://example.com/a.jpg",
        keywords=["Mars", "Rover"],
        object_tags=["rover"],
    )
    right = SourceCreate(
        name="Probe",
        image_url="https://example.com/a.jpg",
        keywords=["Rover", "Mars"],
        object_tags=["rover"],
    )
    assert canonical_request_hash(left) == canonical_request_hash(right)


def test_request_hash_changes_when_description_changes():
    left = SourceCreate(name="Probe", image_url="https://example.com/a.jpg", description="one")
    right = SourceCreate(name="Probe", image_url="https://example.com/a.jpg", description="two")
    assert canonical_request_hash(left) != canonical_request_hash(right)
