import requests
import hashlib

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json"
}

def test_deduplicate_news_articles_by_hash():
    """
    Test the news fetching API to ensure that duplicate news articles are identified
    and excluded based on the SHA-256 hash of the normalized title and source name,
    preventing duplicate entries in the database.
    """

    def normalize_text(text: str) -> str:
        return " ".join(text.lower().strip().split())

    # Step 1: Trigger a news fetch run to populate news articles - POST /api/feeder/refresh (assumed)
    refresh_response = requests.post(f"{BASE_URL}/api/feeder/refresh", headers=HEADERS, timeout=TIMEOUT)
    assert refresh_response.status_code == 200, f"Failed to refresh news feed: {refresh_response.text}"

    # Step 2: Fetch all news articles via GET /api/feeder/news
    news_response = requests.get(f"{BASE_URL}/api/feeder/news", headers=HEADERS, timeout=TIMEOUT)
    assert news_response.status_code == 200, f"Failed to fetch news articles: {news_response.text}"
    news_articles = news_response.json()
    assert isinstance(news_articles, list), "News articles response is not a list."

    # Step 3: Verify deduplication:
    hashes = set()
    for article in news_articles:
        title = article.get("title")
        source_name = article.get("source_name") or article.get("source") or ""
        assert title is not None, f"Article missing title: {article}"

        normalized_title = normalize_text(title)
        normalized_source = normalize_text(source_name)
        combined = normalized_title + "|" + normalized_source
        article_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()

        assert article_hash not in hashes, (
            f"Duplicate article detected with hash {article_hash} for title '{title}' and source '{source_name}'"
        )
        hashes.add(article_hash)


test_deduplicate_news_articles_by_hash()
