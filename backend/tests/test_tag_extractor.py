from services.tag_extractor import extract_object_tags, find_lexicon_phrases, normalize_keywords


def test_longest_match_suppresses_shorter_overlap():
    tags = extract_object_tags(description="The robotic arm on the space station")
    assert "robotic arm" in tags
    assert "space station" in tags
    assert "arm" not in tags
    assert "station" not in tags


def test_shorter_phrase_kept_when_separate():
    tags = extract_object_tags(description="A robotic arm and a spare arm")
    assert "robotic arm" in tags
    assert "arm" in tags


def test_lexicon_phrases_exclude_visual_only_appearance_tags():
    tags = extract_object_tags(description="A man with a green shirt near a rover")
    assert "rover" in tags
    # Appearance tags are curated visually; caption mentions alone must not tag the image.
    assert "man" not in tags
    assert "green shirt" not in tags
    assert "unknown-object" not in tags


def test_visual_annotations_add_appearance_tags():
    from services.tag_extractor import classify_source

    tags = classify_source(
        title="KSC-2010-1278",
        description="Mission Specialist Robert Behnken greets those on hand for his arrival.",
        nasa_id="KSC-2010-1278",
    )
    assert "blue shirt" in tags
    assert "smile" in tags
    assert "man" in tags


def test_normalize_keywords_splits_and_lowercases():
    assert normalize_keywords(["Engine, SSME, First", "Mars"]) == [
        "engine",
        "ssme",
        "first",
        "mars",
    ]


def test_find_lexicon_phrases_in_query():
    assert find_lexicon_phrases("images of mars rover") == ["mars", "rover"]


def test_novel_tag_candidates_skip_known_lexicon(tmp_path, monkeypatch):
    from services import tag_extractor

    dynamic = tmp_path / "dynamic_object_tags.json"
    dynamic.write_text('{"phrases": []}\n', encoding="utf-8")
    monkeypatch.setattr(tag_extractor, "_DYNAMIC_PATH", dynamic)
    tag_extractor.load_dynamic_object_tags.cache_clear()
    tag_extractor.load_lexicon.cache_clear()

    candidates = tag_extractor.novel_tag_candidates(
        keywords=["rover", "visored-helmet", "ISS"],
        known_object_tags=["astronaut"],
    )
    assert "rover" not in candidates
    assert "visored-helmet" in candidates
    assert "iss" not in candidates  # already in lexicon
    tag_extractor.load_dynamic_object_tags.cache_clear()
    tag_extractor.load_lexicon.cache_clear()


def test_remember_object_tags_extends_dynamic_lexicon(tmp_path, monkeypatch):
    from services import tag_extractor

    dynamic = tmp_path / "dynamic_object_tags.json"
    dynamic.write_text('{"phrases": []}\n', encoding="utf-8")
    monkeypatch.setattr(tag_extractor, "_DYNAMIC_PATH", dynamic)
    tag_extractor.load_dynamic_object_tags.cache_clear()
    tag_extractor.load_lexicon.cache_clear()

    novel = tag_extractor.remember_object_tags(["helmet-cam", "rover"])
    assert "helmet-cam" in novel
    assert "rover" not in novel
    stored = tag_extractor.load_dynamic_object_tags()
    assert "helmet-cam" in stored
    tag_extractor.load_dynamic_object_tags.cache_clear()
    tag_extractor.load_lexicon.cache_clear()

