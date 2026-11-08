from services.search_score import score_source


def test_object_phrase_query_weights_object_tags():
    result = score_source(
        query="mars rover",
        title="Gale Crater",
        description="While far from the rover, this VIS image covers Gale Crater on Mars.",
        keywords=["mars", "2001 mars odyssey"],
        object_tags=["rover", "mars", "crater", "gale crater"],
    )
    assert "rover" in result.activated_object_tags
    assert "mars" in result.activated_object_tags
    assert result.confidence > 50
    assert "rover" in result.matched_object_tags


def test_green_shirt_returns_zero_without_visual_annotation():
    result = score_source(
        query="man with green shirt",
        title="Gale Crater",
        description="While far from the rover, this VIS image covers Gale Crater on Mars.",
        keywords=["mars"],
        object_tags=["rover", "mars"],
    )
    assert result.confidence == 0.0


def test_men_with_blue_shirt_matches_victor_glover_visual_tags():
    result = score_source(
        query="men with blue shirt",
        title="NASA Astronaut Victor Glover Views Artemis II Rocket Stage at NASA Michoud",
        description="NASA astronaut Victor Glover views the core stage of the SLS rocket.",
        keywords=["artemis", "victor glover"],
        object_tags=["astronaut", "blue shirt", "man", "men", "shirt", "core stage"],
    )
    assert "blue shirt" in result.activated_object_tags or "blue shirt" in result.matched_object_tags
    assert result.confidence > 0
    assert any(tag in result.matched_object_tags for tag in ("man", "men", "blue shirt", "shirt"))


def test_text_only_query_uses_keyword_and_text_weights():
    result = score_source(
        query="curiosity anniversary",
        title="Curiosity Rover's First Anniversary",
        description="A public event observing the first anniversary of the Curiosity rover.",
        keywords=["curiosity"],
        object_tags=["curiosity", "rover"],
    )
    assert result.confidence > 0
    assert "curiosity" in result.matched_keywords or "curiosity" in result.matched_terms
