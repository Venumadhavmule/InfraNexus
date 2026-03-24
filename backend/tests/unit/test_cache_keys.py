from app.services.cache_service import CacheService


class TestCacheKeys:
    def test_neighborhood_key_format(self) -> None:
        key = CacheService._neighborhood_key("a" * 32, 2, "abc123")
        assert key == f"nb:{'a' * 32}:2:abc123"

    def test_ci_key_format(self) -> None:
        key = CacheService._ci_key("a" * 32)
        assert key == f"ci:{'a' * 32}"

    def test_search_key_format(self) -> None:
        key = CacheService._search_key("hash123")
        assert key == "search:hash123"

    def test_filter_hash_deterministic(self) -> None:
        h1 = CacheService.hash_filters(classes=["Server"], envs=["Production"])
        h2 = CacheService.hash_filters(classes=["Server"], envs=["Production"])
        assert h1 == h2

    def test_filter_hash_order_independent(self) -> None:
        h1 = CacheService.hash_filters(envs=["Production"], classes=["Server"])
        h2 = CacheService.hash_filters(classes=["Server"], envs=["Production"])
        assert h1 == h2

    def test_filter_hash_different_values(self) -> None:
        h1 = CacheService.hash_filters(classes=["Server"])
        h2 = CacheService.hash_filters(classes=["Database"])
        assert h1 != h2

    def test_filter_hash_none_ignored(self) -> None:
        h1 = CacheService.hash_filters(classes=["Server"], envs=None)
        h2 = CacheService.hash_filters(classes=["Server"])
        assert h1 == h2
